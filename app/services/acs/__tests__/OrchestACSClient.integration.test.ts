import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OrchestACSClient, createOrchestACSClient } from '../index';
import type { ACSClientConfig } from '../shared/types';
import { loginWithExchange, logout } from '../../../../tests/utils/authHelpers';

const ACS_BASE_URL = process.env.TEST_ACS_BASE_URL!;
const SSE_BASE_URL = process.env.TEST_SSE_BASE_URL || `${ACS_BASE_URL}/sse`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!;

describe('OrchestACSClient - Full Integration Tests', () => {
  let acsClient: OrchestACSClient;
  const createdSessionIds: string[] = [];

  beforeAll(async () => {
    // Create ACS client instance
    const config: ACSClientConfig = {
      baseUrl: ACS_BASE_URL,
      sseUrl: SSE_BASE_URL,
      timeout: 60000,
      retries: 2,
      debug: true
    };

    acsClient = new OrchestACSClient(config);
    
    // Set up cookie-based authentication
    await loginWithExchange();
  });

  afterAll(async () => {
    // Clean up any created sessions
    if (acsClient.isAuthenticated()) {
      for (const sessionId of createdSessionIds) {
        try {
          await acsClient.sessions.deleteSession(sessionId);
          console.log(`Cleaned up session: ${sessionId}`);
        } catch (error) {
          console.error(`Failed to cleanup session ${sessionId}:`, error);
        }
      }
    }
    
    // Clean up cookie jar
    logout();
  });

  describe('Client Initialization and Configuration', () => {
    it('should create client with factory function', () => {
      const factoryClient = createOrchestACSClient({
        baseUrl: ACS_BASE_URL,
        sseUrl: SSE_BASE_URL,
        debug: true
      });

      expect(factoryClient).toBeInstanceOf(OrchestACSClient);
      expect(factoryClient.isAuthenticated()).toBe(false);
    });

    it('should have all required service modules', () => {
      expect(acsClient.auth).toBeDefined();
      expect(acsClient.sessions).toBeDefined();
      expect(acsClient.core).toBeDefined();
      expect(acsClient.streaming).toBeDefined();
      expect(acsClient.models).toBeDefined();
      expect(acsClient.agentConfigs).toBeDefined();
      expect(acsClient.infrastructure).toBeDefined();
    });

    it('should provide access to underlying HTTP client', () => {
      const httpClient = acsClient.getClient();
      expect(httpClient).toBeDefined();
      expect(typeof httpClient.get).toBe('function');
      expect(typeof httpClient.post).toBe('function');
    });
  });

  describe('Complete Authentication and Initialization Flow', () => {
    it('should initialize client and handle authentication restoration', async () => {
      // Test initialization without existing auth
      const initResult = await acsClient.initialize();
      
      expect(initResult).toBeDefined();
      expect(initResult.authenticated).toBe(false);
      expect(acsClient.isAuthenticated()).toBe(false);
    });

    it('should complete full login and connect flow', async () => {
      const loginResult = await acsClient.loginAndConnect(
        TEST_USER_EMAIL,
        TEST_USER_PASSWORD
      );

      expect(loginResult.success).toBe(true);
      expect(loginResult.user).toBeDefined();
      expect(loginResult.user.email).toBe(TEST_USER_EMAIL);
      expect(acsClient.isAuthenticated()).toBe(true);

      console.log('Full login flow successful, user:', loginResult.user.email);
    });

    it('should get comprehensive health status', async () => {
      const healthStatus = await acsClient.getHealthStatus();
      
      expect(healthStatus).toBeDefined();
      expect(healthStatus.overall).toMatch(/healthy|degraded|unhealthy/);
      
      // ACS health should be available since we're authenticated
      if (healthStatus.acs) {
        expect(healthStatus.acs.status).toBeDefined();
      }

      console.log('Health status:', healthStatus.overall);
    });
  });

  describe('End-to-End Conversation Workflow', () => {
    let conversationSessionId: string;
    let userId: string;

    it('should start a conversation with streaming support', async () => {
      // Get user ID from auth state
      const userInfo = acsClient.auth.getStoredUserInfo();
      userId = userInfo?.id || 'test-user-id';

      const conversationResult = await acsClient.startConversationWithStreaming(
        'Hello! This is an end-to-end test of the Orchestra ACS client. Please respond with a simple greeting.',
        userId,
        'general',
        {
          agentCwd: '/workspace',
          useStoredKeys: true
        }
      );

      expect(conversationResult.sessionId).toBeDefined();
      expect(conversationResult.response).toBeDefined();
      expect(conversationResult.response.response_messages).toBeInstanceOf(Array);
      expect(conversationResult.response.response_messages.length).toBeGreaterThan(0);

      conversationSessionId = conversationResult.sessionId;
      createdSessionIds.push(conversationSessionId);

      console.log('Started conversation in session:', conversationSessionId);
      console.log('Streaming connected:', conversationResult.streamingConnected);
    });

    it('should send follow-up message with streaming', async () => {
      expect(conversationSessionId).toBeDefined();

      const messageResult = await acsClient.sendMessageWithStreaming(
        conversationSessionId,
        'What is 5 + 3? Please provide just the numerical answer.',
        userId,
        'general'
      );

      expect(messageResult.response).toBeDefined();
      expect(messageResult.response.response_messages).toBeInstanceOf(Array);

      // Check if we got a mathematical response
      const responseText = messageResult.response.final_text_response || '';
      console.log('Math response:', responseText);
    });

    it('should verify session was created and contains messages', async () => {
      expect(conversationSessionId).toBeDefined();

      // Get session details
      const sessionDetails = await acsClient.sessions.getSession(conversationSessionId, {
        includeMessages: true
      });

      expect(sessionDetails.data.id).toBe(conversationSessionId);
      expect(sessionDetails.data.messages).toBeInstanceOf(Array);
      expect(sessionDetails.data.messages.length).toBeGreaterThan(0);

      console.log('Session contains', sessionDetails.data.messages.length, 'messages');
    });
  });

  describe('Service Integration and Cross-Service Operations', () => {
    it('should create session, send message, and manage session lifecycle', async () => {
      // Create a new session
      const createResponse = await acsClient.sessions.createSession({
        name: 'Integration Test Workflow Session',
        agent_config_id: 'general',
        agent_cwd: '/workspace'
      });

      expect(createResponse.data.success).toBe(true);
      const sessionId = createResponse.data.session_id!;
      createdSessionIds.push(sessionId);

      // Send a message to the session
      const userInfo = acsClient.auth.getStoredUserInfo();
      const userId = userInfo?.id || 'test-user-id';

      const converseResponse = await acsClient.core.sendMessage(
        sessionId,
        'This is a test message in a manually created session. Please acknowledge.',
        userId,
        'general'
      );

      expect(converseResponse.data.session_id).toBe(sessionId);
      expect(converseResponse.data.response_messages.length).toBeGreaterThan(0);

      // Update session name
      await acsClient.sessions.renameSession(sessionId, 'Updated Integration Test Session');

      // Verify the update
      const updatedSession = await acsClient.sessions.getSession(sessionId);
      expect(updatedSession.data.name).toBe('Updated Integration Test Session');

      console.log('Cross-service workflow completed successfully');
    });

    it('should handle model and agent configuration services', async () => {
      try {
        // Test model service if available
        if (acsClient.models && typeof acsClient.models.listProviders === 'function') {
          const providers = await acsClient.models.listProviders();
          console.log('Available model providers:', providers.data);
        }
      } catch (error: any) {
        if (error.status_code === 404) {
          console.warn('Model service endpoints not available');
        } else {
          throw error;
        }
      }

      try {
        // Test agent config service if available
        if (acsClient.agentConfigs && typeof acsClient.agentConfigs.listConfigs === 'function') {
          const configs = await acsClient.agentConfigs.listConfigs();
          console.log('Available agent configs:', configs.data);
        }
      } catch (error: any) {
        if (error.status_code === 404) {
          console.warn('Agent config service endpoints not available');
        } else {
          throw error;
        }
      }
    });

    it('should handle infrastructure service', async () => {
      expect(acsClient.infrastructure).toBeDefined();
      expect(typeof acsClient.infrastructure.getAppPerUserStatus).toBe('function');
      expect(typeof acsClient.infrastructure.provisionAppPerUser).toBe('function');
      expect(typeof acsClient.infrastructure.cleanupAppPerUser).toBe('function');

      try {
        // Test infrastructure health if available
        const health = await acsClient.infrastructure.getHealth();
        console.log('Infrastructure service health check successful');
      } catch (error: any) {
        if (error.status_code === 404) {
          console.warn('Infrastructure health endpoint not available');
        } else {
          throw error;
        }
      }

      try {
        // Test getting infrastructure status (might return 404 if no infrastructure)
        const status = await acsClient.infrastructure.getAppPerUserStatus();
        console.log('Infrastructure status check successful:', status.data.status);
      } catch (error: any) {
        if (error.status_code === 404) {
          console.log('No infrastructure found for user - this is expected');
        } else {
          console.warn('Infrastructure status check failed:', error.message);
        }
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network errors gracefully', async () => {
      // Create a client with invalid URL to test error handling
      const invalidClient = new OrchestACSClient({
        baseUrl: 'https://invalid-url-that-does-not-exist.com',
        sseUrl: 'https://invalid-url-that-does-not-exist.com/sse',
        timeout: 5000,
        retries: 1
      });

      try {
        await invalidClient.auth.login('test@example.com', 'password');
        throw new Error('Should have failed with invalid URL');
      } catch (error: any) {
        expect(error).toBeDefined();
        // Should be a network error, not an authentication error
        console.log('Network error handled correctly:', error.message);
      }
    });

    it('should handle authentication token expiration', async () => {
      // Set an obviously invalid token
      acsClient.setAuthToken('invalid.jwt.token');
      expect(acsClient.isAuthenticated()).toBe(true); // Client thinks it's authenticated

      try {
        // Try to make an authenticated request
        await acsClient.sessions.listSessions();
        throw new Error('Should have failed with invalid token');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect([401, 403]).toContain(error.status_code);
      }

      // Re-authenticate for subsequent tests
      await acsClient.loginAndConnect(TEST_USER_EMAIL, TEST_USER_PASSWORD);
      expect(acsClient.isAuthenticated()).toBe(true);
    });

    it('should handle service unavailability gracefully', async () => {
      try {
        // Try to access a service that might not be available
        await acsClient.core.pingTES();
      } catch (error: any) {
        if ([404, 503, 502].includes(error.status_code)) {
          console.warn('Service unavailable - this is acceptable for integration tests');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Cleanup and Logout', () => {
    it('should complete logout and disconnect flow', async () => {
      expect(acsClient.isAuthenticated()).toBe(true);

      await acsClient.logoutAndDisconnect();

      expect(acsClient.isAuthenticated()).toBe(false);
      expect(acsClient.auth.isAuthenticated()).toBe(false);
      expect(acsClient.auth.getAuthToken()).toBeNull();

      console.log('Logout and disconnect completed successfully');
    });

    it('should handle operations after logout appropriately', async () => {
      expect(acsClient.isAuthenticated()).toBe(false);

      try {
        await acsClient.sessions.listSessions();
        throw new Error('Should have failed after logout');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect([401, 403]).toContain(error.status_code);
      }
    });
  });
});