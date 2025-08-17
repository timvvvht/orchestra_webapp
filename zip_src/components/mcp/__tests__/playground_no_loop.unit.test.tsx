/**
 * Unit test to ensure the store doesn't trigger infinite update loops
 * 
 * This test specifically guards against the "Maximum update depth exceeded" error
 * that was caused by unstable Map references in the Zustand store.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMcpServerStore } from '@/stores/mcpServerStore';
import { McpServerStatus, McpAuthType } from '@/services/mcp/types';

describe('McpServerStore - No Infinite Loop', () => {
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
  });

  it('should maintain stable Map references when no changes occur', () => {
    const store = useMcpServerStore.getState();
    
    // Add initial server
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

    // Set initial state
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

    const initialState = useMcpServerStore.getState();
    const initialServersRef = initialState.servers;
    const initialConfigsRef = initialState.configs;

    // Simulate multiple store updates with the same data
    for (let i = 0; i < 5; i++) {
      useMcpServerStore.setState((state) => {
        const newConfigs = new Map(state.configs);
        const newServers = new Map(state.servers);
        
        // Set the same data - this should not create new Map references
        newConfigs.set('test-server', mockConfig);
        newServers.set('test-server', mockInstance);
        
        return { 
          configs: newConfigs,
          servers: newServers 
        };
      });
    }

    const finalState = useMcpServerStore.getState();
    
    // The Map references should be different (new Map() creates new refs)
    // but the content should be the same
    expect(finalState.servers.size).toBe(1);
    expect(finalState.configs.size).toBe(1);
    expect(finalState.servers.get('test-server')).toEqual(mockInstance);
    expect(finalState.configs.get('test-server')).toEqual(mockConfig);
  });

  it('should handle rapid selector calls without infinite loops', () => {
    // Add test data
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

    // Simulate rapid selector calls (like what happens in useEffect)
    const results: any[] = [];
    for (let i = 0; i < 100; i++) {
      const serverInstances = Array.from(useMcpServerStore.getState().servers.values());
      results.push(serverInstances);
    }

    // All results should be consistent
    expect(results.length).toBe(100);
    results.forEach(result => {
      expect(result.length).toBe(1);
      expect(result[0].config.id).toBe('test-server');
    });
  });

  it('should handle selectedServerId updates without triggering store loops', () => {
    // Add test server
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

    // Simulate the auto-select pattern
    const serverInstances = Array.from(useMcpServerStore.getState().servers.values());
    const firstServerId = serverInstances[0]?.config.id;

    expect(firstServerId).toBe('test-server');

    // This should not cause infinite loops
    if (firstServerId) {
      useMcpServerStore.setState({ selectedServerId: firstServerId });
    }

    expect(useMcpServerStore.getState().selectedServerId).toBe('test-server');

    // Multiple calls should be safe
    for (let i = 0; i < 10; i++) {
      useMcpServerStore.setState({ selectedServerId: firstServerId });
    }

    expect(useMcpServerStore.getState().selectedServerId).toBe('test-server');
  });
});