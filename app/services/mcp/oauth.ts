/**
 * MCP OAuth Service
 * 
 * Handles OAuth 2.1 + PKCE flows for MCP server authentication.
 * Supports secure authorization with state management and token refresh.
 */

import { 
  McpOAuthConfig, 
  McpOAuthState, 
  McpOAuthTokens, 
  McpError, 
  McpErrorCode,
  MCP_PROVIDER_PRESETS,
  MCP_CONSTANTS
} from './types';

// ============================================================================
// OAUTH STATE MANAGEMENT
// ============================================================================

class McpOAuthStateManager {
  private states: Map<string, McpOAuthState> = new Map();
  private tokens: Map<string, McpOAuthTokens> = new Map();

  /**
   * Store OAuth state for a server
   */
  public storeState(state: McpOAuthState): void {
    this.states.set(state.serverId, state);
    
    // Clean up expired states
    this.cleanupExpiredStates();
  }

  /**
   * Get OAuth state for a server
   */
  public getState(serverId: string): McpOAuthState | undefined {
    const state = this.states.get(serverId);
    
    // Check if state is expired
    if (state && Date.now() > state.expiresAt) {
      this.states.delete(serverId);
      return undefined;
    }
    
    return state;
  }

  /**
   * Remove OAuth state for a server
   */
  public removeState(serverId: string): void {
    this.states.delete(serverId);
  }

  /**
   * Store tokens for a server
   */
  public storeTokens(serverId: string, tokens: McpOAuthTokens): void {
    this.tokens.set(serverId, tokens);
  }

  /**
   * Get tokens for a server
   */
  public getTokens(serverId: string): McpOAuthTokens | undefined {
    const tokens = this.tokens.get(serverId);
    
    // Check if tokens are expired
    if (tokens && tokens.expiresAt && Date.now() > tokens.expiresAt) {
      // Try to refresh if we have a refresh token
      if (tokens.refreshToken) {
        // Mark for refresh but don't remove yet
        return tokens;
      } else {
        // Remove expired tokens without refresh capability
        this.tokens.delete(serverId);
        return undefined;
      }
    }
    
    return tokens;
  }

  /**
   * Remove tokens for a server
   */
  public removeTokens(serverId: string): void {
    this.tokens.delete(serverId);
  }

  /**
   * Check if tokens need refresh
   */
  public needsRefresh(serverId: string): boolean {
    const tokens = this.tokens.get(serverId);
    if (!tokens || !tokens.expiresAt) return false;
    
    // Refresh if within threshold of expiry
    return Date.now() > (tokens.expiresAt - MCP_CONSTANTS.TOKEN_REFRESH_THRESHOLD);
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [serverId, state] of this.states.entries()) {
      if (now > state.expiresAt) {
        this.states.delete(serverId);
      }
    }
  }
}

// ============================================================================
// PKCE UTILITIES
// ============================================================================

class PKCEUtils {
  /**
   * Generate a cryptographically secure random string
   */
  public static generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Generate PKCE code verifier
   */
  public static generateCodeVerifier(): string {
    return this.generateRandomString(128);
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  public static async generateCodeChallenge(verifier: string, method: 'S256' | 'plain' = 'S256'): Promise<string> {
    if (method === 'plain') {
      return verifier;
    }

    // S256 method
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to base64url
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate OAuth state parameter
   */
  public static generateState(): string {
    return this.generateRandomString(32);
  }
}

// ============================================================================
// MCP OAUTH SERVICE
// ============================================================================

export class McpOAuthService {
  private static instance: McpOAuthService;
  private stateManager = new McpOAuthStateManager();

  private constructor() {}

  public static getInstance(): McpOAuthService {
    if (!McpOAuthService.instance) {
      McpOAuthService.instance = new McpOAuthService();
    }
    return McpOAuthService.instance;
  }

  // ============================================================================
  // AUTHORIZATION FLOW
  // ============================================================================

  /**
   * Start OAuth authorization flow
   */
  public async startAuthorizationFlow(
    serverId: string, 
    config: McpOAuthConfig
  ): Promise<{ authorizationUrl: string; state: string }> {
    try {
      console.log(`🔐 [OAuth] Starting authorization flow for server: ${serverId}`);

      // Generate state and PKCE parameters
      const state = PKCEUtils.generateState();
      let codeVerifier: string | undefined;
      let codeChallenge: string | undefined;

      if (config.usePKCE) {
        codeVerifier = PKCEUtils.generateCodeVerifier();
        codeChallenge = await PKCEUtils.generateCodeChallenge(
          codeVerifier, 
          config.codeChallengeMethod || 'S256'
        );
      }

      // Determine redirect URI
      const redirectUri = config.redirectUri || this.getDefaultRedirectUri();

      // Store OAuth state
      const oauthState: McpOAuthState = {
        serverId,
        state,
        codeVerifier,
        codeChallenge,
        redirectUri,
        scopes: config.scopes,
        createdAt: Date.now(),
        expiresAt: Date.now() + MCP_CONSTANTS.OAUTH_STATE_EXPIRY
      };

      this.stateManager.storeState(oauthState);

      // Build authorization URL
      const authUrl = new URL(config.authorizationUrl);
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: redirectUri,
        scope: config.scopes.join(' '),
        state: state
      });

      // Add PKCE parameters
      if (config.usePKCE && codeChallenge) {
        params.append('code_challenge', codeChallenge);
        params.append('code_challenge_method', config.codeChallengeMethod || 'S256');
      }

      // Add additional parameters
      if (config.additionalParams) {
        for (const [key, value] of Object.entries(config.additionalParams)) {
          params.append(key, value);
        }
      }

      authUrl.search = params.toString();
      const authorizationUrl = authUrl.toString();

      console.log(`✅ [OAuth] Authorization URL generated for server ${serverId}`);
      return { authorizationUrl, state };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [OAuth] Failed to start authorization flow for server ${serverId}:`, errorMessage);
      
      throw new McpError(
        `Failed to start OAuth flow for server ${serverId}: ${errorMessage}`,
        McpErrorCode.OAUTH_FAILED,
        serverId,
        error
      );
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  public async handleCallback(
    callbackUrl: string,
    config: McpOAuthConfig
  ): Promise<{ serverId: string; tokens: McpOAuthTokens }> {
    try {
      console.log(`🔐 [OAuth] Handling callback: ${callbackUrl}`);

      // Parse callback URL
      const url = new URL(callbackUrl);
      const params = new URLSearchParams(url.search);
      
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Check for OAuth errors
      if (error) {
        throw new Error(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter');
      }

      // Find matching OAuth state
      let matchingState: McpOAuthState | undefined;
      let serverId: string | undefined;

      for (const [id, storedState] of this.stateManager['states'].entries()) {
        if (storedState.state === state) {
          matchingState = storedState;
          serverId = id;
          break;
        }
      }

      if (!matchingState || !serverId) {
        throw new Error('Invalid or expired OAuth state');
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code, matchingState, config);

      // Store tokens
      this.stateManager.storeTokens(serverId, tokens);

      // Clean up state
      this.stateManager.removeState(serverId);

      console.log(`✅ [OAuth] Successfully obtained tokens for server ${serverId}`);
      return { serverId, tokens };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [OAuth] Callback handling failed:`, errorMessage);
      
      throw new McpError(
        `OAuth callback failed: ${errorMessage}`,
        McpErrorCode.OAUTH_FAILED,
        undefined,
        error
      );
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(serverId: string, config: McpOAuthConfig): Promise<McpOAuthTokens> {
    try {
      console.log(`🔄 [OAuth] Refreshing token for server: ${serverId}`);

      const currentTokens = this.stateManager.getTokens(serverId);
      if (!currentTokens || !currentTokens.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: currentTokens.refreshToken,
          client_id: config.clientId,
          ...(config.clientSecret && { client_secret: config.clientSecret })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      
      const newTokens: McpOAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || currentTokens.refreshToken,
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        scope: tokenData.scope,
        obtainedAt: Date.now()
      };

      // Store updated tokens
      this.stateManager.storeTokens(serverId, newTokens);

      console.log(`✅ [OAuth] Token refreshed successfully for server ${serverId}`);
      return newTokens;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [OAuth] Token refresh failed for server ${serverId}:`, errorMessage);
      
      // Remove invalid tokens
      this.stateManager.removeTokens(serverId);
      
      throw new McpError(
        `Token refresh failed for server ${serverId}: ${errorMessage}`,
        McpErrorCode.TOKEN_EXPIRED,
        serverId,
        error
      );
    }
  }

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Get valid access token for a server
   */
  public async getValidToken(serverId: string, config: McpOAuthConfig): Promise<string | null> {
    try {
      const tokens = this.stateManager.getTokens(serverId);
      if (!tokens) {
        return null;
      }

      // Check if token needs refresh
      if (this.stateManager.needsRefresh(serverId)) {
        const refreshedTokens = await this.refreshToken(serverId, config);
        return refreshedTokens.accessToken;
      }

      return tokens.accessToken;

    } catch (error) {
      console.error(`Failed to get valid token for server ${serverId}:`, error);
      return null;
    }
  }

  /**
   * Get tokens for a server
   */
  public getTokens(serverId: string): McpOAuthTokens | undefined {
    return this.stateManager.getTokens(serverId);
  }

  /**
   * Remove tokens for a server
   */
  public revokeTokens(serverId: string): void {
    this.stateManager.removeTokens(serverId);
    console.log(`🗑️ [OAuth] Tokens revoked for server: ${serverId}`);
  }

  /**
   * Check if server has valid tokens
   */
  public hasValidTokens(serverId: string): boolean {
    const tokens = this.stateManager.getTokens(serverId);
    return tokens !== undefined;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get provider preset configuration
   */
  public getProviderPreset(provider: string): Partial<McpOAuthConfig> | undefined {
    return MCP_PROVIDER_PRESETS[provider];
  }

  /**
   * Create OAuth config with provider preset
   */
  public createConfigWithPreset(
    provider: string, 
    clientId: string, 
    clientSecret?: string,
    overrides?: Partial<McpOAuthConfig>
  ): McpOAuthConfig {
    const preset = this.getProviderPreset(provider);
    if (!preset) {
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    return {
      provider,
      clientId,
      clientSecret,
      authorizationUrl: '',
      tokenUrl: '',
      scopes: [],
      usePKCE: true,
      codeChallengeMethod: 'S256',
      ...preset,
      ...overrides
    };
  }

  /**
   * Get default redirect URI for Orchestra
   */
  private getDefaultRedirectUri(): string {
    return 'orchestra://oauth/callback';
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string, 
    state: McpOAuthState, 
    config: McpOAuthConfig
  ): Promise<McpOAuthTokens> {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: state.redirectUri,
      client_id: config.clientId
    });

    // Add client secret if provided
    if (config.clientSecret) {
      tokenParams.append('client_secret', config.clientSecret);
    }

    // Add PKCE verifier
    if (config.usePKCE && state.codeVerifier) {
      tokenParams.append('code_verifier', state.codeVerifier);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresIn: tokenData.expires_in,
      expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
      scope: tokenData.scope,
      obtainedAt: Date.now()
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const mcpOAuthService = McpOAuthService.getInstance();