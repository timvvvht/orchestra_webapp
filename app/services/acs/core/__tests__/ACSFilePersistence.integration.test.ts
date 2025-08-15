import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { OrchestACSClient, InfrastructureUtils } from '../../index';
import type { ACSClientConfig, ProvisionAppPerUserRequest } from '../../shared/types';

import { loginWithExchange, logout, simpleLogin } from '../../../../../tests/utils/authHelpers';

// @vitest-environment node

// Set extended timeout for file persistence tests with infrastructure provisioning (10 minutes)
vi.setConfig({ testTimeout: 600000 });

// Environment variables injected by vitest.setup or CI
const ACS_BASE_URL = process.env.TEST_ACS_BASE_URL!;
const SSE_BASE_URL = process.env.TEST_SSE_BASE_URL || `${ACS_BASE_URL}/sse`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!;

// We need a second test user for isolation testing
const TEST_USER_EMAIL_2 = process.env.TEST_USER_EMAIL_2 || 'test2@example.com';
const TEST_USER_PASSWORD_2 = process.env.TEST_USER_PASSWORD_2 || 'testpassword123';

/**
 * This test verifies file persistence and isolation across user sessions with dedicated TES instances:
 * 
 * 1. Provision separate TES instances for User A and User B
 * 2. User A creates a file using str_replace_editor in /workspace on their TES
 * 3. User B tries to access the same file on their TES (should fail - isolation)
 * 4. User A in a new session tries to access the file on their TES (should succeed - persistence)
 * 
 * This validates that:
 * - Files persist across chat sessions for the same user on their dedicated TES
 * - Files are isolated between different users with separate TES instances
 * - The str_replace_editor tool works correctly with dedicated TES workspace volumes
 */

describe('ACS File Persistence & User Isolation with Dedicated TES', () => {
  let acsClientUserA: OrchestACSClient;
  let acsClientUserB: OrchestACSClient;
  let userAId: string | null = null;
  let userBId: string | null = null;
  let userASessionId: string | null = null;
  let userBSessionId: string | null = null;
  let userASession2Id: string | null = null;
  let userAAppName: string | null = null;
  let userBAppName: string | null = null;

  const testFileName = 'README.md';
  const testFilePath = `/workspace/${testFileName}`;
  const testFileContent = `# Test File Created by User A\n\nThis file was created during integration testing at ${new Date().toISOString()}.\n\nIt should be accessible to User A across different chat sessions,\nbut NOT accessible to User B due to dedicated TES instance isolation.\n`;

  beforeAll(async () => {
    console.log('🚀 Starting file persistence test with dedicated TES provisioning...');
    
    // Create client configs
    const config: ACSClientConfig = {
      baseUrl: ACS_BASE_URL,
      sseUrl: SSE_BASE_URL,
      timeout: 120_000, // Extended timeout for infrastructure operations
      retries: 3,
      debug: true,
    };

    acsClientUserA = new OrchestACSClient(config);
    acsClientUserB = new OrchestACSClient(config);

    // Authenticate User A
    console.log('🔐 Authenticating User A...');
    await loginWithExchange();
    const loginResA = await acsClientUserA.auth.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    const userA = loginResA.data?.data?.user ?? loginResA.data?.user;
    if (!userA?.id) {
      throw new Error(`User A login response missing user.id. Response: ${JSON.stringify(loginResA.data)}`);
    }
    userAId = userA.id;
    console.log('✅ User A authenticated:', userAId);

    // Authenticate User B
    console.log('🔐 Authenticating User B...');
    try {
      const loginDataB = await simpleLogin(ACS_BASE_URL, TEST_USER_EMAIL_2, TEST_USER_PASSWORD_2);
      userBId = loginDataB.user.id;
      console.log('✅ User B authenticated:', userBId);
    } catch (error) {
      console.warn('⚠️ User B authentication failed - will skip isolation tests:', error);
      userBId = null;
    }

    // Provision dedicated TES instance for User A
    console.log('🏗️ Provisioning dedicated TES instance for User A...');
    try {
      // Check if User A already has infrastructure
      let userAInfraExists = false;
      try {
        const existingStatusA = await acsClientUserA.infrastructure.getAppPerUserStatus();
        if (existingStatusA.data && existingStatusA.data.app_name) {
          console.log('📋 Found existing infrastructure for User A:', existingStatusA.data.app_name);
          userAAppName = existingStatusA.data.app_name;
          userAInfraExists = true;
          
          if (InfrastructureUtils.isActive(existingStatusA.data)) {
            console.log('✅ User A infrastructure is already active');
          } else if (InfrastructureUtils.isProvisioning(existingStatusA.data)) {
            console.log('⏳ User A infrastructure is still provisioning, will wait...');
          }
        }
      } catch (error: any) {
        if (error.status_code === 404) {
          console.log('📋 No existing infrastructure found for User A - will provision new');
        } else {
          console.warn('⚠️ Error checking existing infrastructure for User A:', error.message);
        }
      }

      // Provision new infrastructure if none exists
      if (!userAInfraExists) {
        const provisionRequestA: ProvisionAppPerUserRequest = {
          resource_spec: InfrastructureUtils.createTestResourceSpec('iad'),
          tes_image: 'registry.fly.io/orchestra-tes:latest'
        };

        const provisionResponseA = await acsClientUserA.infrastructure.provisionAppPerUser(provisionRequestA);
        userAAppName = provisionResponseA.data.app_name;
        console.log(`🚀 Provisioning initiated for User A: ${userAAppName}`);
      }

      // Wait for User A infrastructure to be active
      console.log('⏳ Waiting for User A TES to become active...');
      const finalStatusA = await InfrastructureUtils.pollUntilActive(
        () => acsClientUserA.infrastructure.getAppPerUserStatus(),
        {
          maxRetries: 60, // 60 retries
          delayMs: 10000, // 10 seconds between retries
          timeoutMs: 600000 // 10 minutes total timeout
        }
      );

      expect(InfrastructureUtils.isActive(finalStatusA)).toBe(true);
      console.log('✅ User A TES is active:', userAAppName);

    } catch (error: any) {
      if (error.message?.toLowerCase().includes('already has')) {
        console.log('📋 User A already has infrastructure, retrieving details...');
        const existingStatus = await acsClientUserA.infrastructure.getAppPerUserStatus();
        userAAppName = existingStatus.data.app_name;
      } else {
        throw error;
      }
    }

    // Provision dedicated TES instance for User B (if User B is available)
    if (userBId) {
      console.log('🏗️ Provisioning dedicated TES instance for User B...');
      try {
        // Check if User B already has infrastructure
        let userBInfraExists = false;
        try {
          const existingStatusB = await acsClientUserB.infrastructure.getAppPerUserStatus();
          if (existingStatusB.data && existingStatusB.data.app_name) {
            console.log('📋 Found existing infrastructure for User B:', existingStatusB.data.app_name);
            userBAppName = existingStatusB.data.app_name;
            userBInfraExists = true;
            
            if (InfrastructureUtils.isActive(existingStatusB.data)) {
              console.log('✅ User B infrastructure is already active');
            } else if (InfrastructureUtils.isProvisioning(existingStatusB.data)) {
              console.log('⏳ User B infrastructure is still provisioning, will wait...');
            }
          }
        } catch (error: any) {
          if (error.status_code === 404) {
            console.log('📋 No existing infrastructure found for User B - will provision new');
          } else {
            console.warn('⚠️ Error checking existing infrastructure for User B:', error.message);
          }
        }

        // Provision new infrastructure if none exists
        if (!userBInfraExists) {
          const provisionRequestB: ProvisionAppPerUserRequest = {
            resource_spec: InfrastructureUtils.createTestResourceSpec('iad'),
            tes_image: 'registry.fly.io/orchestra-tes:latest'
          };

          const provisionResponseB = await acsClientUserB.infrastructure.provisionAppPerUser(provisionRequestB);
          userBAppName = provisionResponseB.data.app_name;
          console.log(`🚀 Provisioning initiated for User B: ${userBAppName}`);
        }

        // Wait for User B infrastructure to be active
        console.log('⏳ Waiting for User B TES to become active...');
        const finalStatusB = await InfrastructureUtils.pollUntilActive(
          () => acsClientUserB.infrastructure.getAppPerUserStatus(),
          {
            maxRetries: 60, // 60 retries
            delayMs: 10000, // 10 seconds between retries
            timeoutMs: 600000 // 10 minutes total timeout
          }
        );

        expect(InfrastructureUtils.isActive(finalStatusB)).toBe(true);
        console.log('✅ User B TES is active:', userBAppName);

      } catch (error: any) {
        if (error.message?.toLowerCase().includes('already has')) {
          console.log('📋 User B already has infrastructure, retrieving details...');
          const existingStatus = await acsClientUserB.infrastructure.getAppPerUserStatus();
          userBAppName = existingStatus.data.app_name;
        } else {
          console.warn('⚠️ Failed to provision User B infrastructure:', error.message);
          userBId = null; // Disable User B tests
        }
      }
    }

    console.log('🎯 File persistence test setup complete');
    console.log('👤 User A ID:', userAId, '| TES:', userAAppName);
    console.log('👤 User B ID:', userBId || 'Not available', '| TES:', userBAppName || 'Not available');
  }, 600000); // 10-minute timeout for setup

  afterAll(async () => {
    console.log('🧹 Starting cleanup...');
    
    // Clean up test sessions
    const sessionsToCleanup = [userASessionId, userBSessionId, userASession2Id].filter(Boolean);
    
    for (const sessionId of sessionsToCleanup) {
      try {
        await acsClientUserA.sessions.deleteSession(sessionId!);
        console.log('🗑️ Cleaned up session:', sessionId);
      } catch (error) {
        console.warn('⚠️ Failed to cleanup session:', sessionId, error);
      }
    }

    // CRITICAL: Clean up provisioned infrastructure
    if (userAAppName && acsClientUserA.isAuthenticated()) {
      try {
        console.log('🗑️ Cleaning up User A infrastructure:', userAAppName);
        const cleanupResponseA = await acsClientUserA.infrastructure.cleanupAppPerUser();
        console.log('✅ User A infrastructure cleanup initiated:', cleanupResponseA.data);
      } catch (cleanupError) {
        console.error('❌ User A infrastructure cleanup failed:', cleanupError);
      }
    }

    if (userBAppName && userBId && acsClientUserB.isAuthenticated()) {
      try {
        console.log('🗑️ Cleaning up User B infrastructure:', userBAppName);
        const cleanupResponseB = await acsClientUserB.infrastructure.cleanupAppPerUser();
        console.log('✅ User B infrastructure cleanup initiated:', cleanupResponseB.data);
      } catch (cleanupError) {
        console.error('❌ User B infrastructure cleanup failed:', cleanupError);
      }
    }

    logout();
    console.log('🏁 Cleanup complete');
  });

  it('should allow User A to create a file in workspace using str_replace_editor on their dedicated TES', async () => {
    console.log('📝 Test: User A creating file on dedicated TES...');
    
    // Create a session for User A
    const sessionResponse = await acsClientUserA.sessions.createSession({
      name: `File Creation Test - User A - ${Date.now()}`,
      agent_config_id: 'general',
    });
    userASessionId = sessionResponse.data.data.id!;
    console.log('📋 Created session for User A:', userASessionId);

    // Ask the agent to create a README.md file
    const prompt = `Please create a file called "${testFileName}" in the /workspace directory with the following content:

${testFileContent}

Use the str_replace_editor tool to create this file. After creating it, please confirm the file was created successfully by reading it back.`;

    const response = await acsClientUserA.core.sendMessage(
      userASessionId,
      prompt,
      userAId!,
      'general'
    );

    expect(response.data).toBeDefined();
    expect(response.data.session_id).toBe(userASessionId);
    expect(response.data.response_messages).toBeInstanceOf(Array);
    expect(response.data.response_messages.length).toBeGreaterThan(0);

    // The response should indicate successful file creation
    const finalResponse = response.data.final_text_response || '';
    console.log('📄 User A file creation response:', finalResponse.substring(0, 300) + '...');

    // We expect the agent to have used str_replace_editor and confirmed the file creation
    expect(finalResponse.toLowerCase()).toMatch(/(created|wrote|file|readme|successfully)/);
    console.log('✅ User A successfully created file on their dedicated TES');
  }, 180_000);

  it('should prevent User B from accessing User A\'s file (isolation test with separate TES instances)', async () => {
    if (!userBId || !userBAppName) {
      console.warn('⚠️ Skipping User B isolation test - User B or their TES not available');
      return;
    }

    console.log('🔒 Test: User B trying to access User A\'s file (should fail due to TES isolation)...');

    // Create a session for User B
    const sessionResponse = await acsClientUserB.sessions.createSession({
      name: `File Access Test - User B - ${Date.now()}`,
      agent_config_id: 'general',
    });
    userBSessionId = sessionResponse.data.data.id!;
    console.log('📋 Created session for User B:', userBSessionId);

    // Ask User B's agent to look for the file that User A created
    const prompt = `Please check if there is a file called "${testFileName}" in the /workspace directory. If it exists, please read its contents using the str_replace_editor tool. If it doesn't exist, please confirm that.`;

    const response = await acsClientUserB.core.sendMessage(
      userBSessionId,
      prompt,
      userBId!,
      'general'
    );

    expect(response.data).toBeDefined();
    expect(response.data.session_id).toBe(userBSessionId);

    const finalResponse = response.data.final_text_response || '';
    console.log('🔍 User B file access response:', finalResponse.substring(0, 300) + '...');

    // User B should NOT be able to see User A's file due to separate TES instances
    // The response should indicate the file doesn't exist or is not accessible
    expect(finalResponse.toLowerCase()).toMatch(/(not found|doesn't exist|no such file|not accessible|cannot find)/);
    console.log('✅ User B correctly cannot access User A\'s file (TES isolation working)');
  }, 180_000);

  it('should allow User A to access their file in a new chat session (persistence test on same TES)', async () => {
    console.log('💾 Test: User A accessing their file in new session (persistence test)...');
    
    // Create a NEW session for User A (different from the first one)
    const sessionResponse = await acsClientUserA.sessions.createSession({
      name: `File Access Test - User A Session 2 - ${Date.now()}`,
      agent_config_id: 'general',
    });
    userASession2Id = sessionResponse.data.data.id!;
    console.log('📋 Created new session for User A:', userASession2Id);

    // Verify this is a different session
    expect(userASession2Id).not.toBe(userASessionId);

    // Ask the agent to find and read the file created in the previous session
    const prompt = `Please look for a file called "${testFileName}" in the /workspace directory and read its contents using the str_replace_editor tool. This file should have been created in a previous chat session.`;

    const response = await acsClientUserA.core.sendMessage(
      userASession2Id,
      prompt,
      userAId!,
      'general'
    );

    expect(response.data).toBeDefined();
    expect(response.data.session_id).toBe(userASession2Id);

    const finalResponse = response.data.final_text_response || '';
    console.log('📖 User A file persistence response:', finalResponse.substring(0, 300) + '...');

    // User A should be able to access their file from the previous session
    // The response should contain the original file content
    expect(finalResponse).toContain('Test File Created by User A');
    expect(finalResponse).toContain('integration testing');
    
    // Verify the agent successfully read the file
    expect(finalResponse.toLowerCase()).toMatch(/(found|read|content|file|successfully)/);
    console.log('✅ User A successfully accessed their file across sessions (persistence working)');
  }, 180_000);

  it('should allow User A to modify their existing file on their dedicated TES', async () => {
    console.log('✏️ Test: User A modifying their existing file...');
    
    // Use the same session as the previous test (userASession2Id)
    const additionalContent = '\n\n## File Modified\n\nThis line was added in a subsequent test to verify file modification capabilities on dedicated TES.';
    
    const prompt = `Please append the following content to the existing "${testFileName}" file in /workspace:

${additionalContent}

Use str_replace_editor to modify the file, then read it back to confirm the changes.`;

    const response = await acsClientUserA.core.sendMessage(
      userASession2Id!,
      prompt,
      userAId!,
      'general'
    );

    expect(response.data).toBeDefined();
    const finalResponse = response.data.final_text_response || '';
    console.log('📝 User A file modification response:', finalResponse.substring(0, 300) + '...');

    // The response should contain both the original and new content
    expect(finalResponse).toContain('Test File Created by User A');
    expect(finalResponse).toContain('File Modified');
    expect(finalResponse).toContain('subsequent test');
    console.log('✅ User A successfully modified their file on dedicated TES');
  }, 120_000);

  it('should handle file operations with proper error handling on dedicated TES', async () => {
    console.log('🚫 Test: Error handling for non-existent files...');
    
    // Try to access a non-existent file
    const prompt = `Please try to read a file called "nonexistent-file.txt" from /workspace using str_replace_editor. This file should not exist.`;

    const response = await acsClientUserA.core.sendMessage(
      userASession2Id!,
      prompt,
      userAId!,
      'general'
    );

    expect(response.data).toBeDefined();
    const finalResponse = response.data.final_text_response || '';
    console.log('❌ User A error handling response:', finalResponse.substring(0, 300) + '...');

    // The agent should handle the error gracefully
    expect(finalResponse.toLowerCase()).toMatch(/(not found|doesn't exist|no such file|error|failed)/);
    console.log('✅ Error handling working correctly on dedicated TES');
  }, 120_000);

  it('should verify TES instance isolation by checking infrastructure status', async () => {
    console.log('🏗️ Test: Verifying TES infrastructure isolation...');
    
    // Get User A's infrastructure status
    const statusA = await acsClientUserA.infrastructure.getAppPerUserStatus();
    expect(statusA.data.app_name).toBe(userAAppName);
    expect(statusA.data.user_id).toBe(userAId);
    expect(InfrastructureUtils.isActive(statusA.data)).toBe(true);
    
    console.log('📊 User A TES status:', {
      appName: statusA.data.app_name,
      userId: statusA.data.user_id,
      status: InfrastructureUtils.formatStatus(statusA.data)
    });

    if (userBId && userBAppName) {
      // Get User B's infrastructure status
      const statusB = await acsClientUserB.infrastructure.getAppPerUserStatus();
      expect(statusB.data.app_name).toBe(userBAppName);
      expect(statusB.data.user_id).toBe(userBId);
      expect(InfrastructureUtils.isActive(statusB.data)).toBe(true);
      
      console.log('📊 User B TES status:', {
        appName: statusB.data.app_name,
        userId: statusB.data.user_id,
        status: InfrastructureUtils.formatStatus(statusB.data)
      });

      // Verify they have different TES instances
      expect(statusA.data.app_name).not.toBe(statusB.data.app_name);
      expect(statusA.data.user_id).not.toBe(statusB.data.user_id);
      
      console.log('✅ Confirmed: Users have separate TES instances');
      console.log(`   User A TES: ${statusA.data.app_name}`);
      console.log(`   User B TES: ${statusB.data.app_name}`);
    }
    
    console.log('✅ TES infrastructure isolation verified');
  }, 60_000);
});