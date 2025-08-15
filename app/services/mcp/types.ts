/**
 * MCP Server Types & Interfaces
 * 
 * Defines TypeScript interfaces for MCP server configuration, status, 
 * tool definitions, and OAuth flows following the Model Context Protocol specification.
 */

import type { ToolSpec } from '@/utils/registerSessionTools';

// Re-export JSON-RPC types for convenience
export type { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from '@/utils/jsonRpcClient';

// ============================================================================
// MCP SERVER CONFIGURATION & STATUS
// ============================================================================

export interface McpServerConfig {
  id: string;
  name: string;
  execPath: string;
  args?: string[]; // Command line arguments
  port?: number; // Auto-assigned if not specified
  env?: Record<string, string>;
  authType: McpAuthType;
  oauthConfig?: McpOAuthConfig;
  enabled: boolean;
  autoStart?: boolean;
  createdAt: number;
  updatedAt: number;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];
}

export enum McpServerStatus {
  STOPPED = 'stopped',
  STARTING = 'starting', 
  RUNNING = 'running',
  ERROR = 'error',
  AUTHENTICATING = 'authenticating',
  STOPPING = 'stopping'
}

export interface McpServerInstance {
  config: McpServerConfig;
  status: McpServerStatus;
  port?: number;
  pid?: number;
  actualPort?: number; // The real port the server is listening on (may differ from config.port)
  startedAt?: number;
  lastHealthCheck?: number;
  healthStatus: 'unknown' | 'healthy' | 'unreachable';
  error?: string;
  tools?: McpToolDefinition[];
  discoveredAt?: number;
}

export type McpAuthType = 'none' | 'oauth' | 'api_key' | 'bearer_token';

// ============================================================================
// MCP TOOL DEFINITIONS (Following MCP Spec)
// ============================================================================

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, McpSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
  };
  // MCP-specific metadata
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    author?: string;
  };
}

export interface McpSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: any[];
  items?: McpSchemaProperty;
  properties?: Record<string, McpSchemaProperty>;
  required?: string[];
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

// ============================================================================
// OAUTH 2.1 + PKCE CONFIGURATION
// ============================================================================

export interface McpOAuthConfig {
  provider: string;
  clientId: string;
  clientSecret?: string; // Optional for PKCE flows
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri?: string;
  additionalParams?: Record<string, string>;
  // PKCE support
  usePKCE: boolean;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface McpOAuthState {
  serverId: string;
  state: string;
  codeVerifier?: string; // For PKCE
  codeChallenge?: string;
  redirectUri: string;
  scopes: string[];
  createdAt: number;
  expiresAt: number;
}

export interface McpOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  expiresAt?: number;
  scope?: string;
  obtainedAt: number;
}

// ============================================================================
// MCP SERVER DISCOVERY & HEALTH
// ============================================================================

export interface McpServerInfo {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  capabilities: McpServerCapabilities;
  authentication?: McpAuthenticationInfo;
}

export interface McpServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

export interface McpAuthenticationInfo {
  type: McpAuthType;
  required: boolean;
  description?: string;
  authorizationUrl?: string;
  scopes?: string[];
}

// ============================================================================
// TOOL CONVERSION UTILITIES
// ============================================================================

/**
 * Convert MCP tool definition to Orchestra ToolSpec format
 */
export function convertMcpToolToSpec(mcpTool: McpToolDefinition, serverId: string): ToolSpec {
  return {
    name: mcpTool.name,
    description: mcpTool.description,
    input_schema: {
      type: mcpTool.inputSchema.type,
      properties: convertMcpProperties(mcpTool.inputSchema.properties),
      required: mcpTool.inputSchema.required || []
    },
    source: `mcp_${serverId}` // Mark as MCP tool with server ID
  };
}

/**
 * Convert MCP schema properties to Orchestra format
 */
function convertMcpProperties(mcpProps: Record<string, McpSchemaProperty>): Record<string, any> {
  const converted: Record<string, any> = {};
  
  for (const [key, prop] of Object.entries(mcpProps)) {
    converted[key] = {
      type: prop.type,
      description: prop.description,
      ...(prop.enum && { enum: prop.enum }),
      ...(prop.default !== undefined && { default: prop.default }),
      ...(prop.minimum !== undefined && { minimum: prop.minimum }),
      ...(prop.maximum !== undefined && { maximum: prop.maximum }),
      ...(prop.minLength !== undefined && { minLength: prop.minLength }),
      ...(prop.maxLength !== undefined && { maxLength: prop.maxLength }),
      ...(prop.pattern && { pattern: prop.pattern }),
      ...(prop.format && { format: prop.format })
    };

    // Handle array items
    if (prop.type === 'array' && prop.items) {
      converted[key].items = {
        type: prop.items.type,
        description: prop.items.description
      };
    }

    // Handle object properties
    if (prop.type === 'object' && prop.properties) {
      converted[key].properties = convertMcpProperties(prop.properties);
      if (prop.required) {
        converted[key].required = prop.required;
      }
    }
  }
  
  return converted;
}

/**
 * Convert multiple MCP tools to ToolSpec array
 */
export function convertMcpToolsToSpecs(tools: McpToolDefinition[], serverId: string): ToolSpec[] {
  return tools.map(tool => convertMcpToolToSpec(tool, serverId));
}

/**
 * Validate MCP tool definition against expected schema
 * Accepts both 'inputSchema' and 'parameters' field names for compatibility
 */
export function validateMcpTool(tool: any): tool is McpToolDefinition {
  const schema = tool.inputSchema || tool.parameters;
  return (
    typeof tool === 'object' &&
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    typeof schema === 'object' &&
    schema.type === 'object' &&
    typeof schema.properties === 'object'
  );
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface McpJsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export class McpError extends Error {
  constructor(
    message: string,
    public code: McpErrorCode,
    public serverId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'McpError';
  }
}

export enum McpErrorCode {
  SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',
  SERVER_START_FAILED = 'SERVER_START_FAILED',
  SERVER_STOP_FAILED = 'SERVER_STOP_FAILED',
  DISCOVERY_FAILED = 'DISCOVERY_FAILED',
  OAUTH_FAILED = 'OAUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOOL_SCHEMA = 'INVALID_TOOL_SCHEMA',
  PORT_CONFLICT = 'PORT_CONFLICT',
  PROCESS_CRASHED = 'PROCESS_CRASHED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT'
}

// ============================================================================
// COMMON PROVIDER PRESETS
// ============================================================================

export const MCP_PROVIDER_PRESETS: Record<string, Partial<McpOAuthConfig>> = {
  notion: {
    provider: 'notion',
    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: ['read_content', 'insert_content', 'update_content'],
    usePKCE: true,
    codeChallengeMethod: 'S256'
  },
  google: {
    provider: 'google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    usePKCE: true,
    codeChallengeMethod: 'S256'
  },
  github: {
    provider: 'github',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user'],
    usePKCE: true,
    codeChallengeMethod: 'S256'
  }
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const MCP_CONSTANTS = {
  DEFAULT_PORT_RANGE: { min: 8000, max: 9000 },
  DISCOVERY_ENDPOINT: '/.well-known/oauth-protected-resource/mcp',
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  TOOL_DISCOVERY_TIMEOUT: 10000, // 10 seconds
  SERVER_START_TIMEOUT: 30000, // 30 seconds
  MAX_SCHEMA_SIZE: 1024 * 50, // 50KB limit for tool schemas
  OAUTH_STATE_EXPIRY: 600000, // 10 minutes
  TOKEN_REFRESH_THRESHOLD: 300000 // 5 minutes before expiry
} as const;

// ============================================================================
// UI FORM DATA TYPES
// ============================================================================

export interface AddServerFormData {
  name: string;
  type: 'npm' | 'docker' | 'custom';
  packageName?: string; // for npm packages
  dockerImage?: string; // for docker images
  execPath?: string; // for custom executables
  args?: string[];
  description?: string;
  tags?: string[];
}