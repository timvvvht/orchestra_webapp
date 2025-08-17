// Secure Authentication Context
// Enterprise-grade authentication context with httpOnly cookies and CSRF protection

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SecureTokenManager } from '@/lib/secureAuth/tokenManager';
import { SupabaseOAuthManager } from '@/lib/secureAuth/supabaseIntegration';
import { SecureUser } from '@/lib/secureAuth/types';
import { getOrSetAnonymousUserId } from '@/lib/authUtils';

interface SecureAuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  user: SecureUser | null;
  isLoading: boolean;
  
  // User ID management (authenticated or anonymous)
  userId: string;
  isAnonymous: boolean;
  
  // Authentication actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  
  // OAuth actions
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithGitHub: () => Promise<{ success: boolean; error?: string }>;
  
  // Security actions
  revokeAllTokens: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  
  // Modal state
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  
  // OAuth availability
  isOAuthAvailable: boolean;
  isTauriEnvironment: boolean;
}

const SecureAuthContext = createContext<SecureAuthContextType | undefined>(undefined);

export const SecureAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const anonymousUserId = getOrSetAnonymousUserId();
  
  // Determine current user ID (authenticated or anonymous)
  const userId = user?.id || anonymousUserId;
  const isAnonymous = !isAuthenticated;
  
  // OAuth availability
  const isOAuthAvailable = SupabaseOAuthManager.isAvailable();
  
  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth();
  }, []);
  
  // Setup auth event listeners
  useEffect(() => {
    const handleAuthEvent = (event: string, data?: any) => {
      switch (event) {
        case 'login':
        case 'session_restored':
          handleAuthSuccess();
          break;
        case 'logout':
        case 'session_expired':
          handleAuthLogout();
          break;
        case 'token_refresh':
          console.log('[SecureAuth] Tokens refreshed successfully');
          break;
        default:
          console.log('[SecureAuth] Auth event:', event, data);
      }
    };
    
    SecureTokenManager.addEventListener(handleAuthEvent);
    
    return () => {
      SecureTokenManager.removeEventListener(handleAuthEvent);
    };
  }, []);
  
  // Setup Tauri deep link listener for OAuth
  useEffect(() => {
    if (isTauriEnvironment && isOAuthAvailable) {
      let unlistenDeepLink: (() => void) | null = null;
      
      const setupTauriOAuth = async () => {
        unlistenDeepLink = await TauriOAuthManager.setupDeepLinkListener(
          (user: SecureUser) => {
            setUser(user);
            setIsAuthenticated(true);
            setShowAuthModal(false);
            console.log('[SecureAuth] Tauri OAuth success:', user.email);
          },
          (error: string) => {
            console.error('[SecureAuth] Tauri OAuth error:', error);
          }
        );
      };
      
      setupTauriOAuth();
      
      return () => {
        if (unlistenDeepLink) {
          unlistenDeepLink();
        }
      };
    }
  }, [isTauriEnvironment, isOAuthAvailable]);
  
  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Initialize token manager and check for existing session
      const hasValidSession = await SecureTokenManager.initialize();
      
      if (hasValidSession) {
        // Get current user information
        const currentUser = await SecureTokenManager.getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          console.log('[SecureAuth] Session restored for user:', currentUser.email);
        }
      }
    } catch (error) {
      console.error('[SecureAuth] Initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = async () => {
    try {
      const currentUser = await SecureTokenManager.getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        setShowAuthModal(false);
        console.log('[SecureAuth] Authentication successful:', currentUser.email);
      }
    } catch (error) {
      console.error('[SecureAuth] Error handling auth success:', error);
    }
  };
  
  /**
   * Handle logout or session expiry
   */
  const handleAuthLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    console.log('[SecureAuth] User logged out or session expired');
  };
  
  /**
   * Login with email and password
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await SecureTokenManager.login(email, password);
      
      if (result.success) {
        // handleAuthSuccess will be called via event listener
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[SecureAuth] Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };
  
  /**
   * Register new user
   */
  const register = async (
    email: string, 
    password: string, 
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await SecureTokenManager.register(email, password, name);
      
      if (result.success) {
        // handleAuthSuccess will be called via event listener
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[SecureAuth] Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };
  
  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    try {
      await SecureTokenManager.logout();
      
      // Also sign out from Supabase if available
      if (isOAuthAvailable) {
        await SupabaseOAuthManager.signOutFromSupabase();
      }
      
      // handleAuthLogout will be called via event listener
    } catch (error) {
      console.error('[SecureAuth] Logout error:', error);
    }
  };
  
  /**
   * Login with Google OAuth
   */
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isOAuthAvailable) {
      return { success: false, error: 'OAuth is not available' };
    }
    
    try {
      return await SupabaseOAuthManager.loginWithGoogle();
    } catch (error) {
      console.error('[SecureAuth] Google login error:', error);
      return { success: false, error: 'Google login failed' };
    }
  };
  
  /**
   * Login with GitHub OAuth
   */
  const loginWithGitHub = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isOAuthAvailable) {
      return { success: false, error: 'OAuth is not available' };
    }
    
    try {
      return await SupabaseOAuthManager.loginWithGitHub();
    } catch (error) {
      console.error('[SecureAuth] GitHub login error:', error);
      return { success: false, error: 'GitHub login failed' };
    }
  };
  
  /**
   * Revoke all tokens for security
   */
  const revokeAllTokens = async (): Promise<void> => {
    try {
      await SecureTokenManager.revokeAllTokens();
      // handleAuthLogout will be called via event listener
    } catch (error) {
      console.error('[SecureAuth] Token revocation error:', error);
    }
  };
  
  /**
   * Manually refresh tokens
   */
  const refreshTokens = async (): Promise<boolean> => {
    try {
      return await SecureTokenManager.refreshTokens();
    } catch (error) {
      console.error('[SecureAuth] Token refresh error:', error);
      return false;
    }
  };
  
  const contextValue: SecureAuthContextType = {
    // Authentication state
    isAuthenticated,
    user,
    isLoading,
    
    // User ID management
    userId,
    isAnonymous,
    
    // Authentication actions
    login,
    register,
    logout,
    
    // OAuth actions
    loginWithGoogle,
    loginWithGitHub,
    
    // Security actions
    revokeAllTokens,
    refreshTokens,
    
    // Modal state
    showAuthModal,
    setShowAuthModal,
    
    // OAuth availability
    isOAuthAvailable,
    isTauriEnvironment
  };
  
  return (
    <SecureAuthContext.Provider value={contextValue}>
      {children}
    </SecureAuthContext.Provider>
  );
};

export const useSecureAuth = (): SecureAuthContextType => {
  const context = useContext(SecureAuthContext);
  if (context === undefined) {
    throw new Error('useSecureAuth must be used within a SecureAuthProvider');
  }
  return context;
};

export default SecureAuthContext;
