/**
 * MCP Server Store
 * 
 * Zustand store for managing MCP server state, configurations, and UI interactions.
 * Provides reactive state management for MCP server lifecycle and tool discovery.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { useShallow } from 'zustand/react/shallow';
import { traceSet } from './dev/traceSet';
import { areMapsEqual, setMapEntry, deleteMapEntry } from './utils/mapUtils';
import { 
  McpServerConfig, 
  McpServerInstance, 
  McpServerStatus, 
  McpToolDefinition,
  McpOAuthConfig,
  McpOAuthTokens,
  McpAuthType
} from '@/services/mcp/types';
import { mcpServerManager } from '@/services/mcp/McpServerManager';
import { ensureMcpInstalled } from '@/services/mcp/installation';
import { mcpOAuthService } from '@/services/mcp/oauth';
import type { ToolSpec } from '@/utils/registerSessionTools';

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface McpServerStore {
  // Server configurations and instances
  servers: Map<string, McpServerInstance>;
  configs: Map<string, McpServerConfig>;
  
  // UI state
  isLoading: boolean;
  selectedServerId: string | null;
  error: string | null;
  
  // Tool discovery state
  discoveredTools: Map<string, McpToolDefinition[]>;
  toolSpecs: ToolSpec[];
  lastDiscoveryTime: number | null;
  
  // Installation state
  installationStates: Map<string, 'idle' | 'installing' | 'installed' | 'failed'>;
  
  // OAuth state
  oauthStates: Map<string, 'idle' | 'authorizing' | 'exchanging' | 'completed' | 'error'>;
  tokens: Map<string, McpOAuthTokens>;
  
  // Actions - Server Management
  addServerConfig: (config: McpServerConfig) => void;
  updateServerConfig: (id: string, updates: Partial<McpServerConfig>) => void;
  removeServerConfig: (id: string) => void;
  getServerConfig: (id: string) => McpServerConfig | undefined;
  
  // Actions - Server Lifecycle
  startServer: (id: string) => Promise<void>;
  stopServer: (id: string) => Promise<void>;
  restartServer: (id: string) => Promise<void>;
  refreshServerStatus: (id: string) => Promise<void>;
  refreshAllServers: () => Promise<void>;
  
  // Actions - Installation
  installAndStartServer: (id: string) => Promise<void>;
  
  // Actions - Tool Discovery
  discoverTools: (serverId: string) => Promise<void>;
  refreshAllTools: () => Promise<void>;
  getServerTools: (serverId: string) => McpToolDefinition[];
  getAllToolSpecs: () => ToolSpec[];
  
  // Actions - OAuth
  startOAuthFlow: (serverId: string) => Promise<string>;
  handleOAuthCallback: (callbackUrl: string) => Promise<void>;
  refreshToken: (serverId: string) => Promise<void>;
  revokeTokens: (serverId: string) => void;
  
  // Actions - UI State
  setSelectedServer: (id: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Actions - Initialization
  initialize: () => Promise<void>;
  startHealthMonitoring: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

// Store configuration function
const storeConfig = (set: any, get: any) => ({
    // Initial state
    servers: new Map(),
    configs: new Map(),
    isLoading: false,
    selectedServerId: null,
    error: null,
    discoveredTools: new Map(),
    toolSpecs: [],
    lastDiscoveryTime: null,
    installationStates: new Map(),
    oauthStates: new Map(),
    tokens: new Map(),

    // ========================================================================
    // SERVER CONFIGURATION ACTIONS
    // ========================================================================

    addServerConfig: (config: McpServerConfig) => {
      set((state) => {
        const newConfigs = setMapEntry(state.configs, config.id, config);
        // Only update if the map reference actually changed
        if (newConfigs === state.configs) {
          return state; // No change needed
        }
        return { configs: newConfigs };
      });
      console.log(`📝 [MCP Store] Added server config: ${config.name}`);
    },

    updateServerConfig: (id: string, updates: Partial<McpServerConfig>) => {
      set((state) => {
        const existing = state.configs.get(id);
        if (!existing) {
          return state; // No change if config doesn't exist
        }
        
        const updatedConfig = { 
          ...existing, 
          ...updates, 
          updatedAt: Date.now() 
        };
        
        const newConfigs = setMapEntry(state.configs, id, updatedConfig);
        // Only update if the map reference actually changed
        if (newConfigs === state.configs) {
          return state; // No change needed
        }
        return { configs: newConfigs };
      });
      console.log(`📝 [MCP Store] Updated server config: ${id}`);
    },

    removeServerConfig: (id: string) => {
      set((state) => {
        // Check if the ID exists in any of the maps
        const hasConfig = state.configs.has(id);
        const hasServer = state.servers.has(id);
        const hasTools = state.discoveredTools.has(id);
        const hasOAuthState = state.oauthStates.has(id);
        const hasTokens = state.tokens.has(id);
        
        // If ID doesn't exist anywhere, no change needed
        if (!hasConfig && !hasServer && !hasTools && !hasOAuthState && !hasTokens) {
          return state;
        }
        
        const newConfigs = deleteMapEntry(state.configs, id);
        const newServers = deleteMapEntry(state.servers, id);
        const newTools = deleteMapEntry(state.discoveredTools, id);
        const newInstallationStates = deleteMapEntry(state.installationStates, id);
        const newOAuthStates = deleteMapEntry(state.oauthStates, id);
        const newTokens = deleteMapEntry(state.tokens, id);
        
        return { 
          configs: newConfigs,
          servers: newServers,
          discoveredTools: newTools,
          installationStates: newInstallationStates,
          oauthStates: newOAuthStates,
          tokens: newTokens,
          selectedServerId: state.selectedServerId === id ? null : state.selectedServerId
        };
      });
      console.log(`🗑️ [MCP Store] Removed server config: ${id}`);
    },

    getServerConfig: (id: string) => {
      return get().configs.get(id);
    },

    // ========================================================================
    // SERVER LIFECYCLE ACTIONS
    // ========================================================================

    startServer: async (id: string) => {
      const { configs } = get();
      const config = configs.get(id);
      
      if (!config) {
        throw new Error(`Server config not found: ${id}`);
      }

      set({ isLoading: true, error: null });

      try {
        console.log(`🚀 [MCP Store] Starting server: ${config.name}`);
        
        const instance = await mcpServerManager.startServer(config);
        
        set((state) => {
          const newServers = setMapEntry(state.servers, id, instance);
          // Only update if the map reference actually changed
          if (newServers === state.servers) {
            return { ...state, isLoading: false }; // Update loading state but keep same servers map
          }
          return { 
            servers: newServers, 
            isLoading: false 
          };
        });

        // Auto-discover tools if server started successfully
        if (instance.status === McpServerStatus.RUNNING) {
          get().discoverTools(id).catch(error => {
            console.error(`Failed to auto-discover tools for ${id}:`, error);
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        set({ 
          isLoading: false, 
          error: errorMessage 
        });
        throw error;
      }
    },

    stopServer: async (id: string) => {
      set({ isLoading: true, error: null });

      try {
        console.log(`🛑 [MCP Store] Stopping server: ${id}`);
        
        await mcpServerManager.stopServer(id);
        
        set((state) => {
          const server = state.servers.get(id);
          let newServers = state.servers;
          
          if (server) {
            const updatedServer = {
              ...server,
              status: McpServerStatus.STOPPED,
              tools: undefined,
              discoveredAt: undefined
            };
            newServers = setMapEntry(state.servers, id, updatedServer);
          }
          
          const newTools = deleteMapEntry(state.discoveredTools, id);
          
          // Only update if something actually changed
          if (newServers === state.servers && newTools === state.discoveredTools) {
            return { ...state, isLoading: false };
          }
          
          return { 
            servers: newServers,
            discoveredTools: newTools,
            isLoading: false 
          };
        });

        // Update tool specs
        get().refreshAllTools();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        set({ 
          isLoading: false, 
          error: errorMessage 
        });
        throw error;
      }
    },

    restartServer: async (id: string) => {
      set({ isLoading: true, error: null });

      try {
        console.log(`🔄 [MCP Store] Restarting server: ${id}`);
        
        const instance = await mcpServerManager.restartServer(id);
        
        set((state) => {
          const newServers = setMapEntry(state.servers, id, instance);
          // Only update if the map reference actually changed
          if (newServers === state.servers) {
            return { ...state, isLoading: false }; // Update loading state but keep same servers map
          }
          return { 
            servers: newServers, 
            isLoading: false 
          };
        });

        // Auto-discover tools after restart
        if (instance.status === McpServerStatus.RUNNING) {
          get().discoverTools(id).catch(error => {
            console.error(`Failed to auto-discover tools after restart for ${id}:`, error);
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        set({ 
          isLoading: false, 
          error: errorMessage 
        });
        throw error;
      }
    },

    refreshServerStatus: async (id: string) => {
      try {
        const instance = await mcpServerManager.getServerStatus(id);
        
        if (instance) {
          set((state) => {
            const newServers = setMapEntry(state.servers, id, instance);
            // Only update if the map reference actually changed
            if (newServers === state.servers) {
              return state; // No change needed
            }
            return { servers: newServers };
          });
        }

      } catch (error) {
        console.error(`Failed to refresh status for server ${id}:`, error);
      }
    },

    refreshAllServers: async () => {
      try {
        const instances = await mcpServerManager.listServers();
        
        set((state) => {
          let newServers = state.servers;
          let hasChanges = false;
          
          for (const instance of instances) {
            const updatedServers = setMapEntry(newServers, instance.config.id, instance);
            if (updatedServers !== newServers) {
              newServers = updatedServers;
              hasChanges = true;
            }
          }
          
          // Only update if something actually changed
          if (!hasChanges) {
            return state;
          }
          
          return { servers: newServers };
        });

      } catch (error) {
        console.error('Failed to refresh all servers:', error);
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    // ========================================================================
    // INSTALLATION ACTIONS
    // ========================================================================

    installAndStartServer: async (id: string) => {
      const { configs } = get();
      const config = configs.get(id);
      
      if (!config) {
        throw new Error(`Server config not found: ${id}`);
      }

      // Set installation state to 'installing'
      set((state) => {
        const newInstallationStates = setMapEntry(state.installationStates, id, 'installing');
        return { 
          installationStates: newInstallationStates,
          isLoading: true, 
          error: null 
        };
      });

      try {
        console.log(`📦 [MCP Store] Installing and starting server: ${config.name}`);
        
        // Ensure the MCP server is installed
        await ensureMcpInstalled(config);
        
        // Mark as installed
        set((state) => {
          const newInstallationStates = setMapEntry(state.installationStates, id, 'installed');
          return { installationStates: newInstallationStates };
        });

        // Start the server using existing startServer logic
        const instance = await mcpServerManager.startServer(config);
        
        set((state) => {
          const newServers = setMapEntry(state.servers, id, instance);
          return { 
            servers: newServers, 
            isLoading: false 
          };
        });

        // Auto-discover tools if server started successfully
        if (instance.status === McpServerStatus.RUNNING) {
          get().discoverTools(id).catch(error => {
            console.error(`Failed to auto-discover tools for ${id}:`, error);
          });
        }

        console.log(`✅ [MCP Store] Successfully installed and started server: ${config.name}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Mark installation as failed
        set((state) => {
          const newInstallationStates = setMapEntry(state.installationStates, id, 'failed');
          return { 
            installationStates: newInstallationStates,
            isLoading: false, 
            error: errorMessage 
          };
        });
        
        console.error(`❌ [MCP Store] Failed to install and start server ${config.name}:`, errorMessage);
        throw error;
      }
    },

    // ========================================================================
    // TOOL DISCOVERY ACTIONS
    // ========================================================================

    discoverTools: async (serverId: string) => {
      try {
        console.log(`🔍 [MCP Store] Discovering tools for server: ${serverId}`);
        
        const tools = await mcpServerManager.discoverTools(serverId);
        
        set((state) => {
          const newTools = setMapEntry(state.discoveredTools, serverId, tools);
          
          // Update server instance with tools
          let newServers = state.servers;
          const server = state.servers.get(serverId);
          if (server) {
            const updatedServer = {
              ...server,
              tools: tools,
              discoveredAt: Date.now()
            };
            newServers = setMapEntry(state.servers, serverId, updatedServer);
          }
          
          // Only update if something actually changed
          if (newTools === state.discoveredTools && newServers === state.servers) {
            return { ...state, lastDiscoveryTime: Date.now() };
          }
          
          return { 
            discoveredTools: newTools,
            servers: newServers,
            lastDiscoveryTime: Date.now()
          };
        });

        // Refresh tool specs
        get().refreshAllTools();

      } catch (error) {
        console.error(`Failed to discover tools for server ${serverId}:`, error);
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    refreshAllTools: () => {
      const toolSpecs = mcpServerManager.getAllToolSpecs();
      set({ toolSpecs });
      console.log(`🔧 [MCP Store] Refreshed tool specs: ${toolSpecs.length} tools available`);
    },

    getServerTools: (serverId: string) => {
      return get().discoveredTools.get(serverId) || [];
    },

    getAllToolSpecs: () => {
      return get().toolSpecs;
    },

    // ========================================================================
    // OAUTH ACTIONS
    // ========================================================================

    startOAuthFlow: async (serverId: string) => {
      const { configs } = get();
      const config = configs.get(serverId);
      
      if (!config || !config.oauthConfig) {
        throw new Error(`OAuth config not found for server: ${serverId}`);
      }

      set((state) => {
        const newOAuthStates = setMapEntry(state.oauthStates, serverId, 'authorizing');
        // Only update if the map reference actually changed
        if (newOAuthStates === state.oauthStates) {
          return state; // No change needed
        }
        return { oauthStates: newOAuthStates };
      });

      try {
        console.log(`🔐 [MCP Store] Starting OAuth flow for server: ${serverId}`);
        
        const { authorizationUrl } = await mcpOAuthService.startAuthorizationFlow(
          serverId, 
          config.oauthConfig
        );

        // Open authorization URL in browser
        window.open(authorizationUrl, '_blank');

        return authorizationUrl;

      } catch (error) {
        set((state) => {
          const newOAuthStates = setMapEntry(state.oauthStates, serverId, 'error');
          // Only update if the map reference actually changed
          if (newOAuthStates === state.oauthStates) {
            return { 
              ...state,
              error: error instanceof Error ? error.message : String(error)
            };
          }
          return { 
            oauthStates: newOAuthStates,
            error: error instanceof Error ? error.message : String(error)
          };
        });
        throw error;
      }
    },

    handleOAuthCallback: async (callbackUrl: string) => {
      try {
        console.log(`🔐 [MCP Store] Handling OAuth callback`);
        
        // Find the server config that matches the callback
        const { configs } = get();
        let matchingConfig: McpServerConfig | undefined;
        
        for (const config of configs.values()) {
          if (config.oauthConfig) {
            // For now, assume the first OAuth config matches
            // In a real implementation, you'd parse the state parameter
            matchingConfig = config;
            break;
          }
        }

        if (!matchingConfig || !matchingConfig.oauthConfig) {
          throw new Error('No matching OAuth configuration found');
        }

        set((state) => {
          const newOAuthStates = setMapEntry(state.oauthStates, matchingConfig!.id, 'exchanging');
          // Only update if the map reference actually changed
          if (newOAuthStates === state.oauthStates) {
            return state; // No change needed
          }
          return { oauthStates: newOAuthStates };
        });

        const { serverId, tokens } = await mcpOAuthService.handleCallback(
          callbackUrl, 
          matchingConfig.oauthConfig
        );

        set((state) => {
          const newOAuthStates = setMapEntry(state.oauthStates, serverId, 'completed');
          const newTokens = setMapEntry(state.tokens, serverId, tokens);
          
          // Only update if something actually changed
          if (newOAuthStates === state.oauthStates && newTokens === state.tokens) {
            return state; // No change needed
          }
          
          return { 
            oauthStates: newOAuthStates,
            tokens: newTokens
          };
        });

        console.log(`✅ [MCP Store] OAuth flow completed for server: ${serverId}`);

      } catch (error) {
        console.error('OAuth callback handling failed:', error);
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    refreshToken: async (serverId: string) => {
      const { configs } = get();
      const config = configs.get(serverId);
      
      if (!config || !config.oauthConfig) {
        throw new Error(`OAuth config not found for server: ${serverId}`);
      }

      try {
        console.log(`🔄 [MCP Store] Refreshing token for server: ${serverId}`);
        
        const tokens = await mcpOAuthService.refreshToken(serverId, config.oauthConfig);
        
        set((state) => {
          const newTokens = setMapEntry(state.tokens, serverId, tokens);
          // Only update if the map reference actually changed
          if (newTokens === state.tokens) {
            return state; // No change needed
          }
          return { tokens: newTokens };
        });

      } catch (error) {
        console.error(`Failed to refresh token for server ${serverId}:`, error);
        set({ error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },

    revokeTokens: (serverId: string) => {
      mcpOAuthService.revokeTokens(serverId);
      
      set((state) => {
        const newTokens = deleteMapEntry(state.tokens, serverId);
        const newOAuthStates = setMapEntry(state.oauthStates, serverId, 'idle');
        
        // Only update if something actually changed
        if (newTokens === state.tokens && newOAuthStates === state.oauthStates) {
          return state; // No change needed
        }
        
        return { 
          tokens: newTokens,
          oauthStates: newOAuthStates
        };
      });

      console.log(`🗑️ [MCP Store] Revoked tokens for server: ${serverId}`);
    },

    // ========================================================================
    // UI STATE ACTIONS
    // ========================================================================

    setSelectedServer: (id: string | null) => {
      set({ selectedServerId: id });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    },

    // ========================================================================
    // INITIALIZATION ACTIONS
    // ========================================================================

    initialize: async () => {
      console.log('🔧 [MCP Store] Initializing MCP server store');
      
      set({ isLoading: true });

      try {
        // Load server configurations from storage
        // In a real implementation, this would load from persistent storage
        const defaultConfigs = get().loadDefaultConfigs();
        
        set((state) => {
          let newConfigs = state.configs;
          let hasChanges = false;
          
          for (const config of defaultConfigs) {
            const updatedConfigs = setMapEntry(newConfigs, config.id, config);
            if (updatedConfigs !== newConfigs) {
              newConfigs = updatedConfigs;
              hasChanges = true;
            }
          }
          
          // Only update if something actually changed
          if (!hasChanges) {
            return state;
          }
          
          return { configs: newConfigs };
        });

        // Refresh server statuses
        await get().refreshAllServers();
        
        // Start health monitoring
        get().startHealthMonitoring();

        set({ isLoading: false });
        console.log('✅ [MCP Store] Initialization complete');

      } catch (error) {
        console.error('❌ [MCP Store] Initialization failed:', error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    },

    startHealthMonitoring: () => {
      mcpServerManager.startHealthMonitoring(30000); // 30 seconds
      console.log('💓 [MCP Store] Health monitoring started');
    },

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    loadDefaultConfigs: (): McpServerConfig[] => {
      // Return some default configurations for testing
      return [
        {
          id: 'file-server',
          name: 'File Operations Server',
          execPath: '/usr/local/bin/mcp-file-server',
          authType: 'none' as McpAuthType,
          enabled: true,
          autoStart: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'web-server',
          name: 'Web Scraping Server',
          execPath: '/usr/local/bin/mcp-web-server',
          authType: 'oauth' as McpAuthType,
          oauthConfig: {
            provider: 'github',
            clientId: 'your-client-id',
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            scopes: ['repo', 'read:user'],
            usePKCE: true,
            codeChallengeMethod: 'S256'
          },
          enabled: false,
          autoStart: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
    }
  });

// Create store with conditional tracing middleware
export const useMcpServerStore = create<McpServerStore>()(
  process.env.NODE_ENV === 'test' 
    ? subscribeWithSelector(traceSet(storeConfig))
    : subscribeWithSelector(storeConfig)
);

// ============================================================================
// STORE SELECTORS
// ============================================================================

// Stable empty array to avoid re-allocations when no tools exist
const EMPTY_TOOLS: McpToolDefinition[] = [];

// Selector for getting all server instances as array
export const useServerInstances = () => 
  useMcpServerStore(
    useShallow((state) => Array.from(state.servers.values()))
  );

// Selector for getting running servers
export const useRunningServers = () => 
  useMcpServerStore(
    useShallow((state) =>
      Array.from(state.servers.values()).filter(
        server => server.status === McpServerStatus.RUNNING
      )
    )
  );

// Selector for getting server by ID
export const useServerById = (id: string) => 
  useMcpServerStore(state => state.servers.get(id));

// Selector for getting server config by ID
export const useServerConfigById = (id: string) => 
  useMcpServerStore(state => state.configs.get(id));

// Selector for getting tools for a specific server
export const useServerTools = (serverId: string) => 
  useMcpServerStore(
    useShallow((state) => state.discoveredTools.get(serverId) ?? EMPTY_TOOLS)
  );

// Selector for getting OAuth state for a server
export const useOAuthState = (serverId: string) => 
  useMcpServerStore(state => state.oauthStates.get(serverId) || 'idle');

// Selector for getting tokens for a server
export const useServerTokens = (serverId: string) => 
  useMcpServerStore(state => state.tokens.get(serverId));

// Selector for getting installation state for a server
export const useInstallationState = (serverId: string) => 
  useMcpServerStore(state => state.installationStates.get(serverId) || 'idle');

// ============================================================================
// STORE INITIALIZATION
// ============================================================================

// Auto-initialize the store when imported
// Note: Commented out for testing to avoid initialization issues
// useMcpServerStore.getState().initialize();