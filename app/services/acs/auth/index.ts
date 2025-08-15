import React from 'react';
import type { ACSClient } from '../shared/client';
import type {
  UserRegistration,
  UserLogin,
  AuthResponse,
  RequestOptions,
  APIResponse
} from '../shared/types';
import { ACS_ENDPOINTS } from '../shared/types';

/**
 * Authentication service for ACS
 * Handles user registration, login, and token management
 */
export class ACSAuthService {
  constructor(private client: ACSClient) {}

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    options?: RequestOptions
  ): Promise<APIResponse<AuthResponse>> {
    const request: UserRegistration = {
      email,
      password
    };

    return this.client.post<AuthResponse>(
      ACS_ENDPOINTS.AUTH_REGISTER,
      request,
      options
    );
  }

  /**
   * Login user and get authentication token
   */
  async login(
    email: string,
    password: string,
    options?: RequestOptions
  ): Promise<APIResponse<AuthResponse>> {
    const request: UserLogin = {
      email,
      password
    };

    const response = await this.client.post<AuthResponse>(
      ACS_ENDPOINTS.AUTH_LOGIN,
      request,
      options
    );

    // Automatically set the auth token in the client
    // Handle both envelope format {success, data: {access_token}} and direct format {access_token}
    const accessToken = response.data.data?.access_token || response.data.access_token;
    if (accessToken) {
      this.client.setAuthToken(accessToken);
    }

    return response;
  }

  /**
   * Logout user (clear token)
   */
  logout(): void {
    this.client.clearAuthToken();
    
    // Clear from localStorage if it exists
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('acs_auth_token');
      window.localStorage.removeItem('acs_user_info');
    }
  }

  /**
   * Get current user information (requires authentication)
   */
  async getUserInfo(options?: RequestOptions): Promise<APIResponse<any>> {
    return this.client.get('/protected/user-info', options);
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.client.isAuthenticated();
  }

  /**
   * Set authentication token manually
   */
  setAuthToken(token: string): void {
    this.client.setAuthToken(token);
    
    // Store in localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('acs_auth_token', token);
    }
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    // Try to get from localStorage first
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('acs_auth_token');
      if (stored && !this.client.isAuthenticated()) {
        this.client.setAuthToken(stored);
      }
      return stored;
    }
    
    return this.client.isAuthenticated() ? 'token_set' : null;
  }

  /**
   * Restore authentication from localStorage
   */
  restoreAuth(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = window.localStorage.getItem('acs_auth_token');
      if (token) {
        this.client.setAuthToken(token);
        return true;
      }
    }
    return false;
  }

  /**
   * Store user information in localStorage
   */
  storeUserInfo(userInfo: any): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('acs_user_info', JSON.stringify(userInfo));
    }
  }

  /**
   * Get stored user information from localStorage
   */
  getStoredUserInfo(): any | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('acs_user_info');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

/**
 * Authentication utilities and helpers
 */
export class AuthUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract user ID from JWT token (client-side only, not secure)
   */
  static extractUserIdFromToken(token: string): string | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.sub || decoded.user_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if JWT token is expired (client-side only, not secure)
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      const exp = decoded.exp;
      
      if (!exp) return false; // No expiration
      
      const now = Math.floor(Date.now() / 1000);
      return now >= exp;
    } catch {
      return true; // Assume expired if we can't parse
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      const exp = decoded.exp;
      
      if (!exp) return null;
      
      return new Date(exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Format authentication error messages
   */
  static formatAuthError(error: any): string {
    if (error.status_code === 401) {
      return 'Invalid email or password';
    }
    
    if (error.status_code === 409) {
      return 'An account with this email already exists';
    }
    
    if (error.status_code === 422) {
      return 'Please check your email and password format';
    }
    
    if (error.detail) {
      return error.detail;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Authentication failed. Please try again.';
  }
}

/**
 * React hook for authentication (if using React)
 */
export function useAuth(authService: ACSAuthService) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(authService.isAuthenticated());
  const [user, setUser] = React.useState(authService.getStoredUserInfo());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Try to restore authentication on mount
    const restored = authService.restoreAuth();
    if (restored) {
      setIsAuthenticated(true);
      // Optionally fetch fresh user info
      authService.getUserInfo()
        .then(response => {
          setUser(response.data);
          authService.storeUserInfo(response.data);
        })
        .catch(() => {
          // Token might be expired, logout
          authService.logout();
          setIsAuthenticated(false);
          setUser(null);
        });
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(email, password);
      setIsAuthenticated(true);
      setUser(response.data.user);
      authService.storeUserInfo(response.data.user);
      return response;
    } catch (err: any) {
      const errorMessage = AuthUtils.formatAuthError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.register(email, password);
      setIsAuthenticated(true);
      setUser(response.data.user);
      authService.storeUserInfo(response.data.user);
      return response;
    } catch (err: any) {
      const errorMessage = AuthUtils.formatAuthError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  };

  return {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError: () => setError(null)
  };
}

export default ACSAuthService;
