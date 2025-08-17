// Secure Token Manager
// Enterprise-grade token management with httpOnly cookies and CSRF protection

import { AuthTokens, CSRFToken, AuthError } from './types';
import { authConfig, cookieConfig } from './config';

/**
 * Secure Token Manager
 * Handles JWT tokens using httpOnly cookies instead of localStorage
 * Implements CSRF protection and automatic token refresh
 */
export class SecureTokenManager {
  private static refreshPromise: Promise<boolean> | null = null;
  private static eventListeners: Array<(event: string, data?: any) => void> = [];
  
  /**
   * Check if user is authenticated (has valid access token)
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      // Check if access token exists and is valid
      const response = await fetch(`${authConfig.baseUrl}${authConfig.endpoints.me}`, {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('[SecureTokenManager] Error checking authentication:', error);
      return false;
    }
  }
  
  /**
   * Get CSRF token from cookie
   */
  static getCSRFToken(): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${cookieConfig.csrfToken.name}=`)
    );
    
    if (csrfCookie) {
      return csrfCookie.split('=')[1];
    }
    
    return null;
  }
  
  /**
   * Get security headers including CSRF token
   */
  static getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json'
    };
    
    if (authConfig.security.csrfEnabled) {
      const csrfToken = this.getCSRFToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    return headers;
  }
  
  /**
   * Make authenticated request with automatic token refresh
   */
  static async authenticatedFetch(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = {
      ...this.getSecurityHeaders(),
      ...options.headers
    };
    
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include', // Include httpOnly cookies
      headers
    };
    
    try {
      let response = await fetch(url, requestOptions);
      
      // If unauthorized, try to refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshTokens();
        
        if (refreshed) {
          // Retry the original request
          response = await fetch(url, requestOptions);
        } else {
          // Refresh failed, user needs to re-authenticate
          this.emitEvent('session_expired');
          throw new Error('Session expired. Please log in again.');
        }
      }
      
      return response;
    } catch (error) {
      console.error('[SecureTokenManager] Authenticated fetch error:', error);
      throw error;
    }
  }
  
  /**
   * Refresh access token using refresh token
   */
  static async refreshTokens(): Promise<boolean> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = this._performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  /**
   * Internal token refresh implementation
   */
  private static async _performTokenRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${authConfig.baseUrl}${authConfig.endpoints.refresh}`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getSecurityHeaders()
      });
      
      if (response.ok) {
        this.emitEvent('token_refresh');
        return true;
      } else {
        console.warn('[SecureTokenManager] Token refresh failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('[SecureTokenManager] Token refresh error:', error);
      return false;
    }
  }
  
  /**
   * Login with credentials
   */
  static async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${authConfig.baseUrl}${authConfig.endpoints.login}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        this.emitEvent('login');
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        return { success: false, error: errorData.message || 'Login failed' };
      }
    } catch (error) {
      console.error('[SecureTokenManager] Login error:', error);
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
      const response = await fetch(`${authConfig.baseUrl}${authConfig.endpoints.register}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ email, password, name })
      });
      
      if (response.ok) {
        this.emitEvent('login'); // Registration automatically logs in
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
        return { success: false, error: errorData.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('[SecureTokenManager] Registration error:', error);
      return { success: false, error: 'Network error during registration' };
    }
  }
  
  /**
   * Logout and clear all tokens
   */
  static async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate server-side session
      await fetch(`${authConfig.baseUrl}${authConfig.endpoints.logout}`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getSecurityHeaders()
      });
    } catch (error) {
      console.error('[SecureTokenManager] Logout error:', error);
    } finally {
      // Clear client-side state
      this.clearClientState();
      this.emitEvent('logout');
    }
  }
  
  /**
   * Revoke all tokens for security purposes
   */
  static async revokeAllTokens(): Promise<void> {
    try {
      await fetch(`${authConfig.baseUrl}${authConfig.endpoints.revoke}`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getSecurityHeaders()
      });
    } catch (error) {
      console.error('[SecureTokenManager] Token revocation error:', error);
    } finally {
      this.clearClientState();
      this.emitEvent('logout');
    }
  }
  
  /**
   * Get current user information
   */
  static async getCurrentUser(): Promise<any | null> {
    try {
      const response = await this.authenticatedFetch(
        `${authConfig.baseUrl}${authConfig.endpoints.me}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.user || data;
      }
      
      return null;
    } catch (error) {
      console.error('[SecureTokenManager] Get current user error:', error);
      return null;
    }
  }
  
  /**
   * Clear client-side state (for logout)
   */
  private static clearClientState(): void {
    // Clear any client-side caches or state
    // Note: httpOnly cookies are cleared by the server
    if (typeof window !== 'undefined') {
      // Clear any localStorage items that might exist from old implementation
      localStorage.removeItem('acs_auth_token');
      localStorage.removeItem('acs_refresh_token');
      localStorage.removeItem('acs_user');
    }
  }
  
  /**
   * Add event listener for auth events
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
   * Emit auth event to all listeners
   */
  private static emitEvent(event: string, data?: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[SecureTokenManager] Event listener error:', error);
      }
    });
  }
  
  /**
   * Initialize token manager (check for existing session)
   */
  static async initialize(): Promise<boolean> {
    try {
      const isAuth = await this.isAuthenticated();
      if (isAuth) {
        this.emitEvent('session_restored');
      }
      return isAuth;
    } catch (error) {
      console.error('[SecureTokenManager] Initialization error:', error);
      return false;
    }
  }
}

// Export convenience functions
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
} = SecureTokenManager;
