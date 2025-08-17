/**
 * Store Setter Spam Detection Test
 * 
 * Tests that MCP store setState is not called excessively during normal component renders.
 * Detects infinite loops caused by components triggering store updates on every render.
 */

import { render, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  useServerInstances, 
  useRunningServers, 
  useServerTools,
  useMcpServerStore 
} from '@/stores/mcpServerStore';

// Simple component that uses MCP selectors
function McpConsumer() {
  const serverInstances = useServerInstances();
  const runningServers = useRunningServers();
  const serverTools = useServerTools('test-server');
  
  return (
    <div data-testid="mcp-consumer">
      <div>Instances: {serverInstances.length}</div>
      <div>Running: {runningServers.length}</div>
      <div>Tools: {serverTools.length}</div>
    </div>
  );
}

// Component that might accidentally trigger store updates
function ProblematicComponent() {
  const serverInstances = useServerInstances();
  
  useEffect(() => {
    // This would be a problematic pattern - updating store in effect without proper deps
    // We'll test that this doesn't happen in our real components
    console.log('Effect ran with instances:', serverInstances.length);
  }); // Note: no dependency array - runs on every render
  
  return <div>Instances: {serverInstances.length}</div>;
}

describe('MCP Store Setter Spam Detection', () => {
  beforeEach(() => {
    // Reset store to clean state
    const store = useMcpServerStore.getState();
    store.servers.clear();
    store.configs.clear();
    store.discoveredTools.clear();
    
    // Clear the global setState log
    if (globalThis.__ZUSTAND_SET_LOG__) {
      globalThis.__ZUSTAND_SET_LOG__.length = 0;
    }
  });

  it('should not spam setState during normal component render', () => {
    render(<McpConsumer />);
    
    // After initial render, there should be minimal setState calls
    // (only initialization-related calls are acceptable)
    const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
    
    // Should have very few setState calls (≤ 2: initial state + any initialization)
    expect(setStateCalls.length).toBeLessThanOrEqual(2);
    
    // Log the calls for debugging if test fails
    if (setStateCalls.length > 2) {
      console.log('Excessive setState calls detected:', setStateCalls);
    }
  });

  it('should not trigger setState on re-renders without data changes', () => {
    const { rerender } = render(<McpConsumer />);
    
    // Clear log after initial render
    if (globalThis.__ZUSTAND_SET_LOG__) {
      globalThis.__ZUSTAND_SET_LOG__.length = 0;
    }
    
    // Force re-render
    rerender(<McpConsumer />);
    
    // Should not have triggered any setState calls
    const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
    expect(setStateCalls).toHaveLength(0);
  });

  it('should not cause setState loops with effects', () => {
    render(<ProblematicComponent />);
    
    // Even with a poorly written effect, our store should not cause loops
    const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
    
    // Should not have excessive calls
    expect(setStateCalls.length).toBeLessThanOrEqual(3);
  });

  it('should only trigger setState when explicitly updating store', () => {
    render(<McpConsumer />);
    
    // Clear log after initial render
    if (globalThis.__ZUSTAND_SET_LOG__) {
      globalThis.__ZUSTAND_SET_LOG__.length = 0;
    }
    
    // Explicitly update the store
    act(() => {
      useMcpServerStore.setState({ 
        error: 'test error',
        lastDiscoveryTime: Date.now()
      });
    });
    
    // Should have exactly 1 setState call
    const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
    expect(setStateCalls).toHaveLength(1);
    
    // Verify the call contains our updates
    expect(setStateCalls[0].partial).toEqual(
      expect.objectContaining({
        error: 'test error',
        lastDiscoveryTime: expect.any(Number)
      })
    );
  });

  it('should not accumulate setState calls over multiple renders', () => {
    const { rerender } = render(<McpConsumer />);
    
    // Clear log after initial render
    if (globalThis.__ZUSTAND_SET_LOG__) {
      globalThis.__ZUSTAND_SET_LOG__.length = 0;
    }
    
    // Multiple re-renders
    for (let i = 0; i < 5; i++) {
      rerender(<McpConsumer />);
    }
    
    // Should not accumulate setState calls
    const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
    expect(setStateCalls).toHaveLength(0);
  });

  it('should track setState call stack for debugging', () => {
    render(<McpConsumer />);
    
    // Trigger an explicit update
    act(() => {
      useMcpServerStore.setState({ selectedServerId: 'test' });
    });
    
    const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
    const lastCall = setStateCalls[setStateCalls.length - 1];
    
    // Should have stack trace for debugging
    expect(lastCall).toHaveProperty('stack');
    expect(lastCall.stack).toBeInstanceOf(Array);
    expect(lastCall.stack.length).toBeGreaterThan(0);
    
    // Should have timestamp
    expect(lastCall).toHaveProperty('timestamp');
    expect(typeof lastCall.timestamp).toBe('number');
    
    // Should have label
    expect(lastCall.label).toBe('MCP');
  });
});