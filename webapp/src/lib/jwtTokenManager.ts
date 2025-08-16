// JWT Token Manager
// Comprehensive JWT token handling for ACS authentication

// Simple JWT decode implementation for webapp
function jwtDecode<T = any>(token: string): T {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }
    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodedPayload) as T;
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface JWTPayload {
  sub: string; // Subject (user ID)
  email: string;
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  iss?: string; // Issuer
  aud?: string; // Audience
}

interface TokenInfo {
  token: string;
  payload: JWTPayload;
  expiresAt: Date;
  isExpired: boolean;
  timeUntilExpiry: number; // milliseconds
}

export class JWTTokenManager {
  private static readonly TOKEN_KEY = 'acs_auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'acs_refresh_token';
  private static readonly USER_KEY = 'acs_user';
  
  // Token expiry buffer (refresh 5 minutes before expiry)
  private static readonly EXPIRY_BUFFER_MS = 5 * 60 * 1000;
  
  /**
   * Check if localStorage is available
   */
  private static hasStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }
  
  /**
   * Store JWT token securely
   */
  static storeToken(token: string, refreshToken?: string): void {
    try {
      // Validate token before storing
      const tokenInfo = this.parseToken(token);
      if (tokenInfo.isExpired) {
        throw new Error('Cannot store expired token');
      }
      
      // Store in localStorage (consider httpOnly cookies for production)
      if (this.hasStorage()) {
        localStorage.setItem(this.TOKEN_KEY, token);
        
        if (refreshToken) {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        }
      }
      
      console.log('[JWTTokenManager] Token stored successfully, expires at:', tokenInfo.expiresAt);
    } catch (error) {
      console.error('[JWTTokenManager] Failed to store token:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve stored JWT token
   */
  static getToken(): string | null {
    try {
      if (!this.hasStorage()) return null;
      
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (!token) return null;
      
      // Validate token is not expired
      const tokenInfo = this.parseToken(token);
      if (tokenInfo.isExpired) {
        console.log('[JWTTokenManager] Stored token is expired, removing');
        this.clearTokens();
        return null;
      }
      
      return token;
    } catch (error) {
      console.error('[JWTTokenManager] Error retrieving token:', error);
      this.clearTokens();
      return null;
    }
  }
  
  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    if (!this.hasStorage()) return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
  
  /**
   * Parse JWT token and extract information
   */
  static parseToken(token: string): TokenInfo {
    try {
      const payload = jwtDecode<JWTPayload>(token);
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();
      const isExpired = now >= expiresAt;
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      return {
        token,
        payload,
        expiresAt,
        isExpired,
        timeUntilExpiry
      };
    } catch (error) {
      throw new Error(`Invalid JWT token: ${error}`);
    }
  }
  
  /**
   * Check if token needs refresh (within buffer time)
   */
  static needsRefresh(token?: string): boolean {
    try {
      const tokenToCheck = token || this.getToken();
      if (!tokenToCheck) return true;
      
      const tokenInfo = this.parseToken(tokenToCheck);
      return tokenInfo.timeUntilExpiry <= this.EXPIRY_BUFFER_MS;
    } catch (error) {
      return true;
    }
  }
  
  /**
   * Get user information from token
   */
  static getUserFromToken(token?: string): JWTPayload | null {
    try {
      const tokenToCheck = token || this.getToken();
      if (!tokenToCheck) return null;
      
      const tokenInfo = this.parseToken(tokenToCheck);
      return tokenInfo.payload;
    } catch (error) {
      console.error('[JWTTokenManager] Error extracting user from token:', error);
      return null;
    }
  }
  
  /**
   * Store user information
   */
  static storeUser(user: any): void {
    if (this.hasStorage()) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }
  
  /**
   * Get stored user information
   */
  static getStoredUser(): any | null {
    try {
      if (!this.hasStorage()) return null;
      
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('[JWTTokenManager] Error parsing stored user:', error);
      return null;
    }
  }
  
  /**
   * Clear all stored tokens and user data
   */
  static clearTokens(): void {
    if (this.hasStorage()) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    console.log('[JWTTokenManager] All tokens and user data cleared');
  }
  
  /**
   * Get Authorization header value
   */
  static getAuthHeader(): string | null {
    const token = this.getToken();
    return token ? `Bearer ${token}` : null;
  }
  
  /**
   * Check if user is authenticated (has valid token)
   */
  static isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
  
  /**
   * Get token expiry information for UI display
   */
  static getTokenExpiryInfo(): {
    expiresAt: Date | null;
    timeUntilExpiry: number | null;
    needsRefresh: boolean;
  } {
    try {
      const token = this.getToken();
      if (!token) {
        return {
          expiresAt: null,
          timeUntilExpiry: null,
          needsRefresh: false
        };
      }
      
      const tokenInfo = this.parseToken(token);
      return {
        expiresAt: tokenInfo.expiresAt,
        timeUntilExpiry: tokenInfo.timeUntilExpiry,
        needsRefresh: this.needsRefresh(token)
      };
    } catch (error) {
      return {
        expiresAt: null,
        timeUntilExpiry: null,
        needsRefresh: true
      };
    }
  }
  
  /**
   * Format time until expiry for display
   */
  static formatTimeUntilExpiry(timeMs: number): string {
    if (timeMs <= 0) return 'Expired';
    
    const minutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }
}

// Export convenience functions
export const {
  storeToken,
  getToken,
  getRefreshToken,
  parseToken,
  needsRefresh,
  getUserFromToken,
  storeUser,
  getStoredUser,
  clearTokens,
  getAuthHeader,
  isAuthenticated,
  getTokenExpiryInfo,
  formatTimeUntilExpiry
} = JWTTokenManager;
