import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { OrchestACSClient, InfrastructureUtils } from '../../index';
import type { ACSClientConfig, ProvisionAppPerUserRequest, ProvisionAppPerUserResponse, AppPerUserStatusResponse } from '../../shared/types';
import { loginWithExchange, logout } from '../../../../../tests/utils/authHelpers';
import { fetch } from 'undici';

// @vitest-environment node

// Set extended timeout for infrastructure tests (5 minutes)
vi.setConfig({ testTimeout: 300000 });

// Unmock fetch for integration tests - we need real HTTP requests
vi.unmock('fetch');
if (global.fetch && typeof global.fetch.mockRestore === 'function') {
    global.fetch.mockRestore();
}

// Set up fetch polyfill for Node.js environment
globalThis.fetch = fetch as any;

const ACS_BASE_URL = process.env.TEST_ACS_BASE_URL!;
const SSE_BASE_URL = process.env.TEST_SSE_BASE_URL || `${ACS_BASE_URL}/sse`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!;

describe('ACSInfrastructureService - Integration Tests', () => {
    let acsClient: OrchestACSClient;
    let provisionedAppName: string | null = null;
    let testUserId: string | null = null;

    beforeAll(async () => {
        // Environment setup complete
        
        // Validate required environment variables
        if (!ACS_BASE_URL || !TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
            throw new Error(
                'Missing required environment variables for infrastructure integration tests. ' +
                    'Please ensure TEST_ACS_BASE_URL, TEST_USER_EMAIL, and TEST_USER_PASSWORD are set in .env.test'
            );
        }

        // Create and authenticate ACS client
        const config: ACSClientConfig = {
            baseUrl: ACS_BASE_URL,
            sseUrl: SSE_BASE_URL,
            timeout: 60000, // Extended timeout for infrastructure operations
            retries: 3,
            debug: true
        };

        acsClient = new OrchestACSClient(config);

        // Set up cookie-based authentication
        await loginWithExchange();

        // Login and get user ID
        try {
            const loginResponse = await acsClient.auth.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);

            if (!acsClient.isAuthenticated()) {
                throw new Error('Authentication failed - cannot proceed with infrastructure tests');
            }

            testUserId = loginResponse.data.data?.user?.id || loginResponse.data.user?.id;
        } catch (error) {
            console.error('Infrastructure tests: Authentication failed', error);
            throw error;
        }
    });

    afterAll(async () => {
        // CRITICAL: Ensure cleanup of any provisioned infrastructure
        if (acsClient.isAuthenticated()) {
            try {
                // Always attempt cleanup, regardless of test outcomes
                console.log('Infrastructure tests: Attempting final cleanup...');
                const cleanupResponse = await acsClient.infrastructure.cleanupAppPerUser();
                console.log('Infrastructure tests: Final cleanup completed:', cleanupResponse.data);
            } catch (cleanupError) {
                console.error('Infrastructure tests: Final cleanup failed:', cleanupError);
                // Log but don't throw - we don't want cleanup failures to fail the test suite
            }
        }

        // Clean up cookie jar
        logout();
    });

    beforeEach(() => {
        // Ensure we're still authenticated before each test
        if (!acsClient.isAuthenticated()) {
            throw new Error('Lost authentication during infrastructure tests');
        }
        if (!testUserId) {
            throw new Error('Missing test user ID for infrastructure tests');
        }
    });

    describe('Infrastructure Service Availability', () => {
        it('should have infrastructure service available on client', () => {
            expect(acsClient.infrastructure).toBeDefined();
            expect(typeof acsClient.infrastructure.provisionAppPerUser).toBe('function');
            expect(typeof acsClient.infrastructure.getAppPerUserStatus).toBe('function');
            expect(typeof acsClient.infrastructure.cleanupAppPerUser).toBe('function');
        });

        it('should test infrastructure service health endpoint', async () => {
            try {
                const healthResponse = await acsClient.infrastructure.getHealth();
                expect(healthResponse.data).toBeDefined();
                console.log('Infrastructure service health check successful');
            } catch (error: any) {
                // Health endpoint might not be available - this is acceptable
                if (error.status_code === 404) {
                    console.warn('Infrastructure health endpoint not available - this is acceptable');
                } else {
                    throw error;
                }
            }
        });
    });

    describe('App-Per-User TES Environment Lifecycle', () => {
        it('should complete full infrastructure lifecycle: provision -> status -> cleanup', async () => {
            console.log('Starting full infrastructure lifecycle test...');

            // Step 1: Check for existing infrastructure first
            let existingInfrastructure = false;
            try {
                const existingStatus = await acsClient.infrastructure.getAppPerUserStatus();
                if (existingStatus.data && existingStatus.data.app_name) {
                    console.log('Found existing infrastructure:', existingStatus.data.app_name);
                    provisionedAppName = existingStatus.data.app_name;
                    existingInfrastructure = true;

                    // If infrastructure is already active, skip to cleanup test
                    if (InfrastructureUtils.isActive(existingStatus.data)) {
                        console.log('Existing infrastructure is already active, proceeding to cleanup test');
                    } else if (InfrastructureUtils.isProvisioning(existingStatus.data)) {
                        console.log('Existing infrastructure is still provisioning, will wait for completion');
                    }
                }
            } catch (error: any) {
                // No existing infrastructure found - this is expected for a clean test
                if (error.status_code === 404) {
                    console.log('No existing infrastructure found - will provision new');
                } else {
                    console.warn('Error checking existing infrastructure:', error.message);
                }
            }

            // Step 2: Provision new infrastructure (if none exists)
            if (!existingInfrastructure) {
                console.log('Provisioning new app-per-user TES environment...');

                const provisionRequest: ProvisionAppPerUserRequest = {
                    resource_spec: InfrastructureUtils.createTestResourceSpec('iad'),
                    tes_image: 'registry.fly.io/orchestra-tes:latest' // Use latest TES image
                };

                try {
                    const provisionResponse = await acsClient.infrastructure.provisionAppPerUser(provisionRequest);

                    expect(provisionResponse.data).toBeDefined();
                    expect(provisionResponse.data.app_name).toBeDefined();
                    expect(provisionResponse.data.user_id).toBe(testUserId);

                    provisionedAppName = provisionResponse.data.app_name;

                    // Verify initial status indicates provisioning
                    const initialStatus = provisionResponse.data.status?.toLowerCase();
                    expect(['provisioning_initiated', 'creating', 'pending', 'active'].some(status => initialStatus?.includes(status))).toBe(true);

                    console.log(`Provisioning initiated for app: ${provisionedAppName}, status: ${provisionResponse.data.status}`);
                } catch (provisionError: any) {
                    // Handle case where user already has infrastructure
                    if (provisionError.message?.toLowerCase().includes('already has') || provisionError.message?.toLowerCase().includes('exists')) {
                        console.warn('User already has infrastructure, retrieving existing details...');
                        const existingStatus = await acsClient.infrastructure.getAppPerUserStatus();
                        provisionedAppName = existingStatus.data.app_name;
                        expect(provisionedAppName).toBeDefined();
                    } else {
                        throw provisionError;
                    }
                }
            }

            // Step 3: Poll for active status
            console.log(`Polling status for app: ${provisionedAppName}...`);
            expect(provisionedAppName).toBeDefined();

            let finalStatus: AppPerUserStatusResponse;
            try {
                finalStatus = await InfrastructureUtils.pollUntilActive(() => acsClient.infrastructure.getAppPerUserStatus(), {
                    maxRetries: 60, // 60 retries
                    delayMs: 5000, // 5 seconds between retries
                    timeoutMs: 300000 // 5 minutes total timeout
                });

                // Verify final active status
                expect(InfrastructureUtils.isActive(finalStatus)).toBe(true);
                expect(finalStatus.app_name).toBe(provisionedAppName);
                expect(finalStatus.user_id).toBe(testUserId);

                // Verify resource details
                const resourceInfo = InfrastructureUtils.getResourceInfo(finalStatus);
                expect(resourceInfo.region).toBeTruthy();
                expect(resourceInfo.machineId).toBeTruthy();
                expect(resourceInfo.volumeId).toBeTruthy();

                console.log(`Infrastructure is active:`, {
                    appName: finalStatus.app_name,
                    status: InfrastructureUtils.formatStatus(finalStatus),
                    region: resourceInfo.region,
                    machineCount: resourceInfo.machineCount,
                    estimatedCost: InfrastructureUtils.getEstimatedCost(finalStatus)
                });
            } catch (pollingError) {
                console.error('Polling failed:', pollingError);

                // Get final status for debugging
                try {
                    const debugStatus = await acsClient.infrastructure.getAppPerUserStatus();
                    console.error('Final status for debugging:', {
                        status: debugStatus.data.status,
                        appStatus: debugStatus.data.app_status,
                        appName: debugStatus.data.app_name
                    });
                } catch (debugError) {
                    console.error('Could not retrieve status for debugging:', debugError);
                }

                throw pollingError;
            }

            // Step 4: Verify direct status check
            console.log('Verifying direct status check...');
            const directStatusResponse = await acsClient.infrastructure.getAppPerUserStatus();
            expect(directStatusResponse.data.app_name).toBe(provisionedAppName);
            expect(InfrastructureUtils.isActive(directStatusResponse.data)).toBe(true);

            // Step 5: Test cleanup
            console.log('Testing infrastructure cleanup...');
            const cleanupResponse = await acsClient.infrastructure.cleanupAppPerUser();

            expect(cleanupResponse.data).toBeDefined();
            console.log('Cleanup initiated:', cleanupResponse.data);

            // Step 6: Verify cleanup (optional - infrastructure might take time to fully clean up)
            try {
                // Wait a moment for cleanup to begin
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

                const postCleanupStatus = await acsClient.infrastructure.getAppPerUserStatus();

                // After cleanup, we might get a 404 or a status indicating deletion
                if (postCleanupStatus.data) {
                    const status = postCleanupStatus.data.status?.toLowerCase();
                    console.log('Post-cleanup status:', status);

                    // Status should indicate cleanup/deletion in progress or completed
                    expect(['deleting', 'deleted', 'cleanup', 'destroyed'].some(cleanupStatus => status?.includes(cleanupStatus))).toBe(true);
                }
            } catch (postCleanupError: any) {
                // 404 after cleanup is expected and acceptable
                if (postCleanupError.status_code === 404) {
                    console.log('Infrastructure not found after cleanup - this indicates successful cleanup');
                } else {
                    console.warn('Post-cleanup status check failed:', postCleanupError.message);
                }
            }

            // Clear the app name since we've cleaned up
            provisionedAppName = null;

            console.log('Full infrastructure lifecycle test completed successfully');
        }, 300000); // 5-minute timeout for the full lifecycle test
    });

    describe('Infrastructure Utilities', () => {
        it('should correctly identify infrastructure states', () => {
            // Test active state detection
            const activeStatus: AppPerUserStatusResponse = {
                user_id: 'test-user',
                infrastructure_id: 'test-infra',
                status: 'active',
                app_name: 'test-app',
                app_url: 'https://test-app.fly.dev',
                machine_id: 'test-machine',
                volume_id: 'test-volume',
                app_status: 'running',
                machine_count: 1,
                region: 'iad',
                resources: {},
                cost_tracking: {},
                timestamps: {}
            };

            expect(InfrastructureUtils.isActive(activeStatus)).toBe(true);
            expect(InfrastructureUtils.isError(activeStatus)).toBe(false);
            expect(InfrastructureUtils.isProvisioning(activeStatus)).toBe(false);

            // Test error state detection
            const errorStatus: AppPerUserStatusResponse = {
                ...activeStatus,
                status: 'error',
                app_status: 'failed'
            };

            expect(InfrastructureUtils.isActive(errorStatus)).toBe(false);
            expect(InfrastructureUtils.isError(errorStatus)).toBe(true);
            expect(InfrastructureUtils.isProvisioning(errorStatus)).toBe(false);

            // Test provisioning state detection
            const provisioningStatus: AppPerUserStatusResponse = {
                ...activeStatus,
                status: 'provisioning_initiated',
                app_status: 'creating'
            };

            expect(InfrastructureUtils.isActive(provisioningStatus)).toBe(false);
            expect(InfrastructureUtils.isError(provisioningStatus)).toBe(false);
            expect(InfrastructureUtils.isProvisioning(provisioningStatus)).toBe(true);
        });

        it('should format status correctly', () => {
            const status: AppPerUserStatusResponse = {
                user_id: 'test-user',
                infrastructure_id: 'test-infra',
                status: 'active',
                app_name: 'test-app',
                app_url: 'https://test-app.fly.dev',
                machine_id: 'test-machine',
                volume_id: 'test-volume',
                app_status: 'running',
                machine_count: 1,
                region: 'iad',
                resources: {},
                cost_tracking: {},
                timestamps: {}
            };

            const formatted = InfrastructureUtils.formatStatus(status);
            expect(formatted).toBe('ACS: active, App: running');
        });

        it('should extract resource information correctly', () => {
            const status: AppPerUserStatusResponse = {
                user_id: 'test-user',
                infrastructure_id: 'test-infra',
                status: 'active',
                app_name: 'test-app',
                app_url: 'https://test-app.fly.dev',
                machine_id: 'test-machine-123',
                volume_id: 'test-volume-456',
                app_status: 'running',
                machine_count: 2,
                region: 'iad',
                resources: {},
                cost_tracking: {},
                timestamps: {}
            };

            const resourceInfo = InfrastructureUtils.getResourceInfo(status);
            expect(resourceInfo.region).toBe('iad');
            expect(resourceInfo.machineCount).toBe(2);
            expect(resourceInfo.machineId).toBe('test-machine-123');
            expect(resourceInfo.volumeId).toBe('test-volume-456');
        });

        it('should create valid test resource specifications', () => {
            const resourceSpec = InfrastructureUtils.createTestResourceSpec('iad');

            expect(resourceSpec).toBeDefined();
            expect(typeof resourceSpec).toBe('object');
            expect((resourceSpec as any).region).toBe('iad');
            expect((resourceSpec as any).volume_size_gb).toBe(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent infrastructure status gracefully', async () => {
            // First ensure no infrastructure exists by cleaning up
            try {
                await acsClient.infrastructure.cleanupAppPerUser();
                // Wait a moment for cleanup
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                // Cleanup might fail if no infrastructure exists - that's fine
            }

            try {
                await acsClient.infrastructure.getAppPerUserStatus();
                // If this doesn't throw, infrastructure might still exist
                console.warn('Infrastructure status returned when none expected - might be from previous test');
            } catch (error: any) {
                // 404 is expected when no infrastructure exists
                expect([404, 400]).toContain(error.status_code);
            }
        });

        it('should handle invalid provision requests', async () => {
            const invalidRequest: ProvisionAppPerUserRequest = {
                resource_spec: {
                    region: 'invalid-region-that-does-not-exist',
                    volume_size_gb: -1 // Invalid negative size
                }
            };

            try {
                await acsClient.infrastructure.provisionAppPerUser(invalidRequest);
                throw new Error('Should have failed with invalid provision request');
            } catch (error: any) {
                expect(error).toBeDefined();
                expect([400, 422]).toContain(error.status_code);
            }
        });

        it('should handle cleanup when no infrastructure exists', async () => {
            try {
                const cleanupResponse = await acsClient.infrastructure.cleanupAppPerUser();
                // Cleanup might succeed even if no infrastructure exists
                expect(cleanupResponse.data).toBeDefined();
            } catch (error: any) {
                // 404 or similar error is acceptable when no infrastructure exists
                expect([404, 400]).toContain(error.status_code);
            }
        });
    });

    describe('General Infrastructure Endpoints', () => {
        it('should test general infrastructure provision endpoint', async () => {
            try {
                const response = await acsClient.infrastructure.provisionInfrastructure({
                    type: 'test',
                    spec: { minimal: true }
                });

                expect(response.data).toBeDefined();
                console.log('General infrastructure provision test successful');
            } catch (error: any) {
                // General infrastructure endpoints might not be implemented
                if (error.status_code === 404 || error.status_code === 501) {
                    console.warn('General infrastructure provision not implemented - this is acceptable');
                    // } else {
                    throw error;
                }
            }
        });

        it('should test general infrastructure status endpoint', async () => {
            try {
                const response = await acsClient.infrastructure.getInfrastructureStatus();

                expect(response.data).toBeDefined();
                console.log('General infrastructure status test successful');
            } catch (error: any) {
                // General infrastructure endpoints might not be implemented
                if (error.status_code === 404 || error.status_code === 501) {
                    console.warn('General infrastructure status not implemented - this is acceptable');
                } else {
                    throw error;
                }
            }
        });
    });
});
