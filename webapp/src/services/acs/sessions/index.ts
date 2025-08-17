import { ACSClient } from '../shared/client';
import type {
    CreateSessionRequest,
    UpdateSessionRequest,
    SessionSummary,
    SessionDetails,
    SessionListResponse,
    SessionResponse,
    RequestOptions,
    APIResponse
} from '../shared/types';
import { ACS_ENDPOINTS } from '../shared/types';

/**
 * Session management service for ACS
 * Handles CRUD operations for chat sessions
 */
export class ACSSessionService {
    constructor(private client: ACSClient) {}

    /**
     * List all sessions for the authenticated user
     */
    async listSessions(
        options?: {
            limit?: number;
            includeMessageCount?: boolean;
        } & RequestOptions
    ): Promise<APIResponse<SessionListResponse>> {
        const { limit, includeMessageCount, ...requestOptions } = options || {};

        const query = ACSClient.buildQuery({
            limit,
            include_message_count: includeMessageCount
        });

        return this.client.get<SessionListResponse>(`${ACS_ENDPOINTS.SESSIONS}${query}`, requestOptions);
    }

    /**
     * Create a new empty session
     */
    async createSession(request: CreateSessionRequest, options?: RequestOptions): Promise<APIResponse<SessionResponse>> {
        return this.client.post<SessionResponse>(ACS_ENDPOINTS.SESSIONS, request, options);
    }

    /**
     * Create a new session with default values
     */
    async createDefaultSession(name?: string, agentConfigId?: string, options?: { agentCwd?: string } & RequestOptions): Promise<APIResponse<SessionResponse>> {
        // Smart default working directory detection
        const defaultCwd = this.getSmartDefaultCwd(options?.agentCwd);

        const request: CreateSessionRequest = {
            name: name || 'New Chat',
            agent_config_id: agentConfigId,
            agent_cwd: defaultCwd,
            base_dir: options?.agentCwd
        };

        return this.createSession(request, options);
    }

    /**
     * Get smart default working directory based on context
     */
    private getSmartDefaultCwd(explicitCwd?: string): string {
        // 1. Use explicitly provided CWD (highest priority)
        if (explicitCwd) {
            console.log(`[ACSSessionService] Using explicit CWD: ${explicitCwd}`);
            return explicitCwd;
        }

        // 2. Try to detect current project directory from URL or localStorage
        const projectPath = this.detectProjectPath();
        if (projectPath) {
            console.log(`[ACSSessionService] Detected project path: ${projectPath}`);
            return projectPath;
        }

        // 3. Use user's home directory as fallback
        const homeDir = this.getUserHomeDirectory();
        if (homeDir) {
            console.log(`[ACSSessionService] Using home directory: ${homeDir}`);
            return homeDir;
        }

        // 4. Final fallback to /workspace
        console.log(`[ACSSessionService] Using fallback: /workspace`);
        return '/workspace';
    }

    /**
     * Detect current project path from various sources
     */
    private detectProjectPath(): string | null {
        try {
            // Try to get from localStorage (if user has set a project)
            const storedProject = localStorage.getItem('orchestra_current_project');
            if (storedProject) {
                return storedProject;
            }

            // Try to detect from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const projectParam = urlParams.get('project');
            if (projectParam) {
                return projectParam;
            }

            // Try to get from environment or app context
            // This could be set by the Tauri app or Electron wrapper
            if (typeof window !== 'undefined' && (window as any).__ORCHESTRA_PROJECT_PATH__) {
                return (window as any).__ORCHESTRA_PROJECT_PATH__;
            }

            return null;
        } catch (error) {
            console.warn('[ACSSessionService] Failed to detect project path:', error);
            return null;
        }
    }

    /**
     * Get user's home directory
     */
    private getUserHomeDirectory(): string | null {
        try {
            // For web environments, we can't directly access the file system
            // But we can make educated guesses based on platform
            const userAgent = navigator.userAgent.toLowerCase();

            if (userAgent.includes('mac')) {
                return '/Users/' + (process.env.USER || 'user');
            } else if (userAgent.includes('win')) {
                return 'C:\\Users\\' + (process.env.USERNAME || 'user');
            } else if (userAgent.includes('linux')) {
                return '/home/' + (process.env.USER || 'user');
            }

            return null;
        } catch (error) {
            console.warn('[ACSSessionService] Failed to detect home directory:', error);
            return null;
        }
    }

    /**
     * Get detailed information about a specific session
     */
    async getSession(
        sessionId: string,
        options?: {
            includeMessages?: boolean;
        } & RequestOptions
    ): Promise<APIResponse<SessionDetails>> {
        const { includeMessages, ...requestOptions } = options || {};

        const endpoint = ACSClient.replacePath(ACS_ENDPOINTS.SESSION_DETAILS, {
            session_id: sessionId
        });
        console.log(`🔧 [ACSSessionService] getSession endpoint: ${endpoint} - sessionId: ${sessionId}`);

        const query = ACSClient.buildQuery({
            include_messages: includeMessages
        });

        const response = await this.client.get<SessionDetails>(`${endpoint}${query}`, requestOptions);
        console.log(`🔧 [ACSSessionService] getSession response:`, JSON.stringify(response, null, 2));
        return response;
    }

    /**
     * Update session metadata
     */
    async updateSession(sessionId: string, updates: UpdateSessionRequest, options?: RequestOptions): Promise<APIResponse<SessionResponse>> {
        console.log('🔄 [ACSSessionService] updateSession called with:', {
            sessionId: sessionId,
            sessionIdLength: sessionId?.length,
            updates: updates,
            updatesKeys: Object.keys(updates || {}),
            options: options,
            timestamp: new Date().toISOString()
        });

        const endpoint = ACSClient.replacePath(ACS_ENDPOINTS.SESSION_DETAILS, {
            session_id: sessionId
        });

        console.log('🔄 [ACSSessionService] updateSession endpoint:', {
            endpoint: endpoint,
            sessionId: sessionId,
            ACS_ENDPOINTS_SESSION_DETAILS: ACS_ENDPOINTS.SESSION_DETAILS
        });

        try {
            const result = await this.client.put<SessionResponse>(endpoint, updates, options);
            
            console.log('✅ [ACSSessionService] updateSession SUCCESS:', {
                sessionId: sessionId,
                endpoint: endpoint,
                updates: updates,
                resultStatus: result?.status,
                resultData: result?.data,
                timestamp: new Date().toISOString()
            });
            
            return result;
        } catch (error) {
            console.error('❌ [ACSSessionService] updateSession FAILED:', {
                sessionId: sessionId,
                endpoint: endpoint,
                updates: updates,
                error: error,
                errorMessage: (error as any)?.message,
                errorResponse: (error as any)?.response,
                errorResponseData: (error as any)?.response?.data,
                errorStatus: (error as any)?.response?.status,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    /**
     * Delete a session and all its messages
     */
    async deleteSession(sessionId: string, options?: RequestOptions): Promise<APIResponse<SessionResponse>> {
        const endpoint = ACSClient.replacePath(ACS_ENDPOINTS.SESSION_DETAILS, {
            session_id: sessionId
        });

        return this.client.delete<SessionResponse>(endpoint, options);
    }

    /**
     * Duplicate an existing session
     */
    async duplicateSession(sessionId: string, newName?: string, options?: RequestOptions): Promise<APIResponse<SessionResponse>> {
        const endpoint = ACSClient.replacePath(ACS_ENDPOINTS.SESSION_DUPLICATE, {
            session_id: sessionId
        });

        const query = ACSClient.buildQuery({
            new_name: newName
        });

        return this.client.post<SessionResponse>(`${endpoint}${query}`, undefined, options);
    }

    /**
     * Clean up old sessions, keeping only the most recent ones
     */
    async cleanupOldSessions(keepRecent: number = 100, options?: RequestOptions): Promise<APIResponse<SessionResponse>> {
        const query = ACSClient.buildQuery({
            keep_recent: keepRecent
        });

        return this.client.post<SessionResponse>(`${ACS_ENDPOINTS.SESSIONS_CLEANUP}${query}`, undefined, options);
    }

    /**
     * Get session management health status
     */
    async getHealth(options?: RequestOptions): Promise<APIResponse<any>> {
        return this.client.get('/api/v1/sessions/health/check', options);
    }

    /**
     * Rename a session
     */
    async renameSession(sessionId: string, newName: string, options?: RequestOptions): Promise<APIResponse<SessionResponse>> {
        return this.updateSession(sessionId, { name: newName }, options);
    }

    /**
     * Change session agent configuration
     */
    async changeSessionAgent(sessionId: string, agentConfigId: string, options?: RequestOptions): Promise<APIResponse<SessionResponse>> {
        return this.updateSession(sessionId, { agent_config_id: agentConfigId }, options);
    }

    /**
     * Get sessions with pagination
     */
    async getSessionsPaginated(page: number = 1, limit: number = 50, options?: RequestOptions): Promise<APIResponse<SessionListResponse>> {
        return this.listSessions({
            limit,
            includeMessageCount: false,
            ...options
        });
    }

    /**
     * Search sessions by name
     */
    async searchSessions(query: string, options?: RequestOptions): Promise<APIResponse<SessionListResponse>> {
        // Note: This assumes the API supports search, which may need to be implemented
        const searchQuery = ACSClient.buildQuery({
            search: query,
            limit: 100
        });

        return this.client.get<SessionListResponse>(`${ACS_ENDPOINTS.SESSIONS}${searchQuery}`, options);
    }
}

/**
 * Utilities for working with sessions
 */
export class SessionUtils {
    /**
     * Format session creation date
     */
    static formatCreatedAt(createdAt: string): string {
        const date = new Date(createdAt);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    /**
     * Format last message time
     */
    static formatLastMessage(lastMessageAt?: string | null): string {
        if (!lastMessageAt) return 'No messages';

        const date = new Date(lastMessageAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    /**
     * Get session display name
     */
    static getDisplayName(session: SessionSummary | SessionDetails): string {
        return session.name || 'Untitled Chat';
    }

    /**
     * Check if session is recent (within last 24 hours)
     */
    static isRecent(session: SessionSummary | SessionDetails): boolean {
        const lastActivity = session.last_message_at || session.created_at;
        const date = new Date(lastActivity);
        const now = new Date();
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        return diffHours < 24;
    }

    /**
     * Sort sessions by last activity
     */
    static sortByActivity(sessions: SessionSummary[]): SessionSummary[] {
        return [...sessions].sort((a, b) => {
            const aTime = new Date(a.last_message_at || a.created_at).getTime();
            const bTime = new Date(b.last_message_at || b.created_at).getTime();
            return bTime - aTime; // Most recent first
        });
    }

    /**
     * Group sessions by date
     */
    static groupByDate(sessions: SessionSummary[]): Record<string, SessionSummary[]> {
        const groups: Record<string, SessionSummary[]> = {};

        for (const session of sessions) {
            const date = new Date(session.last_message_at || session.created_at);
            const dateKey = date.toDateString();

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }

            groups[dateKey].push(session);
        }

        return groups;
    }

    /**
     * Filter sessions by agent configuration
     */
    static filterByAgent(sessions: SessionSummary[], agentConfigId: string): SessionSummary[] {
        return sessions.filter(session => session.agent_config_id === agentConfigId);
    }

    /**
     * Get session statistics
     */
    static getStats(sessions: SessionSummary[]): {
        total: number;
        withMessages: number;
        recent: number;
        averageMessages: number;
    } {
        const total = sessions.length;
        const withMessages = sessions.filter(s => (s.message_count || 0) > 0).length;
        const recent = sessions.filter(s => this.isRecent(s)).length;
        const totalMessages = sessions.reduce((sum, s) => sum + (s.message_count || 0), 0);
        const averageMessages = total > 0 ? totalMessages / total : 0;

        return {
            total,
            withMessages,
            recent,
            averageMessages: Math.round(averageMessages * 10) / 10
        };
    }

    /**
     * Validate session name
     */
    static validateSessionName(name: string): {
        valid: boolean;
        error?: string;
    } {
        if (!name || name.trim().length === 0) {
            return { valid: false, error: 'Session name cannot be empty' };
        }

        if (name.length > 100) {
            return { valid: false, error: 'Session name must be 100 characters or less' };
        }

        return { valid: true };
    }

    /**
     * Generate a default session name based on timestamp
     */
    static generateDefaultName(): string {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `Chat ${dateStr} ${timeStr}`;
    }
}

export default ACSSessionService;
