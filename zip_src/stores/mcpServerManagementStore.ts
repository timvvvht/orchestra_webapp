/**
 * MCP Server Management Store
 * 
 * Manages the list of available MCP servers, their configurations,
 * installation status, and running instances.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { McpServerConfig, McpServerInstance, McpServerStatus, AddServerFormData, McpToolDefinition } from '../services/mcp/types';
import { mcpServerManager } from '../services/mcp/McpServerManager';
import { setMapEntry, deleteMapEntry } from './utils/mapUtils';

interface McpServerManagementState {
  // Server configurations
  servers: Map<string, McpServerConfig>;
  
  // Running instances
  instances: Map<string, McpServerInstance>;
  
  // Installation states
  installationStates: Map<string, 'idle' | 'installing' | 'installed' | 'failed'>;
  
  // Server tools cache
  serverTools: Map<string, McpToolDefinition[]>;
  
  // UI state
  isAddServerModalOpen: boolean;
  selectedServerId: string | null;
  
  // Actions
  addServer: (serverData: AddServerFormData) => Promise<void>;
  removeServer: (serverId: string) => void;
  updateServer: (serverId: string, updates: Partial<McpServerConfig>) => void;
  installAndStartServer: (serverId: string) => Promise<void>;
  stopServer: (serverId: string) => Promise<void>;
  
  // Health & Tool Discovery Actions
  probeServerHealth: (serverId: string) => Promise<boolean>;
  discoverServerTools: (serverId: string) => Promise<McpToolDefinition[]>;
  
  // UI Actions
  openAddServerModal: () => void;
  closeAddServerModal: () => void;
  selectServer: (serverId: string | null) => void;
  
  // Getters
  getServerById: (serverId: string) => McpServerConfig | undefined;
  getRunningServers: () => McpServerInstance[];
  getAvailableServers: () => McpServerConfig[];
  getServerTools: (serverId: string) => McpToolDefinition[];
}

const createServerConfig = (data: AddServerFormData): McpServerConfig => {
  const id = `${data.type}-${Date.now()}`;
  const now = Date.now();
  
  let execPath: string;
  let args: string[];
  
  switch (data.type) {
    case 'npm':
      execPath = 'npx';
      args = ['-y', data.packageName!];
      break;
    case 'docker':
      execPath = 'docker';
      args = ['run', '--rm', '-i', data.dockerImage!];
      break;
    case 'custom':
      execPath = data.execPath!;
      args = data.args || [];
      break;
    default:
      throw new Error(`Unknown server type: ${data.type}`);
  }
  
  return {
    id,
    name: data.name,
    execPath,
    args,
    authType: 'none',
    enabled: true,
    createdAt: now,
    updatedAt: now,
    description: data.description,
    tags: data.tags || []
  };
};

export const useMcpServerManagementStore = create<McpServerManagementState>()(
  persist(
    (set, get) => ({
      // Initial state
      servers: new Map(),
      instances: new Map(),
      installationStates: new Map(),
      serverTools: new Map(),
      isAddServerModalOpen: false,
      selectedServerId: null,
      
      // Actions
      addServer: async (serverData: AddServerFormData) => {
        const config = createServerConfig(serverData);
        
        set((state) => {
          const newServers = setMapEntry(state.servers, config.id, config);
          // Only update if the map reference actually changed
          if (newServers === state.servers) {
            return state; // No change needed
          }
          return { servers: newServers };
        });
        
        console.log(`📝 [MCP Management] Added server config: ${config.name}`);
        
        // Optionally auto-install after adding
        // await get().installAndStartServer(config.id);
      },
      
      removeServer: (serverId: string) => {
        set((state) => {
          // Check if the ID exists in any of the maps
          const hasServer = state.servers.has(serverId);
          const hasInstance = state.instances.has(serverId);
          const hasInstallationState = state.installationStates.has(serverId);
          const hasTools = state.serverTools.has(serverId);
          
          // If ID doesn't exist anywhere, no change needed
          if (!hasServer && !hasInstance && !hasInstallationState && !hasTools) {
            return state;
          }
          
          const newServers = deleteMapEntry(state.servers, serverId);
          const newInstances = deleteMapEntry(state.instances, serverId);
          const newInstallationStates = deleteMapEntry(state.installationStates, serverId);
          const newServerTools = deleteMapEntry(state.serverTools, serverId);
          
          return {
            servers: newServers,
            instances: newInstances,
            installationStates: newInstallationStates,
            serverTools: newServerTools,
            selectedServerId: state.selectedServerId === serverId ? null : state.selectedServerId
          };
        });
        
        console.log(`🗑️ [MCP Management] Removed server: ${serverId}`);
      },
      
      updateServer: (serverId: string, updates: Partial<McpServerConfig>) => {
        set((state) => {
          const server = state.servers.get(serverId);
          if (!server) return state;
          
          const updatedServer = {
            ...server,
            ...updates,
            updatedAt: Date.now()
          };
          
          const newServers = setMapEntry(state.servers, serverId, updatedServer);
          // Only update if the map reference actually changed
          if (newServers === state.servers) {
            return state; // No change needed
          }
          
          return { servers: newServers };
        });
        
        console.log(`📝 [MCP Management] Updated server config: ${serverId}`);
      },
      
      installAndStartServer: async (serverId: string) => {
        const server = get().servers.get(serverId);
        if (!server) {
          throw new Error(`Server not found: ${serverId}`);
        }
        
        // Set installation state
        set((state) => {
          const newInstallationStates = setMapEntry(state.installationStates, serverId, 'installing');
          return { installationStates: newInstallationStates };
        });
        
        try {
          console.log(`📦 [MCP Management] Installing and starting server: ${server.name}`);
          
          // Use McpServerManager which handles installation and starting via Rust commands
          const instance = await mcpServerManager.startServer(server);
          
          // Mark as installed and update instance
          set((state) => {
            const newInstallationStates = setMapEntry(state.installationStates, serverId, 'installed');
            const newInstances = setMapEntry(state.instances, serverId, instance);
            return {
              installationStates: newInstallationStates,
              instances: newInstances
            };
          });
          
          console.log(`✅ [MCP Management] Successfully installed and started server: ${server.name}`);
          
          // Auto-discover tools if server started successfully
          if (instance.status === McpServerStatus.RUNNING) {
            setTimeout(async () => {
              try {
                await get().discoverServerTools(serverId);
              } catch (error) {
                console.warn(`Initial tool discovery failed for ${serverId}:`, error);
              }
            }, 2000);
          }
          
        } catch (error) {
          console.error(`Failed to install/start server ${serverId}:`, error);
          
          set((state) => {
            const newInstallationStates = setMapEntry(state.installationStates, serverId, 'failed');
            return { installationStates: newInstallationStates };
          });
          
          throw error;
        }
      },
      
      stopServer: async (serverId: string) => {
        try {
          console.log(`🛑 [MCP Management] Stopping server: ${serverId}`);
          
          // Use McpServerManager to stop the server via Rust commands
          await mcpServerManager.stopServer(serverId);
          
          // Remove from instances after successful stop
          set((state) => {
            const newInstances = deleteMapEntry(state.instances, serverId);
            return { instances: newInstances };
          });
          
          console.log(`✅ [MCP Management] Server ${serverId} stopped successfully`);
          
        } catch (error) {
          console.error(`Failed to stop server ${serverId}:`, error);
          throw error;
        }
      },
      
      // Health & Tool Discovery Actions
      probeServerHealth: async (serverId: string): Promise<boolean> => {
        try {
          // Use McpServerManager to get current server status via Rust commands
          const instance = await mcpServerManager.getServerStatus(serverId);
          
          if (!instance) {
            // Server not found or not running
            set((state) => {
              const newInstances = deleteMapEntry(state.instances, serverId);
              return { instances: newInstances };
            });
            return false;
          }
          
          // Update local instance with latest status from Rust
          set((state) => {
            const newInstances = setMapEntry(state.instances, serverId, instance);
            return { instances: newInstances };
          });
          
          // Server is healthy if it's running and has no error
          const isHealthy = instance.status === McpServerStatus.RUNNING && !instance.error;
          
          console.log(`🔍 [MCP Management] Health check for ${serverId}: ${isHealthy ? 'healthy' : 'unhealthy'}`);
          return isHealthy;
          
        } catch (error) {
          console.error(`Health check failed for server ${serverId}:`, error);
          return false;
        }
      },
      
      discoverServerTools: async (serverId: string): Promise<McpToolDefinition[]> => {
        try {
          console.log(`🔍 [MCP Management] Discovering tools for server: ${serverId}`);
          
          // Use McpServerManager to discover tools via Rust commands
          const tools = await mcpServerManager.discoverTools(serverId);
          
          // Cache the discovered tools
          set((state) => {
            const newServerTools = setMapEntry(state.serverTools, serverId, tools);
            return { serverTools: newServerTools };
          });
          
          // Update instance with discovery timestamp and tools
          set((state) => {
            const currentInstance = state.instances.get(serverId);
            if (currentInstance) {
              const updatedInstance = {
                ...currentInstance,
                tools,
                discoveredAt: Date.now()
              };
              const newInstances = setMapEntry(state.instances, serverId, updatedInstance);
              return { instances: newInstances };
            }
            return state;
          });
          
          console.log(`✅ [MCP Management] Discovered ${tools.length} tools for server ${serverId}`);
          return tools;
          
        } catch (error) {
          console.error(`Tool discovery failed for server ${serverId}:`, error);
          throw error;
        }
      },
      
      // UI Actions
      openAddServerModal: () => set({ isAddServerModalOpen: true }),
      closeAddServerModal: () => set({ isAddServerModalOpen: false }),
      selectServer: (serverId: string | null) => set({ selectedServerId: serverId }),
      
      // Getters
      getServerById: (serverId: string) => get().servers.get(serverId),
      getRunningServers: () => Array.from(get().instances.values()),
      getAvailableServers: () => Array.from(get().servers.values()),
      getServerTools: (serverId: string) => get().serverTools.get(serverId) || []
    }),
    {
      name: 'mcp-server-management',
      // Persist server configurations and some runtime state
      partialize: (state) => ({
        servers: Array.from(state.servers.entries()),
        // Persist instances but not PID (not valid across restarts)
        instances: Array.from(state.instances.entries()).map(([id, instance]) => [
          id,
          {
            ...instance,
            pid: undefined, // Don't persist PID as it's not valid across restarts
          }
        ]),
        serverTools: Array.from(state.serverTools.entries())
      }),
      // Restore Maps from persisted arrays
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (Array.isArray(state.servers)) {
            state.servers = new Map(state.servers as any);
          }
          if (Array.isArray(state.instances)) {
            state.instances = new Map(state.instances as any);
          }
          if (Array.isArray(state.serverTools)) {
            state.serverTools = new Map(state.serverTools as any);
          }
        }
      }
    }
  )
);