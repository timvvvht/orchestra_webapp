// Secure Authentication Types
// Type definitions for enterprise-grade authentication system

export interface SecureUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider?: 'email' | 'google' | 'github';
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface CSRFToken {
  token: string;
  expiresAt: number;
}

export interface AuthSession {
  user: SecureUser;
  tokens: AuthTokens;
  csrfToken: CSRFToken;
  isAuthenticated: boolean;
  sessionId: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface OAuthProvider {
  name: 'google' | 'github';
  clientId: string;
  redirectUri: string;
}

export interface AuthConfig {
  // API endpoints
  baseUrl: string;
  endpoints: {
    login: string;
    register: string;
    refresh: string;
    logout: string;
    me: string;
    revoke: string;
  };
  
  // OAuth providers
  oauth: {
    google?: OAuthProvider;
    github?: OAuthProvider;
  };
  
  // Security settings
  security: {
    tokenRefreshBuffer: number; // milliseconds before expiry to refresh
    maxRetries: number;
    csrfEnabled: boolean;
    secureCookies: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  
  // Supabase integration
  supabase?: {
    url: string;
    anonKey: string;
    enabled: boolean;
  };
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface AuthResponse<T = any> {
  data?: T;
  error?: AuthError;
  success: boolean;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserInfoResponse {
  user: SecureUser;
}

export interface AuthEventType {
  type: 'login' | 'logout' | 'token_refresh' | 'session_expired' | 'error';
  user?: SecureUser;
  error?: AuthError;
  timestamp: number;
}

export type AuthEventListener = (event: AuthEventType) => void;

// Cookie configuration
export interface CookieConfig {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge?: number;
  domain?: string;
  path: string;
}

// Security headers
export interface SecurityHeaders {
  'X-CSRF-Token'?: string;
  'X-Requested-With'?: string;
  'Authorization'?: string;
}
