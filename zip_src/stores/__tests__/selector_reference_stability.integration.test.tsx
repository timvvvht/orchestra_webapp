/**
 * Selector Reference Stability Test
 * 
 * Tests that MCP selectors return stable references when underlying data hasn't changed.
 * This prevents infinite render loops caused by selectors returning new objects/arrays
 * on every call.
 */

import { render, act } from '@testing-library/react';
import React, { useRef, useEffect, useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  useServerInstances, 
  useRunningServers, 
  useServerTools,
  useMcpServerStore 
} from '@/stores/mcpServerStore';

// Global arrays to capture reference changes for analysis
const serverInstancesRefs: any[] = [];
const runningServersRefs: any[] = [];
const serverToolsRefs: any[] = [];

// Test component that uses all MCP selectors and tracks reference stability
function SelectorStabilityTracker() {
  const serverInstances = useServerInstances();
  const runningServers = useRunningServers();
  const serverTools = useServerTools('test-server');
  
  const serverInstancesPrev = useRef<any>();
  const runningServersPrev = useRef<any>();
  const serverToolsPrev = useRef<any>();
  
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setRenderCount(c => c + 1);
    
    // Track reference changes for serverInstances
    if (serverInstancesPrev.current !== undefined && serverInstancesPrev.current !== serverInstances) {
      serverInstancesRefs.push({
        prev: serverInstancesPrev.current,
        current: serverInstances,
        renderCount: renderCount + 1,
        identical: Object.is(serverInstancesPrev.current, serverInstances)
      });
    }
    serverInstancesPrev.current = serverInstances;
    
    // Track reference changes for runningServers
    if (runningServersPrev.current !== undefined && runningServersPrev.current !== runningServers) {
      runningServersRefs.push({
        prev: runningServersPrev.current,
        current: runningServers,
        renderCount: renderCount + 1,
        identical: Object.is(runningServersPrev.current, runningServers)
      });
    }
    runningServersPrev.current = runningServers;
    
    // Track reference changes for serverTools
    if (serverToolsPrev.current !== undefined && serverToolsPrev.current !== serverTools) {
      serverToolsRefs.push({
        prev: serverToolsPrev.current,
        current: serverTools,
        renderCount: renderCount + 1,
        identical: Object.is(serverToolsPrev.current, serverTools)
      });
    }
    serverToolsPrev.current = serverTools;
  });

  return (
    <div data-testid="selector-tracker">
      <div>Server Instances: {serverInstances.length}</div>
      <div>Running Servers: {runningServers.length}</div>
      <div>Server Tools: {serverTools.length}</div>
      <div>Render Count: {renderCount}</div>
    </div>
  );
}

describe('MCP Selector Reference Stability', () => {
  beforeEach(() => {
    // Clear reference tracking arrays
    serverInstancesRefs.length = 0;
    runningServersRefs.length = 0;
    serverToolsRefs.length = 0;
    
    // Reset store to clean state
    const store = useMcpServerStore.getState();
    store.servers.clear();
    store.configs.clear();
    store.discoveredTools.clear();
    
    // Clear any test logs
    if (globalThis.__ZUSTAND_SET_LOG__) {
      globalThis.__ZUSTAND_SET_LOG__.length = 0;
    }
  });

  it('should return stable references when no data changes', () => {
    const { rerender } = render(<SelectorStabilityTracker />);
    
    // Force a re-render without changing store data
    rerender(<SelectorStabilityTracker />);
    
    // No references should have changed since no store data changed
    expect(serverInstancesRefs).toHaveLength(0);
    expect(runningServersRefs).toHaveLength(0);
    expect(serverToolsRefs).toHaveLength(0);
  });

  it('should return stable references after unrelated store updates', () => {
    const { rerender } = render(<SelectorStabilityTracker />);
    
    // Update an unrelated part of the store
    act(() => {
      useMcpServerStore.setState({ 
        lastDiscoveryTime: Date.now(),
        error: 'test error'
      });
    });
    
    rerender(<SelectorStabilityTracker />);
    
    // References should still be stable since the data our selectors care about didn't change
    expect(serverInstancesRefs).toHaveLength(0);
    expect(runningServersRefs).toHaveLength(0);
    expect(serverToolsRefs).toHaveLength(0);
  });

  it('should create new references only when relevant data changes', () => {
    const { rerender } = render(<SelectorStabilityTracker />);
    
    // Add a server - this should cause serverInstances to change
    act(() => {
      const store = useMcpServerStore.getState();
      const mockServer = {
        config: { id: 'test-server', name: 'Test Server' },
        status: 'running' as any,
        port: 8080,
        pid: 12345,
        startedAt: Date.now()
      };
      store.servers.set('test-server', mockServer);
      
      // Trigger state update
      useMcpServerStore.setState({ servers: new Map(store.servers) });
    });
    
    rerender(<SelectorStabilityTracker />);
    
    // Now serverInstances and runningServers should have new references
    expect(serverInstancesRefs.length).toBeGreaterThan(0);
    expect(runningServersRefs.length).toBeGreaterThan(0);
    
    // But the references should be different (not identical)
    if (serverInstancesRefs.length > 0) {
      expect(serverInstancesRefs[0].identical).toBe(false);
    }
    if (runningServersRefs.length > 0) {
      expect(runningServersRefs[0].identical).toBe(false);
    }
  });

  it('should use EMPTY_TOOLS constant for consistent empty arrays', () => {
    const { rerender } = render(<SelectorStabilityTracker />);
    
    // Get tools for a non-existent server multiple times
    const tools1 = useMcpServerStore.getState().getServerTools('non-existent-1');
    const tools2 = useMcpServerStore.getState().getServerTools('non-existent-2');
    
    // Should return the same empty array reference
    expect(tools1).toBe(tools2);
    expect(tools1).toEqual([]);
    
    rerender(<SelectorStabilityTracker />);
    
    // serverTools selector should also be stable for non-existent servers
    expect(serverToolsRefs).toHaveLength(0);
  });

  it('should not cause infinite reference changes', () => {
    const { rerender } = render(<SelectorStabilityTracker />);
    
    // Force multiple re-renders
    for (let i = 0; i < 5; i++) {
      rerender(<SelectorStabilityTracker />);
    }
    
    // Should not accumulate reference changes without data changes
    expect(serverInstancesRefs).toHaveLength(0);
    expect(runningServersRefs).toHaveLength(0);
    expect(serverToolsRefs).toHaveLength(0);
  });
});