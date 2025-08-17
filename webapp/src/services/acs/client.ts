import type {
  ACSClientConfig,
  RequestOptions,
  APIResponse,
  HTTPMethod,
} from "./types";
import { JWTTokenManager } from "@/lib/jwtTokenManager";
import {
  ACSTokenInterceptor,
  TokenRefreshStrategies,
} from "./tokenInterceptor";
import type { Session } from "@supabase/supabase-js";

/**
 * Base HTTP client for ACS API interactions
 * Handles authentication, retries, error handling, and request/response processing
 */
export class ACSClient {
  private config: Required<ACSClientConfig>;
  private authToken: string | null = null;
  private tokenInterceptor: ACSTokenInterceptor | null = null;
  private requestInterceptors: Array<(config: any) => any> = [];
  private responseInterceptors: Array<{
    onFulfilled: (response: any) => any;
    onRejected: (error: any) => any;
  }> = [];

  constructor(config: ACSClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 2, // Reduced from 3 to help avoid 429 rate limiting
      debug: false,
      apiKey: '',
      ...config,
    };

    // Initialize token interceptor
    this.initializeTokenInterceptor();
  }

  /**
   * Initialize token interceptor for automatic token management
   */
  private initializeTokenInterceptor(): void {
    const refreshHandler = TokenRefreshStrategies.createReAuthHandler(() => {
      // Handle re-authentication required
      console.log("[ACSClient] Re-authentication required");
      // This will be handled by the auth context
    });

    this.tokenInterceptor = new ACSTokenInterceptor(this, refreshHandler);
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: (config: any) => any): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(
    onFulfilled: (response: any) => any,
    onRejected: (error: any) => any
  ): void {
    this.responseInterceptors.push({ onFulfilled, onRejected });
  }

  /**
   * Set authentication token for subsequent requests
   */
  setAuthToken(token: string): void {
    console.log("🔧 [ACSClient] setAuthToken called with:", {
      tokenProvided: !!token,
      tokenLength: token?.length || 0,
      tokenStart: token?.substring(0, 30) + "..." || "undefined",
      previousToken: this.authToken?.substring(0, 30) + "..." || "undefined",
    });

    // Guard against unexpectedly long tokens after helper filtering
    if (token && token.length > 600) {
      console.warn(
        "⚠️ [ACSClient] Token unexpectedly long after helper filter (length: " +
          token.length +
          ") - this should not happen"
      );
      console.warn(
        "💡 [ACSClient] The getSupabaseAccessToken helper should have filtered this out"
      );
    }

    this.authToken = token;
    JWTTokenManager.storeToken(token);

    console.log("✅ [ACSClient] Auth token set successfully:", {
      newTokenSet: !!this.authToken,
      newTokenLength: this.authToken?.length || 0,
    });

    if (this.config.debug) {
      console.log("[ACSClient] Auth token set (debug mode)");
    }
  }

  /**
   * Get current authentication token (for debugging)
   */
  getAuthToken(): string | null {
    console.log("🔍 [ACSClient] getAuthToken called, returning:", {
      hasToken: !!this.authToken,
      tokenLength: this.authToken?.length || 0,
      tokenStart: this.authToken?.substring(0, 30) + "..." || "undefined",
    });
    return this.authToken;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
    JWTTokenManager.clearTokens(); // Ensure localStorage is also cleared
    if (this.config.debug) {
      console.log("[ACSClient] Auth token cleared");
    }
  }

  /**
   * Get current authentication status
   */
  isAuthenticated(): boolean {
    return this.authToken !== null;
  }

  /**
   * Make an HTTP request to the ACS API
   */
  async request<T = any>(
    method: HTTPMethod,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const url = this.buildUrl(endpoint);
    const requestOptions = this.buildRequestOptions(method, data, options);

    console.log(`🚀 [ACSClient] [${requestId}] Starting ${method} request to ${url}`);
    console.log(`📤 [ACSClient] [${requestId}] Request headers:`, requestOptions.headers);
    console.log(`📤 [ACSClient] [${requestId}] Request body:`, data ? JSON.stringify(data, null, 2) : 'No body');
    console.log(`📤 [ACSClient] [${requestId}] Request options:`, {
      method: requestOptions.method,
      timeout: this.config.timeout,
      retries: this.config.retries
    });

    let lastError: Error;
    const maxRetries = options.retries ?? this.config.retries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      console.log(`🔄 [ACSClient] [${requestId}] Attempt ${attempt + 1}/${maxRetries + 1}`);
      
      try {
        console.log(`📡 [ACSClient] [${requestId}] Calling fetch()...`);
        const fetchStartTime = Date.now();
        const response = await fetch(url, requestOptions);
        const fetchDuration = Date.now() - fetchStartTime;

        console.log(`📥 [ACSClient] [${requestId}] Fetch completed in ${fetchDuration}ms`);
        console.log(`📥 [ACSClient] [${requestId}] Response status: ${response.status} ${response.statusText}`);
        console.log(`📥 [ACSClient] [${requestId}] Response ok: ${response.ok}`);
        console.log(`📥 [ACSClient] [${requestId}] Response headers:`, Object.fromEntries(response.headers.entries()));
        console.log(`📥 [ACSClient] [${requestId}] Response type: ${response.type}`);
        console.log(`📥 [ACSClient] [${requestId}] Response URL: ${response.url}`);

        console.log(`🔄 [ACSClient] [${requestId}] Processing response...`);
        const result = await this.handleResponse<T>(response);

        console.log(`✅ [ACSClient] [${requestId}] Request successful!`);
        console.log(`✅ [ACSClient] [${requestId}] Final result:`, result);

        return result;
      } catch (error) {
        lastError = error as Error;

        console.error(`❌ [ACSClient] [${requestId}] Attempt ${attempt + 1} failed:`, {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        });

        // Don't retry on authentication errors or client errors (4xx)
        if (error instanceof ACSError && error.status_code < 500) {
          console.error(`❌ [ACSClient] [${requestId}] Client error (${error.status_code}), not retrying`);
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          console.error(`❌ [ACSClient] [${requestId}] Max retries reached, giving up`);
          break;
        }

        // Fixed delay between retries - no exponential backoff
        const delay = 2000; // Fixed 2-second delay
        console.log(`⏳ [ACSClient] [${requestId}] Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    console.error(`💥 [ACSClient] [${requestId}] All attempts failed, throwing error`);
    throw lastError!;
  }

  /**
   * Convenience methods for different HTTP verbs
   */
  async get<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    console.log(`🔍 [ACSClient] GET request initiated for ${endpoint}`);
    const response = await this.request<T>("GET", endpoint, undefined, options);
    console.log(`🔍 [ACSClient] GET request completed for ${endpoint}:`, response);
    return response;
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    console.log(`📝 [ACSClient] POST request initiated for ${endpoint}`);
    console.log(`📝 [ACSClient] POST data:`, data);
    const response = await this.request<T>("POST", endpoint, data, options);
    console.log(`📝 [ACSClient] POST request completed for ${endpoint}:`, response);
    return response;
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    console.log("🔄 [ACSClient] PUT request initiated:", {
      endpoint: endpoint,
      data: data,
      dataKeys: data ? Object.keys(data) : [],
      options: options,
      hasAuthToken: !!this.authToken,
      timestamp: new Date().toISOString(),
    });

    const result = await this.request<T>("PUT", endpoint, data, options);

    console.log("✅ [ACSClient] PUT request completed:", {
      endpoint: endpoint,
      data: data,
      resultStatus: result?.status,
      resultData: result?.data,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async delete<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>("DELETE", endpoint, undefined, options);
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>("PATCH", endpoint, data, options);
  }

  /**
   * Exchange Supabase session for ACS authentication
   * Sends correct access_token and user fields to ACS OAuth exchange endpoint
   */
  async exchangeTokenWithACS(session: Session): Promise<APIResponse<any>> {
    const { access_token, user } = session;
    return this.post("/api/v1/auth/oauth/exchange", {
      access_token,
      user,
      provider: "supabase",
    });
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  /**
   * Build fetch request options
   */
  private buildRequestOptions(
    method: HTTPMethod,
    data?: any,
    options: RequestOptions = {}
  ): RequestInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    // Add authentication header if token is available
    console.log("🔍 [ACSClient] Building request headers:", {
      hasAuthToken: !!this.authToken,
      authTokenLength: this.authToken?.length || 0,
      authTokenStart: this.authToken?.substring(0, 30) + "..." || "undefined",
    });

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
      console.log("✅ [ACSClient] Authorization header added to request:", {
        headerValue: `Bearer ${this.authToken.substring(0, 30)}...`,
        fullHeaderLength: headers["Authorization"].length,
      });
    } else {
      console.log(
        "⚠️ [ACSClient] No auth token available, Authorization header NOT added"
      );
    }

    // Add API key if configured
    if (this.config.apiKey && this.config.apiKey !== '') {
      headers["X-API-Key"] = this.config.apiKey;
    }

    // ---------------------------------------------------------------------------
    // 🧪 Cookie-based auth for tests
    // In test environment, inject cookies from the test cookie jar
    // ---------------------------------------------------------------------------
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      try {
        // Dynamic import to avoid issues in non-test environments
        const { cookieJar } = require("../../../../tests/utils/authHelpers");
        if (cookieJar && cookieJar.header) {
          const cookieHeader = cookieJar.header();
          if (cookieHeader) {
            headers["Cookie"] = cookieHeader;
          }

          // For state-changing verbs add CSRF
          if (
            ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
          ) {
            const csrf = cookieJar.get("orch_csrf_token");
            if (csrf) {
              headers["X-CSRF-Token"] = csrf;
            }
          }
        }
      } catch (error) {
        // Silently ignore if cookie jar is not available
      }
    }

    // ---------------------------------------------------------------------------
    // 🧪 Test-rate-limit bypass
    // When running the integration suite we often slam the live backend fast
    // enough to trigger Supabase/Fly rate limits. The backend respects a
    // DISABLE_RATE_LIMIT env flag **or** this header to short-circuit the
    // limiter.  We automatically attach the header whenever the runner has
    // DISABLE_RATE_LIMIT=1 so individual test files don’t need to remember it.
    // Safe in production – the header is ignored unless the backend flag is
    // also enabled.
    // ---------------------------------------------------------------------------
    if (
      typeof process !== "undefined" &&
      process.env?.DISABLE_RATE_LIMIT === "1"
    ) {
      headers["X-Test-Bypass-RateLimit"] = "1";
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: options.signal,
      credentials: "include", // Ensure cookies are sent with requests
    };

    // Add body for methods that support it
    if (data && ["POST", "PUT", "PATCH"].includes(method)) {
      requestOptions.body = JSON.stringify(data);
    }

    return requestOptions;
  }

  /**
   * Handle fetch response and convert to APIResponse
   */
  private async handleResponse<T>(response: Response): Promise<APIResponse<T>> {
    const responseId = `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔄 [ACSClient] [${responseId}] Response handling started`);
    const timestamp = new Date().toISOString();
    const headers: Record<string, string> = {};

    // Guard against undefined response
    if (!response || !response.headers) {
      console.error(`❌ [ACSClient] [${responseId}] Invalid response object received:`, response);
      throw new ACSError("Invalid response object", 0, "NETWORK_ERROR");
    }

    console.log(`📋 [ACSClient] [${responseId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`📋 [ACSClient] [${responseId}] Response OK: ${response.ok}`);

    // Convert Headers to plain object
    console.log(`🏷️ [ACSClient] [${responseId}] Processing response headers`);
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log(`🏷️ [ACSClient] [${responseId}] Headers processed:`, Object.keys(headers));

    let data: T;
    const contentType = response.headers.get("content-type");
    console.log(`📄 [ACSClient] [${responseId}] Content-Type: ${contentType || "not specified"}`);

    try {
      if (contentType?.includes("application/json")) {
        console.log(`🔄 [ACSClient] [${responseId}] Parsing JSON response`);
        data = await response.json();
        console.log(`✅ [ACSClient] [${responseId}] JSON parsed successfully:`, {
          dataType: typeof data,
          dataKeys: typeof data === 'object' && data ? Object.keys(data as any) : []
        });
      } else {
        console.log(`🔄 [ACSClient] [${responseId}] Parsing text response`);
        data = (await response.text()) as unknown as T;
        console.log(`✅ [ACSClient] [${responseId}] Text parsed successfully, length: ${(data as any)?.length || 0}`);
      }
    } catch (error) {
      console.error(`❌ [ACSClient] [${responseId}] Failed to parse response:`, {
        error: error instanceof Error ? error.message : error,
        contentType: contentType
      });
      throw new ACSError(
        `Failed to parse response: ${(error as Error).message}`,
        0,
        "PARSE_ERROR"
      );
    }

    if (!response.ok) {
      console.error(`⚠️ [ACSClient] [${responseId}] Non-OK response detected: ${response.status}`);
      // Try to extract error details from response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetail: string | undefined;

      if (typeof data === "object" && data !== null) {
        const errorObj = data as any;
        console.log(`🔍 [ACSClient] [${responseId}] Analyzing error response:`, errorObj);
        
        if (errorObj.detail) {
          errorDetail =
            typeof errorObj.detail === "string"
              ? errorObj.detail
              : JSON.stringify(errorObj.detail);
          console.log(`🔍 [ACSClient] [${responseId}] Error detail found: ${errorDetail}`);
        } else if (errorObj.message) {
          errorDetail = errorObj.message;
          console.log(`🔍 [ACSClient] [${responseId}] Error message found: ${errorDetail}`);
        } else if (errorObj.error) {
          errorDetail = errorObj.error;
          console.log(`🔍 [ACSClient] [${responseId}] Error key found: ${errorDetail}`);
        } else {
          console.log(`🔍 [ACSClient] [${responseId}] No structured error info found in response`);
        }
      }

      if (errorDetail) {
        errorMessage = errorDetail;
      }

      // Ensure we always have a valid status code
      const statusCode =
        response.status ??
        (typeof (data as any)?.status === "number" ? (data as any).status : 500);
      console.error(`❌ [ACSClient] [${responseId}] Throwing error: ${errorMessage} (${statusCode})`);
      const acsError = new ACSError(errorMessage, statusCode, errorDetail);
      throw acsError;
    }

    console.log(`✅ [ACSClient] [${responseId}] Response handled successfully:`, {
      status: response.status,
      dataType: typeof data,
      headerCount: Object.keys(headers).length,
      timestamp
    });
    
    return {
      data,
      status: response.status,
      headers,
      timestamp,
    };
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Replace path parameters in endpoint URLs
   */
  static replacePath(endpoint: string, params: Record<string, string>): string {
    let result = endpoint;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`{${key}}`, encodeURIComponent(value));
    }
    return result;
  }

  /**
   * Build query string from parameters
   */
  static buildQuery(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }
}

/**
 * Custom error class for ACS API errors
 */
export class ACSError extends Error {
  public readonly status_code: number;
  public readonly detail?: string;

  constructor(message: string, statusCode: number, detail?: string) {
    super(message);
    this.name = "ACSError";
    this.status_code = statusCode;
    this.detail = detail;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ACSError);
    }
  }

  /**
   * Check if error is a specific HTTP status code
   */
  isStatus(code: number): boolean {
    return this.status_code === code;
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status_code >= 400 && this.status_code < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status_code >= 500;
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.status_code === 401 || this.status_code === 403;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      status_code: this.status_code,
      detail: this.detail,
      stack: this.stack,
    };
  }
}

/**
 * Create a configured ACS client instance
 */
export function createACSClient(config: ACSClientConfig): ACSClient {
  return new ACSClient(config);
}

/**
 * Default ACS client configuration
 */
export const defaultACSConfig: Omit<ACSClientConfig, "baseUrl" | "sseUrl"> = {
  timeout: 30000,
  retries: 2, // Reduced from 3 to help avoid 429 rate limiting
  debug: import.meta.env.MODE === "development",
};
