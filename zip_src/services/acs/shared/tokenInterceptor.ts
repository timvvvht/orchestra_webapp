// ACS HTTP Client Token Interceptor
// Automatically handles JWT tokens for all ACS requests

import { JWTTokenManager } from '@/lib/jwtTokenManager';
import type { ACSClient } from './client';

export interface TokenRefreshHandler {
  refreshToken: () => Promise<string>;
  onRefreshFailure: () => void;
}

export class ACSTokenInterceptor {
  private refreshPromise: Promise<string> | null = null;
  
  constructor(
    private client: ACSClient,
    private refreshHandler?: TokenRefreshHandler
  ) {
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }
  
  /**
   * Setup request interceptor to add Authorization header
   */
  private setupRequestInterceptor(): void {
    // Add request interceptor to include auth token
    this.client.addRequestInterceptor(async (config) => {
      const token = JWTTokenManager.getToken();
      
      if (token) {
        // Check if token needs refresh
        if (JWTTokenManager.needsRefresh(token) && this.refreshHandler) {
          try {
            const newToken = await this.getOrRefreshToken();
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${newToken}`
            };
          } catch (error) {
            console.error('[TokenInterceptor] Token refresh failed:', error);
            // Continue with existing token, let response interceptor handle 401
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${token}`
            };
          }
        } else {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`
          };
        }
      }
      
      return config;
    });
  }
  
  /**
   * Setup response interceptor to handle token expiry
   */
  private setupResponseInterceptor(): void {
    this.client.addResponseInterceptor(
      // Success response handler
      (response) => response,
      
      // Error response handler
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 Unauthorized (token expired/invalid)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          if (this.refreshHandler) {
            try {
              console.log('[TokenInterceptor] 401 received, attempting token refresh');
              const newToken = await this.getOrRefreshToken();
              
              // Update the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              
              // Retry the original request
              return this.client.request(originalRequest);
            } catch (refreshError) {
              console.error('[TokenInterceptor] Token refresh failed on 401:', refreshError);
              this.refreshHandler.onRefreshFailure();
              return Promise.reject(error);
            }
          } else {
            // No refresh handler, clear tokens and reject
            console.log('[TokenInterceptor] 401 received, no refresh handler, clearing tokens');
            JWTTokenManager.clearTokens();
            return Promise.reject(error);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Get existing token or refresh if needed (with deduplication)
   */
  private async getOrRefreshToken(): Promise<string> {
    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    const currentToken = JWTTokenManager.getToken();
    
    // If current token is valid and doesn't need refresh, return it
    if (currentToken && !JWTTokenManager.needsRefresh(currentToken)) {
      return currentToken;
    }
    
    // Start refresh process
    if (this.refreshHandler) {
      this.refreshPromise = this.refreshHandler.refreshToken();
      
      try {
        const newToken = await this.refreshPromise;
        this.refreshPromise = null;
        return newToken;
      } catch (error) {
        this.refreshPromise = null;
        throw error;
      }
    }
    
    throw new Error('No refresh handler available');
  }
  
  /**
   * Manually refresh token
   */
  async refreshToken(): Promise<string> {
    if (!this.refreshHandler) {
      throw new Error('No refresh handler configured');
    }
    
    return this.getOrRefreshToken();
  }
  
  /**
   * Clear any pending refresh promises
   */
  clearRefreshPromise(): void {
    this.refreshPromise = null;
  }
}

/**
 * Token refresh strategies
 */
export class TokenRefreshStrategies {
  /**
   * Refresh using refresh token endpoint
   */
  static createRefreshTokenHandler(
    client: ACSClient,
    onLogout: () => void
  ): TokenRefreshHandler {
    return {
      refreshToken: async (): Promise<string> => {
        const refreshToken = JWTTokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        try {
          // Call ACS refresh endpoint (if it exists)
          const response = await client.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken
          });
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          
          // Store new tokens
          JWTTokenManager.storeToken(access_token, newRefreshToken);
          
          console.log('[TokenRefresh] Token refreshed successfully');
          return access_token;
        } catch (error) {
          console.error('[TokenRefresh] Refresh failed:', error);
          throw error;
        }
      },
      
      onRefreshFailure: (): void => {
        console.log('[TokenRefresh] Refresh failed, logging out user');
        JWTTokenManager.clearTokens();
        onLogout();
      }
    };
  }
  
  /**
   * Refresh by re-authenticating (if no refresh token endpoint)
   */
  static createReAuthHandler(
    onReAuthRequired: () => void
  ): TokenRefreshHandler {
    return {
      refreshToken: async (): Promise<string> => {
        throw new Error('Re-authentication required');
      },
      
      onRefreshFailure: (): void => {
        console.log('[TokenRefresh] Re-authentication required');
        JWTTokenManager.clearTokens();
        onReAuthRequired();
      }
    };
  }
}

export default ACSTokenInterceptor;
