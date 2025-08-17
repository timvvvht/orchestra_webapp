// Adaptive Token Manager
// Automatically switches between secure and development modes

import { SecureTokenManager } from './tokenManager';
import { DevTokenManager } from './devTokenManager';
import { authConfig } from './config';

/**
 * Adaptive Token Manager
 * Automatically chooses between SecureTokenManager (production) and DevTokenManager (development)
 * Provides seamless development experience while maintaining production security
 */
export class AdaptiveTokenManager {
  private static isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' || 
           process.env.VITE_AUTH_DEV_MODE === 'true' ||
           !authConfig.baseUrl.includes('https://'); // Assume dev if not HTTPS
  }
  
  private static getActiveManager() {
    return this.isDevelopmentMode() ? DevTokenManager : SecureTokenManager;
  }
  
  private static logModeInfo() {
    const mode = this.isDevelopmentMode() ? 'DEVELOPMENT' : 'PRODUCTION';
    const manager = this.isDevelopmentMode() ? 'DevTokenManager' : 'SecureTokenManager';
    
    console.log(`[AdaptiveTokenManager] Running in ${mode} mode using ${manager}`);
    
    if (this.isDevelopmentMode()) {
      console.log('[AdaptiveTokenManager] 🚧 Development mode features:');
      console.log('  • Mock authentication server');
      console.log('  • localStorage token storage (with security warnings)');
      console.log('  • Pre-configured test users');
      console.log('  • Simulated network delays');
      console.log('  • CSRF token simulation');
      console.log('');
      console.log('📧 Test users available:');
      console.log('  • test@orchestra.dev / password123');
      console.log('  • admin@orchestra.dev / admin123');
    } else {
      console.log('[AdaptiveTokenManager] 🔒 Production mode features:');
      console.log('  • httpOnly cookie storage');
      console.log('  • Real CSRF protection');
      console.log('  • Token rotation');
      console.log('  • Server-side validation');
    }
  }
  
  // Proxy all methods to the active manager
  static async isAuthenticated(): Promise<boolean> {
    return this.getActiveManager().isAuthenticated();
  }
  
  static getCSRFToken(): string | null {
    return this.getActiveManager().getCSRFToken();
  }
  
  static getSecurityHeaders(): Record<string, string> {
    return this.getActiveManager().getSecurityHeaders();
  }
  
  static async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    return this.getActiveManager().authenticatedFetch(url, options);
  }
  
  static async refreshTokens(): Promise<boolean> {
    return this.getActiveManager().refreshTokens();
  }
  
  static async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    return this.getActiveManager().login(email, password);
  }
  
  static async register(email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
    return this.getActiveManager().register(email, password, name);
  }
  
  static async logout(): Promise<void> {
    return this.getActiveManager().logout();
  }
  
  static async revokeAllTokens(): Promise<void> {
    return this.getActiveManager().revokeAllTokens();
  }
  
  static async getCurrentUser(): Promise<any | null> {
    return this.getActiveManager().getCurrentUser();
  }
  
  static addEventListener(listener: (event: string, data?: any) => void): void {
    return this.getActiveManager().addEventListener(listener);
  }
  
  static removeEventListener(listener: (event: string, data?: any) => void): void {
    return this.getActiveManager().removeEventListener(listener);
  }
  
  static async initialize(): Promise<boolean> {
    this.logModeInfo();
    return this.getActiveManager().initialize();
  }
  
  // Development-specific methods
  static getDevStatus() {
    if (this.isDevelopmentMode() && 'getStatus' in DevTokenManager) {
      return (DevTokenManager as any).getStatus();
    }
    return null;
  }
  
  static async handleOAuthExchange(provider: string, userData: any) {
    if (this.isDevelopmentMode() && 'handleOAuthExchange' in DevTokenManager) {
      return (DevTokenManager as any).handleOAuthExchange(provider, userData);
    }
    throw new Error('OAuth exchange not available in production mode');
  }
  
  // Security audit that works in both modes
  static auditSecurity() {
    const mode = this.isDevelopmentMode() ? 'development' : 'production';
    const manager = this.isDevelopmentMode() ? 'DevTokenManager' : 'SecureTokenManager';
    
    const audit = {
      mode,
      manager,
      httpOnlyCookies: !this.isDevelopmentMode(), // Only true in production
      secureCookies: authConfig.security.secureCookies,
      sameSiteCookies: authConfig.security.sameSite,
      csrfProtection: authConfig.security.csrfEnabled,
      tokenRefreshBuffer: authConfig.security.tokenRefreshBuffer,
      environment: process.env.NODE_ENV,
      baseUrl: authConfig.baseUrl,
      warnings: [] as string[]
    };
    
    // Add warnings for development mode
    if (this.isDevelopmentMode()) {
      audit.warnings.push('Running in development mode - security features are simulated');
      audit.warnings.push('Tokens stored in localStorage (not secure for production)');
      audit.warnings.push('Mock authentication server in use');
      audit.warnings.push('Switch to production mode for real security');
    }
    
    console.log('[AdaptiveTokenManager] Security audit:', audit);
    return audit;
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
} = AdaptiveTokenManager;

// Export additional functions
export const {
  getDevStatus,
  handleOAuthExchange,
  auditSecurity
} = AdaptiveTokenManager;
