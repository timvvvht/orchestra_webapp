import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { OrchestACSClient } from '../../index';
import type { 
  UserLogin, 
  ACSClientConfig, 
  CreateSessionRequest, 
  UpdateSessionRequest, 
  SessionDetails 
} from '../../shared/types';
import { loginWithExchange, logout } from '../../../../../tests/utils/authHelpers';

const ACS_BASE_URL = process.env.TEST_ACS_BASE_URL!;
const SSE_BASE_URL = process.env.TEST_SSE_BASE_URL || `${ACS_BASE_URL}/sse`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!;

console.log('Integration tests: Loaded .env.test');
console.log('ACS_BASE_URL:', ACS_BASE_URL);
console.log('TEST_USER_EMAIL:', TEST_USER_EMAIL);

describe('ACSSessionService - Integration Tests', () => {
  let acsClient: OrchestACSClient;
  const createdSessionIdsForCleanup: string[] = [];

  beforeAll(async () => {
    // Create and authenticate ACS client
    const config: ACSClientConfig = {
      baseUrl: ACS_BASE_URL,
      sseUrl: SSE_BASE_URL,
      timeout: 30000,
      retries: 2,
      debug: true
    };

    acsClient = new OrchestACSClient(config);

    // Set up cookie-based authentication
    await loginWithExchange();

    // Login to authenticate for session operations
    try {
      await acsClient.auth.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
      
      if (!acsClient.isAuthenticated()) {
        throw new Error('Authentication failed - cannot proceed with session tests');
      }
      
      console.log('Session tests: Successfully authenticated');
    } catch (error) {
      console.error('Session tests: Authentication failed', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up all sessions created during tests
    if (acsClient.isAuthenticated()) {
      console.log(`Cleaning up ${createdSessionIdsForCleanup.length} test sessions...`);
      
      for (const sessionId of createdSessionIdsForCleanup) {
        try {
          await acsClient.sessions.deleteSession(sessionId);
          console.log(`Cleaned up session: ${sessionId}`);
        } catch (cleanupError) {
          console.error(`Failed to cleanup session ${sessionId}:`, cleanupError);
        }
      }
    }
    
    // Clean up cookie jar
    logout();
  });

  beforeEach(() => {
    // Ensure we're still authenticated before each test
    if (!acsClient.isAuthenticated()) {
      throw new Error('Lost authentication during session tests');
    }
  });

  describe('Session CRUD Operations', () => {
    let testSession: SessionDetails | null = null;
    const baseSessionName = `Integration Test Session ${Date.now()}`;

    it('should create a new session successfully', async () => {
      const sessionPayload: CreateSessionRequest = { 
        name: baseSessionName,
        agent_config_id: 'general', // Use general agent config
        agent_cwd: '/workspace'
      };

      const response = await acsClient.sessions.createSession(sessionPayload);

      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.id).toBeDefined();

      const sessionId = response.data.data.id!;
      createdSessionIdsForCleanup.push(sessionId);

      // Fetch the created session to verify details
      const sessionDetails = await acsClient.sessions.getSession(sessionId, { 
        includeMessages: false 
      });
      
      testSession = sessionDetails.data;
      expect(testSession).toBeDefined();
      expect(testSession!.id).toBe(sessionId);
      expect(testSession!.name).toBe(baseSessionName);
      expect(testSession!.agent_cwd).toBe('/workspace');
    });

    it('should list sessions and find the created session', async () => {
      expect(testSession).toBeDefined();

      const listResponse = await acsClient.sessions.listSessions({ 
        limit: 50,
        includeMessageCount: true 
      });

      expect(listResponse.data).toBeDefined();
      expect(listResponse.data.sessions).toBeInstanceOf(Array);
      expect(listResponse.data.sessions.length).toBeGreaterThan(0);

      const foundSession = listResponse.data.sessions.find(s => s.id === testSession!.id);
      expect(foundSession).toBeDefined();
      expect(foundSession!.name).toBe(baseSessionName);
    });

    it('should get session details with messages', async () => {
      expect(testSession).toBeDefined();

      const sessionWithMessages = await acsClient.sessions.getSession(testSession!.id, {
        includeMessages: true
      });

      expect(sessionWithMessages.data).toBeDefined();
      expect(sessionWithMessages.data.id).toBe(testSession!.id);
      expect(sessionWithMessages.data.messages).toBeDefined();
      expect(sessionWithMessages.data.messages).toBeInstanceOf(Array);
      // New session should have no messages initially
      expect(sessionWithMessages.data.messages.length).toBe(0);
    });

    it('should update the created session successfully', async () => {
      expect(testSession).toBeDefined();
      
      const updatedName = `${baseSessionName} - Updated`;
      const updatePayload: UpdateSessionRequest = { 
        name: updatedName,
        agent_config_id: 'general'
      };

      const response = await acsClient.sessions.updateSession(testSession!.id, updatePayload);
      expect(response.data.success).toBe(true);

      // Fetch updated session to verify changes
      const updatedSession = await acsClient.sessions.getSession(testSession!.id, { 
        includeMessages: false 
      });
      
      expect(updatedSession.data.name).toBe(updatedName);
      testSession = updatedSession.data; // Update for subsequent tests
    });

    it('should rename session using convenience method', async () => {
      expect(testSession).toBeDefined();
      
      const newName = `${baseSessionName} - Renamed`;
      const response = await acsClient.sessions.renameSession(testSession!.id, newName);
      
      expect(response.data.success).toBe(true);

      // Verify the rename
      const renamedSession = await acsClient.sessions.getSession(testSession!.id);
      expect(renamedSession.data.name).toBe(newName);
      testSession = renamedSession.data;
    });

    it('should duplicate the session', async () => {
      expect(testSession).toBeDefined();
      
      const duplicateName = `${testSession!.name} - Copy`;
      const response = await acsClient.sessions.duplicateSession(testSession!.id, duplicateName);
      
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.id).toBeDefined();
      
      const duplicateSessionId = response.data.data.id!;
      createdSessionIdsForCleanup.push(duplicateSessionId);

      // Verify the duplicate exists
      const duplicateSession = await acsClient.sessions.getSession(duplicateSessionId);
      expect(duplicateSession.data.name).toBe(duplicateName);
      expect(duplicateSession.data.id).not.toBe(testSession!.id);
    });

    it('should delete the created session successfully', async () => {
      expect(testSession).toBeDefined();
      const sessionIdToDelete = testSession!.id;

      const response = await acsClient.sessions.deleteSession(sessionIdToDelete);
      expect(response.data.success).toBe(true);

      // Verify session is deleted by trying to get it
      try {
        await acsClient.sessions.getSession(sessionIdToDelete);
        throw new Error('Session should have been deleted but was still found');
      } catch (error: any) {
        // Expecting a 404 or similar error
        expect(error).toBeDefined();
        expect([404, 400]).toContain(error.status_code);
      }

      // Remove from cleanup array since it's already deleted
      const index = createdSessionIdsForCleanup.indexOf(sessionIdToDelete);
      if (index > -1) {
        createdSessionIdsForCleanup.splice(index, 1);
      }
      testSession = null;
    });
  });

  describe('Session Management Features', () => {
    it('should create a default session with convenience method', async () => {
      const defaultName = 'Default Test Session';
      const response = await acsClient.sessions.createDefaultSession(defaultName, 'general');
      
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.id).toBeDefined();
      
      const sessionId = response.data.data.id!;
      createdSessionIdsForCleanup.push(sessionId);

      // Verify default session properties
      const session = await acsClient.sessions.getSession(sessionId);
      expect(session.data.name).toBe(defaultName);
      expect(session.data.agent_cwd).toBe('/workspace');
    });

    it('should search sessions by name', async () => {
      // Create a session with a unique searchable name
      const searchableName = `Searchable Session ${Date.now()}`;
      const createResponse = await acsClient.sessions.createSession({ name: searchableName });
      const sessionId = createResponse.data.data.id!;
      createdSessionIdsForCleanup.push(sessionId);

      try {
        // Search for the session
        const searchResponse = await acsClient.sessions.searchSessions('Searchable');
        
        expect(searchResponse.data.sessions).toBeInstanceOf(Array);
        const foundSession = searchResponse.data.sessions.find(s => s.name === searchableName);
        expect(foundSession).toBeDefined();
      } catch (error: any) {
        // Search might not be implemented on the server
        if (error.status_code === 404 || error.status_code === 501) {
          console.warn('Session search not implemented on server - this is acceptable');
        } else {
          throw error;
        }
      }
    });

    it('should get paginated sessions', async () => {
      const response = await acsClient.sessions.getSessionsPaginated(1, 10);
      
      expect(response.data).toBeDefined();
      expect(response.data.sessions).toBeInstanceOf(Array);
      expect(response.data.limit).toBe(10);
      expect(response.data.total).toBeGreaterThanOrEqual(0);
    });

    it('should change session agent configuration', async () => {
      // Create a test session
      const createResponse = await acsClient.sessions.createSession({ 
        name: 'Agent Config Test Session',
        agent_config_id: 'general'
      });
      const sessionId = createResponse.data.data.id!;
      createdSessionIdsForCleanup.push(sessionId);

      // Change agent configuration
      const newAgentConfig = 'coding_agent'; // Assuming this exists
      const updateResponse = await acsClient.sessions.changeSessionAgent(sessionId, newAgentConfig);
      
      expect(updateResponse.data.success).toBe(true);

      // Verify the change
      const updatedSession = await acsClient.sessions.getSession(sessionId);
      expect(updatedSession.data.agent_config_id).toBe(newAgentConfig);
    });
  });

  describe('Session Utilities', () => {
    it('should validate session names correctly', async () => {
      // Test SessionUtils if available
      const SessionUtils = (acsClient.sessions.constructor as any).SessionUtils;
      
      if (SessionUtils && SessionUtils.validateSessionName) {
        const validName = SessionUtils.validateSessionName('Valid Session Name');
        const emptyName = SessionUtils.validateSessionName('');
        const longName = SessionUtils.validateSessionName('x'.repeat(101));
        
        expect(validName.valid).toBe(true);
        expect(emptyName.valid).toBe(false);
        expect(longName.valid).toBe(false);
      }
    });

    it('should generate default session names', async () => {
      const SessionUtils = (acsClient.sessions.constructor as any).SessionUtils;
      
      if (SessionUtils && SessionUtils.generateDefaultName) {
        const defaultName = SessionUtils.generateDefaultName();
        expect(defaultName).toBeTruthy();
        expect(defaultName).toContain('Chat');
      }
    });

    it('should format session dates correctly', async () => {
      const SessionUtils = (acsClient.sessions.constructor as any).SessionUtils;
      
      if (SessionUtils && SessionUtils.formatCreatedAt) {
        const formatted = SessionUtils.formatCreatedAt(new Date().toISOString());
        expect(formatted).toBeTruthy();
        expect(typeof formatted).toBe('string');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent session gracefully', async () => {
      const nonExistentId = 'non-existent-session-id';
      
      try {
        await acsClient.sessions.getSession(nonExistentId);
        throw new Error('Should have failed for non-existent session');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect([404, 400]).toContain(error.status_code);
      }
    });

    it('should handle invalid session updates', async () => {
      // Create a valid session first
      const createResponse = await acsClient.sessions.createSession({ name: 'Test Session' });
      const sessionId = createResponse.data.data.id!;
      createdSessionIdsForCleanup.push(sessionId);

      try {
        // Try to update with invalid data (empty name)
        await acsClient.sessions.updateSession(sessionId, { name: '' });
        // If this doesn't fail, the server might accept empty names
        console.warn('Server accepts empty session names');
      } catch (error: any) {
        // This is expected behavior
        expect(error).toBeDefined();
        expect([400, 422]).toContain(error.status_code);
      }
    });
  });
});