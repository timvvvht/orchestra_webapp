"use strict";
// ACS API Types and Interfaces
// Generated from OpenAPI spec: https://orchestra-acs.fly.dev/openapi.json
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_PROVIDERS = exports.SSE_EVENT_TYPES = exports.ACS_ENDPOINTS = void 0;
// ============================================================================
// CONSTANTS
// ============================================================================
exports.ACS_ENDPOINTS = {
    // Authentication (TODO: Verify these exist in ACS)
    AUTH_REGISTER: '/api/v1/auth/register',
    AUTH_LOGIN: '/api/v1/auth/login',
    // Session Management (CORRECTED to match actual ACS endpoints)
    SESSIONS: '/api/v1/sessions',
    SESSION_DETAILS: '/api/v1/sessions/{session_id}',
    SESSION_DUPLICATE: '/api/v1/sessions/{session_id}/duplicate',
    SESSIONS_CLEANUP: '/api/v1/sessions/cleanup',
    // Core Chat (CORRECT)
    CONVERSE: '/acs/converse',
    // Model API Keys (CORRECTED to match actual ACS endpoints)
    MODEL_KEYS_STORE: '/api/v1/model-api-keys/store',
    MODEL_KEYS_LIST: '/api/v1/model-keys/list',
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
    SSE_TEST: '/test/publish/{session_id}'
};
exports.SSE_EVENT_TYPES = {
    CONNECTED: 'connected',
    CHUNK: 'chunk',
    TOKEN: 'token',
    TOOL_CALL: 'tool_call',
    TOOL_RESULT: 'tool_result',
    DONE: 'done',
    ERROR: 'error',
    STATUS: 'status',
    AGENT_STATUS: 'agent_status'
};
exports.MODEL_PROVIDERS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    OPENROUTER: 'openrouter'
};
