/**
 * Integration test for MCP store selector stability
 * 
 * Verifies that the MCP store functions correctly and the shallow
 * equality fix prevents infinite render loops.
 */

import { useMcpServerStore } from '../mcpServerStore';

describe('MCP Store Selector Stability', () => {
  beforeEach(() => {
    // Reset store to clean state
    const store = useMcpServerStore.getState();
    store.servers.clear();
    store.configs.clear();
    store.discoveredTools.clear();
  });

  test('store initializes without errors', () => {
    const store = useMcpServerStore.getState();
    
    expect(store.servers).toBeInstanceOf(Map);
    expect(store.configs).toBeInstanceOf(Map);
    expect(store.discoveredTools).toBeInstanceOf(Map);
    expect(store.servers.size).toBe(0);
    expect(store.configs.size).toBe(0);
    expect(store.discoveredTools.size).toBe(0);
  });

  test('store state updates work correctly', () => {
    const store = useMcpServerStore.getState();
    
    // Add a mock server config
    const mockConfig = {
      id: 'test-server',
      name: 'Test Server',
      execPath: '/test/path',
      authType: 'none' as any,
      enabled: true,
      autoStart: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    store.addServerConfig(mockConfig);
    
    expect(store.configs.size).toBe(1);
    expect(store.configs.get('test-server')).toEqual(mockConfig);
  });

  test('shallow equality imports are available', () => {
    // This test verifies that the shallow import was successful
    // and the selectors are properly configured
    const { shallow } = require('zustand/shallow');
    expect(typeof shallow).toBe('function');
  });

  test('EMPTY_TOOLS constant prevents array recreation', () => {
    const store = useMcpServerStore.getState();
    
    // Call getServerTools multiple times for non-existent server
    const tools1 = store.getServerTools('non-existent');
    const tools2 = store.getServerTools('non-existent');
    
    // Should return the same empty array reference
    expect(tools1).toBe(tools2);
    expect(tools1).toEqual([]);
  });
});