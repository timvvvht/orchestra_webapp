// ACS API Types and Interfaces
// Generated from OpenAPI spec: https://orchestra-acs.fly.dev/openapi.json

// ============================================================================
// CORE REQUEST/RESPONSE TYPES
// ============================================================================

export interface AgentConfigOverrides {
    model_id?: string | null;
    provider_name?: string | null;
    system_prompt?: string | null;
    enabled_tool_groups?: string[] | null;
    enabled_tools?: string[] | null;
    disabled_tools?: string[] | null;
}

export interface ACSConverseRequest {
    user_id: string;
    agent_config_name: string;
    prompt: string;
    session_id?: string | null;
    messages_history_override?: object[] | null;
    agent_cwd_override?: string | null;
    model_api_keys?: Record<string, string> | null;
    use_stored_keys?: boolean | null;
    overrides?: AgentConfigOverrides | null;
    template_variables?: Record<string, string> | null;
    auto_mode?: boolean | null;
    model_auto_mode?: boolean | null;
}
export interface ACSConverseResponse {
    session_id: string;
    response_messages: object[];
    final_text_response?: string | null;
    current_agent_cwd: string;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface UserRegistration {
    email: string;
    password: string;
}

export interface UserLogin {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: {
        id: string;
        email: string;
        created_at: string;
    };
}

// ============================================================================
// SESSION MANAGEMENT TYPES
// ============================================================================

export interface CreateSessionRequest {
    name?: string | null;
    agent_config_id?: string | null;
    agent_cwd?: string | null;
    base_dir?: string | null;
}

export interface UpdateSessionRequest {
    name?: string | null;
    agent_config_id?: string | null;
    agent_cwd?: string | null;
    base_dir?: string | null;
}

export interface SessionSummary {
    id: string;
    name: string;
    agent_config_id?: string | null;
    created_at: string;
    last_message_at?: string | null;
    agent_cwd: string;
    message_count?: number | null;
    // NEW: Persisted agent config metadata
    agent_config_name?: string | null;
    model_id?: string | null;
    base_dir?: string | null;
}

export interface SessionDetails {
    id: string;
    name: string;
    agent_config_id?: string | null;
    created_at: string;
    last_message_at?: string | null;
    agent_cwd: string;
    messages: object[];
    metadata: object;
    // NEW: Persisted agent config metadata
    agent_config_name?: string | null;
    model_id?: string | null;
    base_dir?: string | null;
}

export interface SessionListResponse {
    sessions: SessionSummary[];
    total: number;
    limit: number;
}

export interface SessionResponse {
    success: boolean;
    message: string;
    session_id?: string | null;
}

// ============================================================================
// MODEL API KEYS TYPES
// ============================================================================

export interface StoreAPIKeyRequest {
    provider_name: string;
    api_key: string;
    key_alias?: string | null;
}

export interface APIKeyResponse {
    message: string;
    provider_name: string;
    success: boolean;
}

export interface APIKeyProviderResponse {
    provider_name: string;
    key_alias: string;
    created_at: number;
    last_used?: number | null;
    has_key: boolean;
}

// ============================================================================
// CONVERSATION FORKING TYPES
// ============================================================================

export interface CreateForkRequest {
    parent_session_id: string;
    fork_message_id: string;
    agent_config_id?: string | null;
    name?: string | null;
    display_title?: string | null;
}

export interface ForkTreeNode {
    session_id: string;
    name: string;
    display_title?: string | null;
    created_at: string;
    fork_message_id?: string | null;
    children: ForkTreeNode[];
}

export interface ForkLineage {
    session_id: string;
    name: string;
    display_title?: string | null;
    depth_level: number;
    created_at: string;
}

// ============================================================================
// INFRASTRUCTURE TYPES
// ============================================================================

export interface ProvisionAppPerUserRequest {
    resource_spec?: object | null;
    tes_image?: string | null;
}

export interface ProvisionAppPerUserResponse {
    user_id: string;
    app_name: string;
    app_url: string;
    volume_id: string;
    machine_id: string;
    status: string;
    region: string;
    estimated_monthly_cost_usd: number;
    provisioned_at?: number | null;
}

export interface AppPerUserStatusResponse {
    user_id: string;
    infrastructure_id: string;
    status: string;
    app_name: string;
    app_url: string;
    machine_id: string;
    volume_id: string;
    app_status: string;
    machine_count: number;
    region: string;
    resources: object;
    cost_tracking: object;
    timestamps: object;
}

// ============================================================================
// SSE STREAMING TYPES
// ============================================================================

export interface SSEEvent {
    type: string;
    sessionId: string;
    messageId?: string;
    seq?: number;
    event_id?: string;
    delta?: string;
    toolCall?: {
        id: string;
        name: string;
        arguments: any;
    };
    result?: any;
    history?: any[];
    error?: string;
    data?: any; // For agent_status events and other structured data
}

export type SSEEventHandler = (event: SSEEvent) => void;

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}

export interface HTTPValidationError {
    detail: ValidationError[];
}

export interface ACSError {
    error: string;
    detail?: string;
    status_code: number;
}

// ============================================================================
// GITHUB INTEGRATION TYPES
// ============================================================================

export interface GitHubStatus {
    connected: boolean;
    repo?: string;
    installation_id?: number;
    permissions?: Record<string, string>;
}

export interface GitHubRepo {
    id: number;
    full_name: string;
    private: boolean;
    default_branch: string;
}

export interface CreatePrRequest {
    workspace_id: string;
    base_branch: string;
    head_branch: string;
    title: string;
    body?: string;
    draft?: boolean;
}

export interface CreatePrResponse {
    url: string;
    number: number;
}

// ============================================================================
// GITHUB INTEGRATION TYPES
// ============================================================================

export interface GitHubStatus {
    connected: boolean;
    repo?: string;
    installation_id?: number;
    permissions?: Record<string, string>;
}

export interface GitHubRepo {
    id: number;
    full_name: string;
    private: boolean;
    default_branch: string;
}

export interface CreatePrRequest {
    workspace_id: string;
    base_branch: string;
    head_branch: string;
    title: string;
    body?: string;
    draft?: boolean;
}

export interface CreatePrResponse {
    url: string;
    number: number;
}

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    version: string;
    services: {
        database: 'up' | 'down';
        redis: 'up' | 'down';
        tes: 'up' | 'down' | 'unknown';
    };
    metrics?: {
        response_time_ms: number;
        active_sessions: number;
        total_requests: number;
    };
}

// ============================================================================
// CLIENT CONFIGURATION TYPES
// ============================================================================

export interface ACSClientConfig {
    baseUrl: string;
    sseUrl: string;
    apiKey?: string;
    timeout?: number;
    retries?: number;
    debug?: boolean;
}

export interface RequestOptions {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ACSEndpoint = 'auth' | 'sessions' | 'converse' | 'model-keys' | 'forking' | 'infrastructure' | 'health';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APIResponse<T = any> {
    data: T;
    status: number;
    headers: Record<string, string>;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ACS_ENDPOINTS = {
    // Authentication (TODO: Verify these exist in ACS)
    AUTH_REGISTER: '/api/v1/auth/register',
    AUTH_LOGIN: '/api/v1/auth/login',
    AUTH_OAUTH_EXCHANGE: '/api/v1/auth/oauth/exchange',

    // Session Management (CORRECTED to match actual ACS endpoints)
    SESSIONS: '/api/v1/sessions',
    SESSION_DETAILS: '/api/v1/sessions/{session_id}',
    SESSION_DUPLICATE: '/api/v1/sessions/{session_id}/duplicate',
    SESSIONS_CLEANUP: '/api/v1/sessions/cleanup',

    // Core Chat (CORRECT)
    CONVERSE: '/acs/converse',

    // Model API Keys (CORRECTED to match actual ACS endpoints)
    MODEL_KEYS_STORE: '/api/v1/model-api-keys/store',
    MODEL_KEYS_LIST: '/api/v1/model-api-keys/list',
    MODEL_KEYS_DELETE: '/api/v1/model-api-keys/{provider_name}',
    MODEL_KEYS_TEST: '/api/v1/model-api-keys/test/{provider_name}',

    // Conversation Forking
    FORKING_CREATE: '/api/v1/forking/create-fork',
    FORKING_TREE: '/api/v1/forking/tree/{session_id}',
    FORKING_CONVERSATION: '/api/v1/forking/full-conversation/{session_id}',
    FORKING_FORKS: '/api/v1/forking/forks/{session_id}',
    FORKING_LINEAGE: '/api/v1/forking/lineage/{session_id}',

    // Infrastructure
    INFRASTRUCTURE_PROVISION: '/api/v1/infrastructure/provision',
    INFRASTRUCTURE_STATUS: '/api/v1/infrastructure/status',
    APP_PER_USER_PROVISION: '/api/v1/app-per-user/provision',
    APP_PER_USER_STATUS: '/api/v1/app-per-user/status',
    APP_PER_USER_CLEANUP: '/api/v1/app-per-user/cleanup',

    // Health
    HEALTH: '/acs/health',
    HEALTH_COMPREHENSIVE: '/acs/health/comprehensive',
    PING: '/ping',

    // SSE
    SSE_STREAM: '/sse/{session_id}',
    SSE_TEST: '/test/publish/{session_id}',

    // GitHub Integration
    GITHUB_CONNECT_START: '/api/v1/github/connect/start',
    GITHUB_CONNECT_CALLBACK: '/api/v1/github/connect/callback',
    GITHUB_REPOS: '/api/v1/github/repos',
    GITHUB_INSTALLATIONS: '/api/v1/github/installations',
    GITHUB_SET_REPO: '/api/v1/github/set-repo',
    GITHUB_STATUS: '/api/v1/github/status',
    GITHUB_CREATE_PR: '/api/v1/github/create-pr'
} as const;

export const SSE_EVENT_TYPES = {
    CONNECTED: 'connected',
    CHUNK: 'chunk',
    TOKEN: 'token',
    TOOL_CALL: 'tool_call',
    TOOL_RESULT: 'tool_result',
    DONE: 'done',
    ERROR: 'error',
    STATUS: 'status',
    AGENT_STATUS: 'agent_status'
} as const;

export const MODEL_PROVIDERS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    OPENROUTER: 'openrouter',
    GROQ: 'groq'
} as const;
