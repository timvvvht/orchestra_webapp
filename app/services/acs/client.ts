/**
 * ACS Client stub for web app
 * This is a placeholder for the ACS client functionality
 */

export interface ACSClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export class ACSClient {
  private config: ACSClientConfig;

  constructor(config: ACSClientConfig) {
    this.config = config;
    console.warn('[ACSClient] Stub implementation - not fully functional in web app');
  }

  // Stub methods for compatibility
  async get(endpoint: string, params?: any): Promise<any> {
    console.warn('[ACSClient] Stub implementation - get method not functional');
    return {};
  }

  async post(endpoint: string, data?: any): Promise<any> {
    console.warn('[ACSClient] Stub implementation - post method not functional');
    return {};
  }

  async put(endpoint: string, data?: any): Promise<any> {
    console.warn('[ACSClient] Stub implementation - put method not functional');
    return {};
  }

  async delete(endpoint: string): Promise<any> {
    console.warn('[ACSClient] Stub implementation - delete method not functional');
    return {};
  }
}