import type { ACSClient } from '../shared/client';
import type {
  ProvisionAppPerUserRequest,
  ProvisionAppPerUserResponse,
  AppPerUserStatusResponse,
  RequestOptions,
  APIResponse
} from '../shared/types';
import { ACS_ENDPOINTS } from '../shared/types';

/**
 * Infrastructure management service for ACS
 * Handles app-per-user TES environment lifecycle (provisioning, status, cleanup)
 */
export class ACSInfrastructureService {
  constructor(private client: ACSClient) {}

  /**
   * Provision a new app-per-user TES environment
   */
  async provisionAppPerUser(
    request: ProvisionAppPerUserRequest,
    options?: RequestOptions
  ): Promise<APIResponse<ProvisionAppPerUserResponse>> {
    return this.client.post<ProvisionAppPerUserResponse>(
      ACS_ENDPOINTS.APP_PER_USER_PROVISION,
      request,
      options
    );
  }

  /**
   * Get the status of the user's app-per-user TES environment
   */
  async getAppPerUserStatus(
    options?: RequestOptions
  ): Promise<APIResponse<AppPerUserStatusResponse>> {
    return this.client.get<AppPerUserStatusResponse>(
      ACS_ENDPOINTS.APP_PER_USER_STATUS,
      options
    );
  }

  /**
   * Clean up (destroy) the user's app-per-user TES environment
   */
  async cleanupAppPerUser(
    options?: RequestOptions
  ): Promise<APIResponse<any>> {
    return this.client.post(
      ACS_ENDPOINTS.APP_PER_USER_CLEANUP,
      undefined,
      options
    );
  }

  /**
   * Provision general infrastructure (if different from app-per-user)
   */
  async provisionInfrastructure(
    request: any,
    options?: RequestOptions
  ): Promise<APIResponse<any>> {
    return this.client.post(
      ACS_ENDPOINTS.INFRASTRUCTURE_PROVISION,
      request,
      options
    );
  }

  /**
   * Get general infrastructure status
   */
  async getInfrastructureStatus(
    options?: RequestOptions
  ): Promise<APIResponse<any>> {
    return this.client.get(
      ACS_ENDPOINTS.INFRASTRUCTURE_STATUS,
      options
    );
  }

  /**
   * Get infrastructure service health status
   */
  async getHealth(options?: RequestOptions): Promise<APIResponse<any>> {
    return this.client.get('/api/v1/infrastructure/health', options);
  }
}

/**
 * Utilities for working with infrastructure services
 */
export class InfrastructureUtils {
  /**
   * Check if infrastructure status indicates active/ready state
   */
  static isActive(status: AppPerUserStatusResponse): boolean {
    const acsStatus = status.status?.toLowerCase();
    const appStatus = status.app_status?.toLowerCase();
    
    return (
      acsStatus === 'active' && 
      (appStatus === 'running' || appStatus === 'deployed')
    );
  }

  /**
   * Check if infrastructure status indicates error/failed state
   */
  static isError(status: AppPerUserStatusResponse): boolean {
    const acsStatus = status.status?.toLowerCase();
    const appStatus = status.app_status?.toLowerCase();
    
    return (
      acsStatus?.includes('error') || 
      acsStatus?.includes('failed') ||
      appStatus?.includes('error') ||
      appStatus?.includes('failed')
    );
  }

  /**
   * Check if infrastructure status indicates provisioning in progress
   */
  static isProvisioning(status: AppPerUserStatusResponse): boolean {
    const acsStatus = status.status?.toLowerCase();
    
    return (
      acsStatus?.includes('provisioning') ||
      acsStatus?.includes('creating') ||
      acsStatus?.includes('pending')
    );
  }

  /**
   * Format infrastructure status for display
   */
  static formatStatus(status: AppPerUserStatusResponse): string {
    const acsStatus = status.status || 'unknown';
    const appStatus = status.app_status || 'unknown';
    
    return `ACS: ${acsStatus}, App: ${appStatus}`;
  }

  /**
   * Get estimated monthly cost from status response
   */
  static getEstimatedCost(status: AppPerUserStatusResponse): number {
    if (status.cost_tracking && typeof status.cost_tracking === 'object') {
      const costData = status.cost_tracking as any;
      return costData.estimated_monthly_cost_usd || 0;
    }
    return 0;
  }

  /**
   * Get resource information from status response
   */
  static getResourceInfo(status: AppPerUserStatusResponse): {
    region: string;
    machineCount: number;
    volumeId: string;
    machineId: string;
  } {
    return {
      region: status.region || 'unknown',
      machineCount: status.machine_count || 0,
      volumeId: status.volume_id || 'unknown',
      machineId: status.machine_id || 'unknown'
    };
  }

  /**
   * Create a minimal resource specification for testing
   */
  static createTestResourceSpec(region: string = 'iad'): object {
    return {
      region,
      volume_size_gb: 1, // Minimal size for testing
      machine_type: 'shared-cpu-1x', // Smallest machine type
      memory_mb: 256 // Minimal memory
    };
  }

  /**
   * Poll infrastructure status until active or timeout
   */
  static async pollUntilActive(
    getStatusFn: () => Promise<APIResponse<AppPerUserStatusResponse>>,
    options: {
      maxRetries?: number;
      delayMs?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<AppPerUserStatusResponse> {
    const {
      maxRetries = 60, // 60 retries
      delayMs = 5000,   // 5 seconds between retries
      timeoutMs = 300000 // 5 minutes total timeout
    } = options;

    const startTime = Date.now();

    for (let i = 0; i < maxRetries; i++) {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Polling timeout: Infrastructure did not become active within ${timeoutMs}ms`);
      }

      const response = await getStatusFn();
      const status = response.data;

      console.log(`Poll #${i + 1}: ${InfrastructureUtils.formatStatus(status)}`);

      if (InfrastructureUtils.isActive(status)) {
        return status;
      }

      if (InfrastructureUtils.isError(status)) {
        throw new Error(`Infrastructure entered error state: ${InfrastructureUtils.formatStatus(status)}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error(`Polling failed: Infrastructure did not become active after ${maxRetries} retries`);
  }
}

export default ACSInfrastructureService;