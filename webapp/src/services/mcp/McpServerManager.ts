/**
 * MCP Server Manager
 * 
 * High-level service for managing MCP server lifecycle, tool discovery,
 * and integration with Orchestra's session management system.
 */

import { invoke } from '@tauri-apps/api/core';
import { 
  McpServerConfig, 
  McpServerInstance, 
  McpServerStatus, 
  McpToolDefinition,
  McpError,
  McpErrorCode,
  convertMcpToolsToSpecs,
  validateMcpTool
} from './types';
import { ensureMcpInstalled } from './installation';
import { postJsonRpc } from '@/utils/jsonRpcClient';
import type { ToolSpec } from '@/utils/registerSessionTools';

// ============================================================================
// TAURI COMMAND INTERFACES
// ============================================================================

interface TauriMcpServerStatus {
  id: string;
  status: string;
  port?: number;
  pid?: number;
  started_at?: number;
  error?: string;
  last_health_check?: number;
}

// ============================================================================
// MCP SERVER MANAGER CLASS
// ============================================================================

export class McpServerManager {
  private static instance: McpServerManager;
  private servers: Map<string, McpServerInstance> = new Map();
  private eventListeners: Map<string, Set<(instance: McpServerInstance) => void>> = new Map();

  private constructor() {
    // Initialize event listener maps
    this.eventListeners.set('status_changed', new Set());
    this.eventListeners.set('tools_discovered', new Set());
    this.eventListeners.set('error', new Set());
  }

  public static getInstance(): McpServerManager {
    if (!McpServerManager.instance) {
      McpServerManager.instance = new McpServerManager();
    }
    return McpServerManager.instance;
  }

  // ============================================================================
  // EVENT MANAGEMENT
  // ============================================================================

  public addEventListener(
    event: 'status_changed' | 'tools_discovered' | 'error',
    callback: (instance: McpServerInstance) => void
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  public removeEventListener(
    event: 'status_changed' | 'tools_discovered' | 'error',
    callback: (instance: McpServerInstance) => void
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emitEvent(event: string, instance: McpServerInstance): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(instance);
        } catch (error) {
          console.error(`Error in MCP event listener for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // SERVER LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Start an MCP server
   */
  public async startServer(config: McpServerConfig): Promise<McpServerInstance> {
    try {
      console.log(`🚀 [MCP] Starting server: ${config.name} (${config.id})`);

      // Ensure the MCP server package/image is installed before starting
      await ensureMcpInstalled(config);

      // Convert config to Rust format
      const rustConfig = {
        id: config.id,
        name: config.name,
        exec_path: config.execPath,
        args: config.args,
        port: config.port,
        env: config.env,
        enabled: config.enabled
      };

      const status: TauriMcpServerStatus = await invoke('mcp_start_server', { config: rustConfig });
      
      const instance: McpServerInstance = {
        config,
        status: this.mapTauriStatus(status.status),
        port: status.port,
        pid: status.pid,
        startedAt: status.started_at,
        lastHealthCheck: status.last_health_check,
        error: status.error
      };

      this.servers.set(config.id, instance);
      this.emitEvent('status_changed', instance);

      // Start tool discovery after server is running
      if (instance.status === McpServerStatus.RUNNING) {
        this.discoverTools(config.id).catch(error => {
          console.error(`Failed to discover tools for server ${config.id}:`, error);
        });
      }

      console.log(`✅ [MCP] Server ${config.name} started successfully`);
      return instance;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [MCP] Failed to start server ${config.name}:`, errorMessage);
      
      const errorInstance: McpServerInstance = {
        config,
        status: McpServerStatus.ERROR,
        error: errorMessage,
        lastHealthCheck: Date.now()
      };

      this.servers.set(config.id, errorInstance);
      this.emitEvent('error', errorInstance);
      
      throw new McpError(
        `Failed to start MCP server ${config.name}: ${errorMessage}`,
        McpErrorCode.SERVER_START_FAILED,
        config.id,
        error
      );
    }
  }

  /**
   * Stop an MCP server
   */
  public async stopServer(serverId: string): Promise<void> {
    try {
      console.log(`🛑 [MCP] Stopping server: ${serverId}`);

      const status: TauriMcpServerStatus = await invoke('mcp_stop_server', { serverId });
      
      const instance = this.servers.get(serverId);
      if (instance) {
        instance.status = this.mapTauriStatus(status.status);
        instance.port = status.port;
        instance.pid = status.pid;
        instance.startedAt = status.started_at;
        instance.lastHealthCheck = status.last_health_check;
        instance.error = status.error;
        instance.tools = undefined; // Clear tools when stopped
        instance.discoveredAt = undefined;

        this.emitEvent('status_changed', instance);
      }

      console.log(`✅ [MCP] Server ${serverId} stopped successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [MCP] Failed to stop server ${serverId}:`, errorMessage);
      
      throw new McpError(
        `Failed to stop MCP server ${serverId}: ${errorMessage}`,
        McpErrorCode.SERVER_STOP_FAILED,
        serverId,
        error
      );
    }
  }

  /**
   * Get current status of an MCP server
   */
  public async getServerStatus(serverId: string): Promise<McpServerInstance | null> {
    try {
      const status: TauriMcpServerStatus = await invoke('mcp_get_server_status', { serverId });
      
      let instance = this.servers.get(serverId);
      if (!instance) {
        // Server not in our cache, create minimal instance
        instance = {
          config: {
            id: serverId,
            name: serverId,
            execPath: '',
            authType: 'none',
            enabled: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          status: this.mapTauriStatus(status.status),
          lastHealthCheck: status.last_health_check
        };
        this.servers.set(serverId, instance);
      } else {
        // Update existing instance
        instance.status = this.mapTauriStatus(status.status);
        instance.port = status.port;
        instance.pid = status.pid;
        instance.startedAt = status.started_at;
        instance.lastHealthCheck = status.last_health_check;
        instance.error = status.error;
      }

      return instance;

    } catch (error) {
      console.error(`Failed to get status for server ${serverId}:`, error);
      return null;
    }
  }

  /**
   * List all MCP servers
   */
  public async listServers(): Promise<McpServerInstance[]> {
    try {
      const statuses: TauriMcpServerStatus[] = await invoke('mcp_list_servers');
      
      const instances: McpServerInstance[] = [];
      
      for (const status of statuses) {
        let instance = this.servers.get(status.id);
        if (!instance) {
          // Create minimal instance for unknown servers
          instance = {
            config: {
              id: status.id,
              name: status.id,
              execPath: '',
              authType: 'none',
              enabled: false,
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            status: this.mapTauriStatus(status.status),
            lastHealthCheck: status.last_health_check
          };
          this.servers.set(status.id, instance);
        } else {
          // Update existing instance
          instance.status = this.mapTauriStatus(status.status);
          instance.port = status.port;
          instance.pid = status.pid;
          instance.startedAt = status.started_at;
          instance.lastHealthCheck = status.last_health_check;
          instance.error = status.error;
        }
        
        instances.push(instance);
      }

      return instances;

    } catch (error) {
      console.error('Failed to list MCP servers:', error);
      return [];
    }
  }

  /**
   * Check if a port is available
   */
  public async isPortAvailable(port: number): Promise<boolean> {
    try {
      return await invoke('mcp_check_port_available', { port });
    } catch (error) {
      console.error(`Failed to check port ${port}:`, error);
      return false;
    }
  }

  // ============================================================================
  // TOOL DISCOVERY
  // ============================================================================

  /**
   * Discover tools from an MCP server
   */
  public async discoverTools(serverId: string): Promise<McpToolDefinition[]> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new McpError(
        `Server ${serverId} not found`,
        McpErrorCode.SERVER_NOT_FOUND,
        serverId
      );
    }

    if (instance.status !== McpServerStatus.RUNNING) {
      throw new McpError(
        `Server ${serverId} is not running`,
        McpErrorCode.DISCOVERY_FAILED,
        serverId
      );
    }

    if (!instance.port) {
      throw new McpError(
        `Server ${serverId} has no port assigned`,
        McpErrorCode.DISCOVERY_FAILED,
        serverId
      );
    }

    try {
      console.log(`🔍 [MCP] Discovering tools for server: ${serverId}`);

      // Construct URL for MCP server
      const url = `http://127.0.0.1:${instance.port}/mcp`;
      
      // Make JSON-RPC request to discover tools
      const result = await postJsonRpc(url, "tools/list", {});
      
      // Map JSON-RPC tool objects to McpToolDefinition format
      const tools: McpToolDefinition[] = result.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.parameters || tool.inputSchema, // Handle both field names
        metadata: tool.metadata
      }));

      // Validate discovered tools
      const validTools = tools.filter(tool => {
        if (!validateMcpTool(tool)) {
          console.warn(`Invalid tool schema for ${tool.name} from server ${serverId}`);
          return false;
        }
        return true;
      });

      // Update instance with discovered tools
      instance.tools = validTools;
      instance.discoveredAt = Date.now();

      this.emitEvent('tools_discovered', instance);

      console.log(`✅ [MCP] Discovered ${validTools.length} tools for server ${serverId}`);
      return validTools;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [MCP] Tool discovery failed for server ${serverId}:`, errorMessage);
      
      instance.error = `Tool discovery failed: ${errorMessage}`;
      this.emitEvent('error', instance);
      
      throw new McpError(
        `Tool discovery failed for server ${serverId}: ${errorMessage}`,
        McpErrorCode.DISCOVERY_FAILED,
        serverId,
        error
      );
    }
  }

  /**
   * Get tools from a specific server
   */
  public getServerTools(serverId: string): McpToolDefinition[] {
    const instance = this.servers.get(serverId);
    return instance?.tools || [];
  }

  /**
   * Get all tools from all running servers
   */
  public getAllTools(): { serverId: string; tools: McpToolDefinition[] }[] {
    const result: { serverId: string; tools: McpToolDefinition[] }[] = [];
    
    for (const [serverId, instance] of this.servers) {
      if (instance.status === McpServerStatus.RUNNING && instance.tools) {
        result.push({
          serverId,
          tools: instance.tools
        });
      }
    }
    
    return result;
  }

  /**
   * Convert MCP tools to Orchestra ToolSpec format
   */
  public convertToToolSpecs(serverId: string): ToolSpec[] {
    const tools = this.getServerTools(serverId);
    return convertMcpToolsToSpecs(tools, serverId);
  }

  /**
   * Get all tools as ToolSpecs for session registration
   */
  public getAllToolSpecs(): ToolSpec[] {
    const allSpecs: ToolSpec[] = [];
    
    for (const [serverId, instance] of this.servers) {
      if (instance.status === McpServerStatus.RUNNING && instance.tools) {
        const specs = convertMcpToolsToSpecs(instance.tools, serverId);
        allSpecs.push(...specs);
      }
    }
    
    return allSpecs;
  }

  // ============================================================================
  // SERVER MANAGEMENT
  // ============================================================================

  /**
   * Get server instance by ID
   */
  public getServer(serverId: string): McpServerInstance | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all server instances
   */
  public getAllServers(): McpServerInstance[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get running servers
   */
  public getRunningServers(): McpServerInstance[] {
    return Array.from(this.servers.values()).filter(
      instance => instance.status === McpServerStatus.RUNNING
    );
  }

  /**
   * Restart a server
   */
  public async restartServer(serverId: string): Promise<McpServerInstance> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new McpError(
        `Server ${serverId} not found`,
        McpErrorCode.SERVER_NOT_FOUND,
        serverId
      );
    }

    console.log(`🔄 [MCP] Restarting server: ${serverId}`);

    // Stop the server if it's running
    if (instance.status === McpServerStatus.RUNNING) {
      await this.stopServer(serverId);
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start the server again
    return await this.startServer(instance.config);
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  /**
   * Start health monitoring for all servers
   */
  public startHealthMonitoring(intervalMs: number = 30000): void {
    setInterval(async () => {
      for (const serverId of this.servers.keys()) {
        try {
          await this.getServerStatus(serverId);
        } catch (error) {
          console.error(`Health check failed for server ${serverId}:`, error);
        }
      }
    }, intervalMs);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private mapTauriStatus(status: string): McpServerStatus {
    switch (status) {
      case 'stopped': return McpServerStatus.STOPPED;
      case 'starting': return McpServerStatus.STARTING;
      case 'running': return McpServerStatus.RUNNING;
      case 'error': return McpServerStatus.ERROR;
      case 'authenticating': return McpServerStatus.AUTHENTICATING;
      case 'stopping': return McpServerStatus.STOPPING;
      default: return McpServerStatus.ERROR;
    }
  }

  // TODO: simulateToolDiscovery method removed - now using real HTTP JSON-RPC discovery
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const mcpServerManager = McpServerManager.getInstance();