import { ACSClient, createACSClient, defaultACSConfig } from './shared/client';
import type { ACSClientConfig } from './shared/types';
import { JWTTokenManager } from '@/lib/jwtTokenManager';
import { ACS_ENDPOINTS } from './shared/types';

// Fallback implementations for missing services
class FallbackACSCoreService {
    constructor(private client: ACSClient) {}

    async startConversation(
        message: string,
        userId: string,
        agentConfigName: string = 'default',
        options?: {
            modelApiKeys?: Record<string, string>;
            useStoredKeys?: boolean;
            agentCwd?: string;
            overrides?: {
                model_id?: string;
                [key: string]: any;
            };
        }
    ) {
        const requestBody = {
            user_id: userId,
            agent_config_name: agentConfigName,
            prompt: message,
            messages_history_override: null,
            agent_cwd_override: options?.agentCwd,
            model_api_keys: options?.modelApiKeys,
            use_stored_keys: options?.useStoredKeys,
            overrides: options?.overrides
        };

        return this.client.post(ACS_ENDPOINTS.CONVERSE, requestBody);
    }

    async sendMessage(
        sessionId: string,
        message: string,
        userId: string,
        agentConfigName: string = 'default',
        options: {
            modelApiKeys?: Record<string, string>;
            useStoredKeys?: boolean;
            templateVariables?: Record<string, any>;
            overrides?: {
                model_id?: string;
                [key: string]: any;
            };
        } = {}
    ) {
        const requestBody = {
            user_id: userId,
            agent_config_name: agentConfigName,
            prompt: message,
            session_id: sessionId,
            messages_history_override: null,
            model_api_keys: options?.modelApiKeys,
            use_stored_keys: options?.useStoredKeys,
            template_variables: options?.templateVariables,
            overrides: options?.overrides
        };

        return this.client.post(ACS_ENDPOINTS.CONVERSE, requestBody);
    }
}

class FallbackACSAuthService {
    constructor(private client: ACSClient) {}

    restoreAuth(): boolean {
        try {
            const token = JWTTokenManager.getToken();
            if (token) {
                this.client.setAuthToken(token);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    async getUserInfo() {
        // Try to get user info from stored token
        const token = this.client.getAuthToken();
        if (!token) {
            throw new Error('No authentication token available');
        }

        const user = JWTTokenManager.getUserFromToken(token);
        if (!user) {
            throw new Error('Invalid token or unable to extract user info');
        }

        return { data: { id: user.sub, email: user.email } };
    }

    async login(email: string, password: string) {
        // This would typically call Supabase directly or an ACS login endpoint
        throw new Error('Direct login not implemented in fallback service. Use Supabase auth.');
    }

    logout(): void {
        this.client.clearAuthToken();
    }
}

// Import real services with fallbacks
import { ACSCoreService as RealCoreService } from './core/index';
import { ACSAuthService as RealAuthService } from './auth/index';

// Use real services if available, fallback otherwise
const ACSCoreService: any = RealCoreService || FallbackACSCoreService;
const ACSAuthService: any = RealAuthService || FallbackACSAuthService;

import { ACSSessionService } from './sessions';
import { ACSStreamingService } from './streaming';
import { ACSModelService } from './models';
import { ACSAgentConfigService } from './agent-configs';
import { ACSInfrastructureService } from './infrastructure';
import { ACSGitHubService } from './github';
import { getFirehose } from '@/services/GlobalServiceManager';
// // import { LocalToolOrchestrator } from '../localTool';
// import { ChatEventOrchestrator } from '../chat/ChatEventOrchestrator';

/**
 * Main ACS (Agent Core Service) client
 * Provides a unified interface to all ACS functionality
 */
export class OrchestACSClient {
    private client: ACSClient;

    // Service modules
    public readonly core: typeof ACSCoreService;
    public readonly auth: typeof ACSAuthService;
    public readonly sessions: ACSSessionService;
    public readonly streaming: ACSStreamingService;
    public readonly models: ACSModelService;
    public readonly agentConfigs: ACSAgentConfigService;
    public readonly infrastructure: ACSInfrastructureService;
    public readonly github: ACSGitHubService;

    // Fire-hose service and orchestrators
    private firehose?: any;
    // private localToolOrchestrator?: LocalToolOrchestrator;
    // private chatEvents?: ChatEventOrchestrator;

    constructor(config: ACSClientConfig, streamingServiceFactory?: () => any) {
        this.client = createACSClient(config);

        // Initialize service modules
        this.core = new ACSCoreService(this.client);
        this.auth = new ACSAuthService(this.client);
        this.sessions = new ACSSessionService(this.client);

        // Use custom streaming service if provided, otherwise use default
        if (streamingServiceFactory) {
            this.streaming = streamingServiceFactory();
        } else {
            this.streaming = new ACSStreamingService(config);
        }

        this.models = new ACSModelService(this.client);
        this.agentConfigs = new ACSAgentConfigService(this.client);
        this.infrastructure = new ACSInfrastructureService(this.client);
        this.github = new ACSGitHubService(this.client);

        // Initialize fire-hose service and orchestrators FIRST

        this.firehose = getFirehose();
        if (!this.firehose) {
            throw new Error('FirehoseMux not available from GlobalServiceManager - check GlobalServiceManager is initialized');
        }
        // this.localToolOrchestrator = new LocalToolOrchestrator(this.firehose);
        // this.chatEvents = new ChatEventOrchestrator(this.firehose, { debugEnabled: false });

        // Inject firehose service into streaming service for user-specific connections
        this.streaming.setFirehoseService(this.firehose);

        // Note: Firehose connections will be established when needed:
        // - User-specific connection via connectPrivate() when user authenticates
        // - Session-specific connection via connect() when ChatMain mounts
        // this.localToolOrchestrator.start();
        // this.chatEvents.start();

        // Expose chat orchestrator for debugging in dev mode
        // if (import.meta.env.DEV) {
        //     (globalThis as any).__CHAT_ORCH = this.chatEvents;
        // }
    }

    /**
     * Get the underlying HTTP client
     */
    getClient(): ACSClient {
        return this.client;
    }

    /**
     * Set authentication token for all services
     */
    setAuthToken(token: string): void {
        this.client.setAuthToken(token);
    }

    /**
     * Clear authentication token from all services
     */
    clearAuthToken(): void {
        this.client.clearAuthToken();
    }

    /**
     * Check if client is authenticated
     */
    isAuthenticated(): boolean {
        return this.client.isAuthenticated();
    }

    /**
     * Get current authentication token (pass-through getter – needed by BYOK store for debugging)
     */
    getAuthToken(): string | null {
        return this.client.getAuthToken();
    }

    /**
     * Get chat event orchestrator for debugging
     */
    // getChatEvents(): ChatEventOrchestrator | undefined {
    //     return this.chatEvents;
    // }

    /**
     * Get comprehensive health status from all services
     */
    async getHealthStatus(): Promise<{
        acs: any;
        sse: any;
        overall: 'healthy' | 'degraded' | 'unhealthy';
    }> {
        try {
            const [acsHealth, sseHealth] = await Promise.allSettled([this.client.get('/acs/health'), this.streaming.getHealth()]);

            const acsResult = acsHealth.status === 'fulfilled' ? acsHealth.value.data : null;
            const sseResult = sseHealth.status === 'fulfilled' ? sseHealth.value : null;

            let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

            if (!acsResult || !sseResult) {
                overall = 'degraded';
            }

            if (!acsResult && !sseResult) {
                overall = 'unhealthy';
            }

            return {
                acs: acsResult,
                sse: sseResult,
                overall
            };
        } catch (error) {
            return {
                acs: null,
                sse: null,
                overall: 'unhealthy'
            };
        }
    }

    /**
     * Initialize client with authentication restoration
     */
    async initialize(): Promise<{
        authenticated: boolean;
        user?: any;
        error?: string;
    }> {
        try {
            // Try to restore authentication
            const restored = this.auth.restoreAuth();

            if (restored) {
                // Verify the token is still valid
                try {
                    const userInfo = await this.auth.getUserInfo();
                    const authToken = this.client.getAuthToken()!;

                    // 👉 Connect to user-specific SSE channel if user ID is available
                    if (userInfo.data?.id) {
                        this.firehose?.connectPrivate(userInfo.data.id, authToken);
                    }
                    // Note: Session-specific connections will be established when ChatMain mounts

                    // Connect fire-hose and start orchestrators if authenticated
                    this.localToolOrchestrator?.start();
                    this.chatEvents?.start();

                    return {
                        authenticated: true,
                        user: userInfo.data
                    };
                } catch (error) {
                    // Token is invalid, clear it
                    this.auth.logout();
                    return {
                        authenticated: false,
                        error: 'Stored authentication token is invalid'
                    };
                }
            }

            return {
                authenticated: false
            };
        } catch (error) {
            return {
                authenticated: false,
                error: error instanceof Error ? error.message : 'Initialization failed'
            };
        }
    }

    /**
     * Complete login flow with session establishment
     */
    async loginAndConnect(
        email: string,
        password: string,
        sessionId?: string
    ): Promise<{
        success: boolean;
        user?: any;
        sessionId?: string;
        error?: string;
    }> {
        try {
            // Login and get auth token
            const loginResponse = await this.auth.login(email, password);
            const user = loginResponse.data.user;
            const authToken = loginResponse.data.access_token;

            // 👉 Connect fire-hose with user-specific connection for better isolation
            if (user?.id) {
                this.firehose?.connectPrivate(user.id, authToken);
            }
            // Note: Session-specific connections will be established when ChatMain mounts

            // Connect fire-hose and start orchestrators
            this.localToolOrchestrator?.start();
            this.chatEvents?.start();

            // If sessionId provided, connect to streaming
            if (sessionId) {
                try {
                    await this.streaming.connect(sessionId);
                } catch {
                    // Ignore streaming connection errors - login succeeded
                }
            }

            return {
                success: true,
                user,
                sessionId
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Login failed'
            };
        }
    }

    /**
     * Complete logout flow with cleanup
     */
    async logoutAndDisconnect(): Promise<void> {
        this.firehose?.close();
        // Stop orchestrators
        this.localToolOrchestrator?.stop();
        this.chatEvents?.stop();

        // Disconnect from streaming
        await this.streaming.disconnect();

        // Clear authentication
        this.auth.logout();
    }

    /**
     * Start a new conversation with streaming
     */
    async startConversationWithStreaming(
        message: string,
        userId: string,
        agentConfigName: string = 'default',
        options?: {
            modelApiKeys?: Record<string, string>;
            useStoredKeys?: boolean;
            agentCwd?: string;
        }
    ): Promise<{
        sessionId: string;
        response: any;
        streamingConnected: boolean;
    }> {
        // Start orchestrators if not already started
        this.localToolOrchestrator?.start();
        this.chatEvents?.start();

        // Start the conversation
        const response = await this.core.startConversation(message, userId, agentConfigName, options);

        const sessionId = response.data.session_id;

        return {
            sessionId,
            response: response.data,
            streamingConnected: false // UI will handle streaming connection
        };
    }

    /**
     * Send message with streaming support
     */
    async sendMessageWithStreaming(
        sessionId: string,
        message: string,
        userId: string,
        agentConfigName: string = 'default',
        options: {
            modelApiKeys?: Record<string, string>;
            useStoredKeys?: boolean;
        } = {}
    ): Promise<{
        response: any;
        streamingConnected: boolean;
    }> {
        // Start orchestrators if not already started
        this.localToolOrchestrator?.start();
        this.chatEvents?.start();

        // Ensure streaming is connected (idempotent)
        let streamingConnected = false;
        try {
            await this.streaming.connect(sessionId);
            streamingConnected = true;
        } catch {
            // Ignore streaming connection errors
        }

        // Send the message (BYOK-aware)
        const response = await this.core.sendMessage(sessionId, message, userId, agentConfigName, options);

        return {
            response: response.data,
            streamingConnected
        };
    }
}

/**
 * Create a configured ACS client instance
 */
export function createOrchestACSClient(config: Partial<ACSClientConfig> = {}, streamingServiceFactory?: () => any): OrchestACSClient {
    const fullConfig: ACSClientConfig = {
        baseUrl: import.meta.env.VITE_ACS_BASE_URL || 'https://orchestra-acs.fly.dev',
        sseUrl: import.meta.env.VITE_SSE_BASE_URL || 'https://orchestra-sse-service.fly.dev',
        apiKey: import.meta.env.VITE_ACS_API_KEY,
        ...defaultACSConfig,
        ...config
    };

    return new OrchestACSClient(fullConfig, streamingServiceFactory);
}

/**
 * Default ACS client instance (singleton) - enforced singleton pattern
 */
let _defaultClient: OrchestACSClient | undefined;

/**
 * Get the default ACS client instance - TRUE SINGLETON
 */
export function getDefaultACSClient(): OrchestACSClient {
    if (!_defaultClient) {
        _defaultClient = createOrchestACSClient();
    }

    return _defaultClient;
}

/**
 * Set the default ACS client instance
 */
export function setDefaultACSClient(client: OrchestACSClient): void {
    _defaultClient = client;
}

// Re-export all types and utilities
export * from './shared/types';
export * from './shared/client';
export * from './core';
export * from './auth';
export * from './sessions';
export * from './streaming';
export * from './models';
export * from './agent-configs';
export * from './infrastructure';

// Re-export the main client class
export { OrchestACSClient as ACSClient };
