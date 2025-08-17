// Development Mock Server
// Simulates secure authentication endpoints for development and testing

import { SecureUser, AuthResponse, TokenRefreshResponse } from './types';

/**
 * Development Mock Server
 * Simulates all secure authentication endpoints for immediate testing
 * Uses localStorage in development but with secure patterns
 */
export class DevMockServer {
  private static readonly DEV_TOKEN_KEY = 'dev_mock_access_token';
  private static readonly DEV_REFRESH_KEY = 'dev_mock_refresh_token';
  private static readonly DEV_USER_KEY = 'dev_mock_user';
  private static readonly DEV_CSRF_KEY = 'dev_mock_csrf_token';
  
  private static users: Map<string, { email: string; password: string; user: SecureUser }> = new Map();
  private static sessions: Map<string, { userId: string; expiresAt: number }> = new Map();
  
  /**
   * Initialize mock server with default users
   */
  static initialize() {
    console.log('[DevMockServer] Initializing development mock server');
    
    // Add default test users
    this.addTestUser('test@orchestra.dev', 'password123', {
      id: 'user-test-1',
      email: 'test@orchestra.dev',
      name: 'Test User',
      provider: 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    this.addTestUser('admin@orchestra.dev', 'admin123', {
      id: 'user-admin-1',
      email: 'admin@orchestra.dev',
      name: 'Admin User',
      provider: 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Generate initial CSRF token
    this.generateCSRFToken();
  }
  
  /**
   * Add test user
   */
  static addTestUser(email: string, password: string, user: SecureUser) {
    this.users.set(email, { email, password, user });
  }
  
  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    const token = 'csrf-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(this.DEV_CSRF_KEY, token);
    
    // Simulate setting CSRF cookie
    document.cookie = `orch_csrf_token=${token}; path=/; SameSite=Lax`;
    
    return token;
  }
  
  /**
   * Get CSRF token
   */
  static getCSRFToken(): string | null {
    return localStorage.getItem(this.DEV_CSRF_KEY);
  }
  
  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string): boolean {
    const storedToken = this.getCSRFToken();
    return storedToken === token;
  }
  
  /**
   * Generate JWT-like token
   */
  static generateToken(userId: string, expiresIn: number = 15 * 60 * 1000): string {
    const payload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + expiresIn) / 1000)
    };
    
    // Simple base64 encoding for development
    return 'dev.' + btoa(JSON.stringify(payload)) + '.mock';
  }
  
  /**
   * Parse development token
   */
  static parseToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts[0] !== 'dev' || parts[2] !== 'mock') {
        throw new Error('Invalid development token');
      }
      return JSON.parse(atob(parts[1]));
    } catch {
      throw new Error('Invalid token format');
    }
  }
  
  /**
   * Mock login endpoint
   */
  static async mockLogin(email: string, password: string): Promise<AuthResponse> {
    await this.simulateNetworkDelay();
    
    const userData = this.users.get(email);
    
    if (!userData || userData.password !== password) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      };
    }
    
    const accessToken = this.generateToken(userData.user.id, 15 * 60 * 1000); // 15 minutes
    const refreshToken = this.generateToken(userData.user.id, 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store tokens (simulating httpOnly cookies)
    localStorage.setItem(this.DEV_TOKEN_KEY, accessToken);
    localStorage.setItem(this.DEV_REFRESH_KEY, refreshToken);
    localStorage.setItem(this.DEV_USER_KEY, JSON.stringify(userData.user));
    
    // Simulate setting httpOnly cookies
    document.cookie = `orch_access_token=${accessToken}; path=/; HttpOnly; SameSite=Lax`;
    document.cookie = `orch_refresh_token=${refreshToken}; path=/; HttpOnly; SameSite=Lax`;
    
    console.log('[DevMockServer] Login successful:', userData.user.email);
    
    return {
      success: true,
      data: {
        user: userData.user,
        access_token: accessToken
      }
    };
  }
  
  /**
   * Mock register endpoint
   */
  static async mockRegister(email: string, password: string, name?: string): Promise<AuthResponse> {
    await this.simulateNetworkDelay();
    
    if (this.users.has(email)) {
      return {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered'
        }
      };
    }
    
    const user: SecureUser = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      email,
      name: name || email.split('@')[0],
      provider: 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.addTestUser(email, password, user);
    
    // Auto-login after registration
    return this.mockLogin(email, password);
  }
  
  /**
   * Mock refresh endpoint
   */
  static async mockRefresh(): Promise<AuthResponse<TokenRefreshResponse>> {
    await this.simulateNetworkDelay();
    
    const refreshToken = localStorage.getItem(this.DEV_REFRESH_KEY);
    
    if (!refreshToken) {
      return {
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token found'
        }
      };
    }
    
    try {
      const payload = this.parseToken(refreshToken);
      
      if (payload.exp * 1000 < Date.now()) {
        return {
          success: false,
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
            message: 'Refresh token expired'
          }
        };
      }
      
      // Generate new tokens (token rotation)
      const newAccessToken = this.generateToken(payload.sub, 15 * 60 * 1000);
      const newRefreshToken = this.generateToken(payload.sub, 7 * 24 * 60 * 60 * 1000);
      
      // Store new tokens
      localStorage.setItem(this.DEV_TOKEN_KEY, newAccessToken);
      localStorage.setItem(this.DEV_REFRESH_KEY, newRefreshToken);
      
      console.log('[DevMockServer] Tokens refreshed successfully');
      
      return {
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt: Date.now() + 15 * 60 * 1000
        }
      };
    } catch {
      return {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token'
        }
      };
    }
  }
  
  /**
   * Mock logout endpoint
   */
  static async mockLogout(): Promise<AuthResponse> {
    await this.simulateNetworkDelay();
    
    // Clear all tokens
    localStorage.removeItem(this.DEV_TOKEN_KEY);
    localStorage.removeItem(this.DEV_REFRESH_KEY);
    localStorage.removeItem(this.DEV_USER_KEY);
    
    // Clear cookies
    document.cookie = 'orch_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'orch_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    console.log('[DevMockServer] Logout successful');
    
    return { success: true };
  }
  
  /**
   * Mock get current user endpoint
   */
  static async mockGetCurrentUser(): Promise<AuthResponse<{ user: SecureUser }>> {
    await this.simulateNetworkDelay();
    
    const token = localStorage.getItem(this.DEV_TOKEN_KEY);
    
    if (!token) {
      return {
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No access token found'
        }
      };
    }
    
    try {
      const payload = this.parseToken(token);
      
      if (payload.exp * 1000 < Date.now()) {
        return {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token expired'
          }
        };
      }
      
      const userStr = localStorage.getItem(this.DEV_USER_KEY);
      if (!userStr) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User data not found'
          }
        };
      }
      
      const user = JSON.parse(userStr);
      
      return {
        success: true,
        data: { user }
      };
    } catch {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      };
    }
  }
  
  /**
   * Mock OAuth exchange endpoint
   */
  static async mockOAuthExchange(provider: string, userData: any): Promise<AuthResponse> {
    await this.simulateNetworkDelay();
    
    const user: SecureUser = {
      id: 'oauth-' + Math.random().toString(36).substr(2, 9),
      email: userData.email,
      name: userData.name || userData.email,
      avatar: userData.avatar,
      provider: provider as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Store OAuth user
    this.addTestUser(userData.email, 'oauth-password', user);
    
    // Generate tokens
    const accessToken = this.generateToken(user.id, 15 * 60 * 1000);
    const refreshToken = this.generateToken(user.id, 7 * 24 * 60 * 60 * 1000);
    
    // Store tokens
    localStorage.setItem(this.DEV_TOKEN_KEY, accessToken);
    localStorage.setItem(this.DEV_REFRESH_KEY, refreshToken);
    localStorage.setItem(this.DEV_USER_KEY, JSON.stringify(user));
    
    console.log('[DevMockServer] OAuth exchange successful:', user.email);
    
    return {
      success: true,
      data: {
        user,
        access_token: accessToken
      }
    };
  }
  
  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem(this.DEV_TOKEN_KEY);
    
    if (!token) return false;
    
    try {
      const payload = this.parseToken(token);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
  
  /**
   * Simulate network delay
   */
  private static async simulateNetworkDelay(min: number = 100, max: number = 500): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Get development status
   */
  static getStatus() {
    return {
      isInitialized: this.users.size > 0,
      userCount: this.users.size,
      isAuthenticated: this.isAuthenticated(),
      hasCSRFToken: !!this.getCSRFToken(),
      registeredUsers: Array.from(this.users.keys())
    };
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  DevMockServer.initialize();
}
