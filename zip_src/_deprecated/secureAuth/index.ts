// Secure Authentication System
// Main export file for enterprise-grade authentication

// Core types
export type {
  SecureUser,
  AuthTokens,
  CSRFToken,
  AuthSession,
  LoginCredentials,
  RegisterCredentials,
  OAuthProvider,
  AuthConfig,
  AuthError,
  AuthResponse,
  TokenRefreshResponse,
  UserInfoResponse,
  AuthEventType,
  AuthEventListener,
  CookieConfig,
  SecurityHeaders
} from './types';

// Configuration
export { authConfig, cookieConfig, securityHeaders, env } from './config';

// Token management (Adaptive - automatically chooses secure vs dev mode)
export {
  AdaptiveTokenManager as TokenManager,
  isAuthenticated,
  authenticatedFetch,
  login,
  register,
  logout,
  getCurrentUser,
  refreshTokens,
  revokeAllTokens,
  getCSRFToken,
  getSecurityHeaders,
  addEventListener,
  removeEventListener,
  initialize,
  auditSecurity,
  getDevStatus
} from './adaptiveTokenManager';

// Direct access to specific managers if needed
export { SecureTokenManager } from './tokenManager';
export { DevTokenManager } from './devTokenManager';
export { DevMockServer } from './devMockServer';

// OAuth integration
export {
  SupabaseOAuthManager,
  TauriOAuthManager,
  isSupabaseAvailable,
  loginWithGoogle,
  loginWithGitHub,
  handleOAuthCallback,
  getCurrentSupabaseSession,
  signOutFromSupabase,
  onAuthStateChange,
  isTauriEnvironment,
  handleDeepLink,
  setupDeepLinkListener
} from './supabaseIntegration';

// React context and hooks
export { SecureAuthProvider, useSecureAuth } from '../contexts/SecureAuthContext';

// UI components
export { SecureAuthModal } from '../components/auth/SecureAuthModal';

// Utility functions
export const createSecureAuthenticatedFetch = () => {
  return SecureTokenManager.authenticatedFetch.bind(SecureTokenManager);
};

export const createAuthHeaders = () => {
  return SecureTokenManager.getSecurityHeaders();
};

// Migration helpers for existing Orchestra implementation
export const migrateFromOldAuth = () => {
  console.warn('[SecureAuth] Migration from old authentication system');
  
  // Clear old localStorage tokens
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('acs_auth_token');
    localStorage.removeItem('acs_refresh_token');
    localStorage.removeItem('acs_user');
    console.log('[SecureAuth] Cleared old localStorage tokens');
  }
};

// Security audit helpers
export const auditSecuritySettings = () => {
  const audit = {
    httpOnlyCookies: true, // Always true in our implementation
    secureCookies: authConfig.security.secureCookies,
    sameSiteCookies: authConfig.security.sameSite,
    csrfProtection: authConfig.security.csrfEnabled,
    tokenRefreshBuffer: authConfig.security.tokenRefreshBuffer,
    oauthAvailable: SupabaseOAuthManager.isAvailable(),
    tauriEnvironment: TauriOAuthManager.isTauriEnvironment(),
    environment: env.isProduction ? 'production' : 'development'
  };
  
  console.log('[SecureAuth] Security audit:', audit);
  return audit;
};

// Initialize secure authentication system
export const initializeSecureAuth = async () => {
  try {
    console.log('[SecureAuth] Initializing secure authentication system...');
    
    // Migrate from old auth if needed
    migrateFromOldAuth();
    
    // Audit security settings
    auditSecuritySettings();
    
    // Initialize token manager
    const hasValidSession = await SecureTokenManager.initialize();
    
    console.log('[SecureAuth] Initialization complete. Valid session:', hasValidSession);
    return hasValidSession;
  } catch (error) {
    console.error('[SecureAuth] Initialization error:', error);
    return false;
  }
};
