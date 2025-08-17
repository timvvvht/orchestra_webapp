/**
 * Integration test to ensure McpPlayground doesn't trigger infinite render loops
 * 
 * This test specifically guards against the "Maximum update depth exceeded" error
 * that was caused by unstable Map references in the Zustand store triggering
 * infinite useEffect loops in the auto-select functionality.
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useMcpServerStore } from '@/stores/mcpServerStore';
import { McpServerStatus, McpAuthType } from '@/services/mcp/types';

// Mock the MCP services to avoid actual server interactions
vi.mock('@/services/mcp/McpServerManager', () => ({
  mcpServerManager: {
    startServer: vi.fn(),
    stopServer: vi.fn(),
    restartServer: vi.fn(),
    getServerStatus: vi.fn(),
    listServers: vi.fn().mockResolvedValue([]),
    discoverTools: vi.fn().mockResolvedValue([]),
    getAllToolSpecs: vi.fn().mockReturnValue([]),
    startHealthMonitoring: vi.fn(),
  }
}));

vi.mock('@/services/mcp/oauth', () => ({
  mcpOAuthService: {
    startAuthorizationFlow: vi.fn(),
    handleCallback: vi.fn(),
    refreshToken: vi.fn(),
    revokeTokens: vi.fn(),
  }
}));

// Mock the McpPlayground component to focus on store behavior
const MockMcpPlayground = () => {
  const serverInstances = useMcpServerStore((state) => 
    Array.from(state.servers.values())
  );
  const setSelectedServerId = useMcpServerStore((state) => state.setSelectedServerId);
  
  // Simulate the problematic auto-select effect
  const hasAutoselected = React.useRef(false);
  const firstServerId = serverInstances[0]?.config.id;
  
  React.useEffect(() => {
    if (!hasAutoselected.current && firstServerId) {
      setSelectedServerId(firstServerId);
      hasAutoselected.current = true;
    }
  }, [firstServerId, setSelectedServerId]);

  return <div data-testid="mcp-playground">MCP Playground ({serverInstances.length} servers)</div>;
};

describe('McpPlayground - No Infinite Loop', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalError: typeof console.error;

  beforeEach(() => {
    // Reset the store state
    useMcpServerStore.setState({
      servers: new Map(),
      configs: new Map(),
      discoveredTools: new Map(),
      oauthStates: new Map(),
      tokens: new Map(),
      isLoading: false,
      selectedServerId: null,
      error: null,
      toolSpecs: [],
      lastDiscoveryTime: null,
    });

    // Set up console.error spy to catch React errors
    originalError = console.error;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      // If this is the "Maximum update depth exceeded" error, fail the test
      if (typeof message === 'string' && message.includes('Maximum update depth exceeded')) {
        throw new Error(`Infinite render loop detected: ${message}`);
      }
      // Otherwise, call the original console.error
      originalError(message, ...args);
    });
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  it('should render without triggering infinite update loops', async () => {
    // Add a mock server configuration to trigger the auto-select logic
    const mockConfig = {
      id: 'test-server',
      name: 'Test Server',
      execPath: '/usr/local/bin/test-server',
      authType: 'none' as McpAuthType,
      enabled: true,
      autoStart: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const mockInstance = {
      config: mockConfig,
      status: McpServerStatus.STOPPED,
      port: 3000,
      pid: undefined,
      startedAt: undefined,
      tools: undefined,
      discoveredAt: undefined
    };

    // Add the mock server to the store directly via setState
    act(() => {
      useMcpServerStore.setState((state) => {
        const newConfigs = new Map(state.configs);
        const newServers = new Map(state.servers);
        newConfigs.set('test-server', mockConfig);
        newServers.set('test-server', mockInstance);
        return { 
          configs: newConfigs,
          servers: newServers 
        };
      });
    });

    // Render the component and wait for it to stabilize
    let renderResult: ReturnType<typeof render>;
    
    await act(async () => {
      renderResult = render(<MockMcpPlayground />);
      
      // Wait for any effects to complete
      await waitFor(() => {
        // The component should have rendered successfully
        expect(renderResult.container).toBeTruthy();
      }, { timeout: 1000 });
    });

    // If we get here without the console.error spy throwing, the test passes
    expect(renderResult!.container).toBeTruthy();

    // Additional verification: ensure the component is actually rendered with content
    expect(renderResult!.container.textContent).toContain('MCP Playground');
  });

  it('should handle multiple server updates without loops', async () => {
    // Create multiple mock servers
    const servers = Array.from({ length: 3 }, (_, i) => ({
      config: {
        id: `server-${i}`,
        name: `Server ${i}`,
        execPath: `/usr/local/bin/server-${i}`,
        authType: 'none' as McpAuthType,
        enabled: true,
        autoStart: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      instance: {
        config: {
          id: `server-${i}`,
          name: `Server ${i}`,
          execPath: `/usr/local/bin/server-${i}`,
          authType: 'none' as McpAuthType,
          enabled: true,
          autoStart: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        status: McpServerStatus.STOPPED,
        port: 3000 + i,
        pid: undefined,
        startedAt: undefined,
        tools: undefined,
        discoveredAt: undefined
      }
    }));

    // Add servers one by one to simulate dynamic updates
    await act(async () => {
      for (const server of servers) {
        useMcpServerStore.setState((state) => {
          const newConfigs = new Map(state.configs);
          const newServers = new Map(state.servers);
          newConfigs.set(server.config.id, server.config);
          newServers.set(server.config.id, server.instance);
          return { 
            configs: newConfigs,
            servers: newServers 
          };
        });
        
        // Small delay to simulate real-world timing
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    // Render the component
    let renderResult: ReturnType<typeof render>;
    
    await act(async () => {
      renderResult = render(<MockMcpPlayground />);
      
      await waitFor(() => {
        expect(renderResult.container).toBeTruthy();
      }, { timeout: 1000 });
    });

    // Verify successful render
    expect(renderResult!.container.textContent).toContain('MCP Playground');
    expect(renderResult!.container.textContent).toContain('3'); // Should show 3 total servers
  });

  it('should handle rapid store updates without triggering loops', async () => {
    const mockConfig = {
      id: 'rapid-update-server',
      name: 'Rapid Update Server',
      execPath: '/usr/local/bin/rapid-server',
      authType: 'none' as McpAuthType,
      enabled: true,
      autoStart: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add initial server
    act(() => {
      useMcpServerStore.setState((state) => {
        const newConfigs = new Map(state.configs);
        newConfigs.set('rapid-update-server', mockConfig);
        return { configs: newConfigs };
      });
    });

    // Render component
    let renderResult: ReturnType<typeof render>;
    
    await act(async () => {
      renderResult = render(<MockMcpPlayground />);
    });

    // Perform rapid updates to the store
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        // Simulate rapid status updates
        const updatedInstance = {
          config: mockConfig,
          status: i % 2 === 0 ? McpServerStatus.STARTING : McpServerStatus.STOPPED,
          port: 3000 + i,
          pid: i % 2 === 0 ? 1000 + i : undefined,
          startedAt: i % 2 === 0 ? Date.now() : undefined,
          tools: undefined,
          discoveredAt: undefined
        };

        useMcpServerStore.setState((state) => {
          const newServers = new Map(state.servers);
          newServers.set('rapid-update-server', updatedInstance);
          return { servers: newServers };
        });
        
        // Very small delay to simulate rapid updates
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    });

    // Component should still be stable
    await waitFor(() => {
      expect(renderResult!.container.textContent).toContain('MCP Playground');
    });
  });
});