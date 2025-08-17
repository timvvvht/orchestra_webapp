/**
 * Render Count Guard Test
 * 
 * Tests that MCP components don't exceed reasonable render limits.
 * Detects infinite render loops by monitoring render counts under React StrictMode.
 */

import { render } from '@testing-library/react';
import React, { useRef, useEffect, StrictMode } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  useServerInstances, 
  useRunningServers, 
  useServerTools,
  useMcpServerStore 
} from '@/stores/mcpServerStore';

// Global render counter for tracking across components
let globalRenderCount = 0;

// Component that tracks its own render count
function RenderCountTracker({ name = 'Component' }: { name?: string }) {
  const renderCount = useRef(0);
  const serverInstances = useServerInstances();
  const runningServers = useRunningServers();
  const serverTools = useServerTools('test-server');
  
  renderCount.current += 1;
  globalRenderCount += 1;
  
  useEffect(() => {
    console.log(`${name} rendered ${renderCount.current} times`);
  });
  
  return (
    <div data-testid={`render-tracker-${name.toLowerCase()}`}>
      <div>Component: {name}</div>
      <div>Render Count: {renderCount.current}</div>
      <div>Global Renders: {globalRenderCount}</div>
      <div>Server Instances: {serverInstances.length}</div>
      <div>Running Servers: {runningServers.length}</div>
      <div>Server Tools: {serverTools.length}</div>
    </div>
  );
}

// Component that uses multiple selectors
function MultiSelectorComponent() {
  const renderCount = useRef(0);
  renderCount.current += 1;
  globalRenderCount += 1;
  
  const serverInstances = useServerInstances();
  const runningServers = useRunningServers();
  const tools1 = useServerTools('server-1');
  const tools2 = useServerTools('server-2');
  const tools3 = useServerTools('server-3');
  
  return (
    <div data-testid="multi-selector">
      <div>Renders: {renderCount.current}</div>
      <div>Instances: {serverInstances.length}</div>
      <div>Running: {runningServers.length}</div>
      <div>Tools 1: {tools1.length}</div>
      <div>Tools 2: {tools2.length}</div>
      <div>Tools 3: {tools3.length}</div>
    </div>
  );
}

// Component with nested selectors
function NestedSelectorComponent() {
  const renderCount = useRef(0);
  renderCount.current += 1;
  globalRenderCount += 1;
  
  const serverInstances = useServerInstances();
  
  return (
    <div data-testid="nested-selector">
      <div>Parent Renders: {renderCount.current}</div>
      <div>Instances: {serverInstances.length}</div>
      {serverInstances.map((server, index) => (
        <ChildSelectorComponent key={server.config.id || index} serverId={server.config.id} />
      ))}
    </div>
  );
}

function ChildSelectorComponent({ serverId }: { serverId: string }) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  globalRenderCount += 1;
  
  const serverTools = useServerTools(serverId);
  
  return (
    <div data-testid={`child-${serverId}`}>
      <div>Child Renders: {renderCount.current}</div>
      <div>Tools: {serverTools.length}</div>
    </div>
  );
}

describe('MCP Render Count Guard', () => {
  beforeEach(() => {
    // Reset global render counter
    globalRenderCount = 0;
    
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

  it('should not exceed render limit under normal conditions', () => {
    render(<RenderCountTracker name="Normal" />);
    
    // Should render only once (or twice under StrictMode)
    expect(globalRenderCount).toBeLessThanOrEqual(2);
  });

  it('should not exceed render limit under StrictMode', () => {
    render(
      <StrictMode>
        <RenderCountTracker name="StrictMode" />
      </StrictMode>
    );
    
    // StrictMode causes double rendering in development
    // Should not exceed 2 renders
    expect(globalRenderCount).toBeLessThanOrEqual(2);
  });

  it('should handle multiple selectors without excessive renders', () => {
    render(
      <StrictMode>
        <MultiSelectorComponent />
      </StrictMode>
    );
    
    // Even with multiple selectors, should not exceed reasonable limit
    expect(globalRenderCount).toBeLessThanOrEqual(2);
  });

  it('should handle nested components with selectors', () => {
    render(
      <StrictMode>
        <NestedSelectorComponent />
      </StrictMode>
    );
    
    // Parent component should render ≤ 2 times
    // Since there are no servers initially, no child components should render
    expect(globalRenderCount).toBeLessThanOrEqual(2);
  });

  it('should handle nested components with data', () => {
    // Add some test data first
    const store = useMcpServerStore.getState();
    const mockServer1 = {
      config: { id: 'server-1', name: 'Server 1' },
      status: 'running' as any,
      port: 8080,
      pid: 12345,
      startedAt: Date.now()
    };
    const mockServer2 = {
      config: { id: 'server-2', name: 'Server 2' },
      status: 'stopped' as any,
      port: 8081,
      pid: 12346,
      startedAt: Date.now()
    };
    
    store.servers.set('server-1', mockServer1);
    store.servers.set('server-2', mockServer2);
    
    render(
      <StrictMode>
        <NestedSelectorComponent />
      </StrictMode>
    );
    
    // Parent (≤2) + 2 children (≤2 each) = ≤6 total renders
    expect(globalRenderCount).toBeLessThanOrEqual(6);
  });

  it('should not cause render explosion with store updates', () => {
    const { rerender } = render(
      <StrictMode>
        <RenderCountTracker name="UpdateTest" />
      </StrictMode>
    );
    
    // Reset counter after initial render
    globalRenderCount = 0;
    
    // Update store
    useMcpServerStore.setState({ 
      error: 'test error',
      lastDiscoveryTime: Date.now()
    });
    
    // Force re-render
    rerender(
      <StrictMode>
        <RenderCountTracker name="UpdateTest" />
      </StrictMode>
    );
    
    // Should not cause excessive re-renders
    expect(globalRenderCount).toBeLessThanOrEqual(2);
  });

  it('should detect potential infinite loops early', () => {
    // This test simulates what would happen if we had an infinite loop
    // We'll render multiple times and ensure it doesn't grow exponentially
    
    const { rerender } = render(<RenderCountTracker name="LoopTest" />);
    
    const initialRenderCount = globalRenderCount;
    
    // Force multiple re-renders (simulating what an infinite loop might do)
    for (let i = 0; i < 5; i++) {
      rerender(<RenderCountTracker name="LoopTest" />);
    }
    
    // Should have linear growth, not exponential
    const finalRenderCount = globalRenderCount;
    const additionalRenders = finalRenderCount - initialRenderCount;
    
    // Should be roughly 5 additional renders (one per rerender call)
    expect(additionalRenders).toBeLessThanOrEqual(10); // Allow some buffer
    expect(additionalRenders).toBeGreaterThanOrEqual(3); // But should have some renders
  });

  it('should provide render count diagnostics on failure', () => {
    render(<RenderCountTracker name="Diagnostic" />);
    
    // This test always passes but demonstrates how to get diagnostic info
    const renderInfo = {
      globalRenderCount,
      setStateCalls: globalThis.__ZUSTAND_SET_LOG__?.length || 0,
      timestamp: Date.now()
    };
    
    console.log('Render diagnostics:', renderInfo);
    
    expect(renderInfo.globalRenderCount).toBeGreaterThan(0);
  });
});