// Development Token Manager
// Drop-in replacement for SecureTokenManager that works without backend

import { DevMockServer } from './devMockServer';
import { authConfig } from './config';

/**
 * Development Token Manager
 * Provides the same API as SecureTokenManager but works with mock server
 * Perfect for development and testing without backend dependencies
 */
export class DevTokenManager {
  private static eventListeners: Array<(event: string, data?: any) => void> = [];
  
  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    return DevMockServer.isAuthenticated();
  }
  
  /**
   * Get CSRF token
   */
  static getCSRFToken(): string | null {
    return DevMockServer.getCSRFToken();
  }
  
  /**
   * Get security headers
   */
  static getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json'
    };
    
    const csrfToken = this.getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    return headers;
  }
  
  /**
   * Make authenticated request (mock version)
   */
  static async authenticatedFetch(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    console.log('[DevTokenManager] Mock authenticated fetch:', url);
    
    // Check authentication
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new Error('Not authenticated');
    }
    
    // Add security headers
    const headers = {
      ...this.getSecurityHeaders(),
      ...options.headers
    };
    
    // Simulate the request with mock data
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: 'mock response' }),
      text: async () => 'mock response'
    };
    
    return mockResponse as Response;
  }
  
  /**
   * Refresh tokens
   */
  static async refreshTokens(): Promise<boolean> {
    try {
      const result = await DevMockServer.mockRefresh();
      
      if (result.success) {
        this.emitEvent('token_refresh');
        return true;
      } else {
        console.warn('[DevTokenManager] Token refresh failed:', result.error?.message);
        return false;
      }
    } catch (error) {
      console.error('[DevTokenManager] Token refresh error:', error);
      return false;
    }
  }
  
  /**
   * Login with credentials
   */
  static async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await DevMockServer.mockLogin(email, password);
      
      if (result.success) {
        this.emitEvent('login', result.data);
        return { success: true };
      } else {
        return { success: false, error: result.error?.message || 'Login failed' };
      }
    } catch (error) {
      console.error('[DevTokenManager] Login error:', error);
      return { success: false, error: 'Network error during login' };
    }
  }
  
  /**
   * Register new user
   */
  static async register(
    email: string, 
    password: string, 
    name?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await DevMockServer.mockRegister(email, password, name);
      
      if (result.success) {
        this.emitEvent('login', result.data); // Registration auto-logs in
        return { success: true };
      } else {
        return { success: false, error: result.error?.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('[DevTokenManager] Registration error:', error);
      return { success: false, error: 'Network error during registration' };
    }
  }
  
  /**
   * Logout
   */
  static async logout(): Promise<void> {
    try {
      await DevMockServer.mockLogout();
      this.emitEvent('logout');
    } catch (error) {
      console.error('[DevTokenManager] Logout error:', error);
      this.emitEvent('logout'); // Emit anyway to clear client state
    }
  }
  
  /**
   * Revoke all tokens
   */
  static async revokeAllTokens(): Promise<void> {
    // Same as logout in development
    await this.logout();
  }
  
  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<any | null> {
    try {
      const result = await DevMockServer.mockGetCurrentUser();
      
      if (result.success && result.data) {
        return result.data.user;
      }
      
      return null;
    } catch (error) {
      console.error('[DevTokenManager] Get current user error:', error);
      return null;
    }
  }
  
  /**
   * Add event listener
   */
  static addEventListener(listener: (event: string, data?: any) => void): void {
    this.eventListeners.push(listener);
  }
  
  /**
   * Remove event listener
   */
  static removeEventListener(listener: (event: string, data?: any) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  /**
   * Emit event
   */
  private static emitEvent(event: string, data?: any): void {
    console.log('[DevTokenManager] Event:', event, data);
    this.eventListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[DevTokenManager] Event listener error:', error);
      }
    });
  }
  
  /**
   * Initialize
   */
  static async initialize(): Promise<boolean> {
    try {
      DevMockServer.initialize();
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        this.emitEvent('session_restored');
      }
      
      console.log('[DevTokenManager] Initialized. Authenticated:', isAuth);
      console.log('[DevTokenManager] Mock server status:', DevMockServer.getStatus());
      
      return isAuth;
    } catch (error) {
      console.error('[DevTokenManager] Initialization error:', error);
      return false;
    }
  }
  
  /**
   * Handle OAuth exchange (mock)
   */
  static async handleOAuthExchange(provider: string, userData: any): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const result = await DevMockServer.mockOAuthExchange(provider, userData);
      
      if (result.success && result.data) {
        this.emitEvent('login', result.data);
        return {
          success: true,
          user: result.data.user
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'OAuth exchange failed'
        };
      }
    } catch (error) {
      console.error('[DevTokenManager] OAuth exchange error:', error);
      return {
        success: false,
        error: 'Network error during OAuth exchange'
      };
    }
  }
}

// Export convenience functions with same API as SecureTokenManager
export const {
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
  initialize
} = DevTokenManager;
