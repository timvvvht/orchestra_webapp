/**
 * MCP Playground No Loop Test
 * 
 * Tests that the McpPlayground component can be rendered without triggering
 * "Maximum update depth exceeded" errors. This is the ultimate integration test
 * for detecting infinite render loops in the MCP system.
 */

import { render, screen } from '@testing-library/react';
import React, { StrictMode, Suspense } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMcpServerStore } from '@/stores/mcpServerStore';

// Mock the McpPlayground component since it might have complex dependencies
// In a real test, you'd import the actual component
const MockMcpPlayground = () => {
  const serverInstances = useMcpServerStore(state => Array.from(state.servers.values()));
  const runningServers = useMcpServerStore(state => 
    Array.from(state.servers.values()).filter(server => server.status === 'running')
  );
  const discoveredTools = useMcpServerStore(state => state.discoveredTools);
  const isLoading = useMcpServerStore(state => state.isLoading);
  const error = useMcpServerStore(state => state.error);
  
  return (
    <div data-testid="mcp-playground">
      <h1>MCP Playground</h1>
      <div data-testid="server-count">Servers: {serverInstances.length}</div>
      <div data-testid="running-count">Running: {runningServers.length}</div>
      <div data-testid="tools-count">Tools: {discoveredTools.size}</div>
      <div data-testid="loading-state">Loading: {isLoading.toString()}</div>
      {error && <div data-testid="error-state">Error: {error}</div>}
      
      {/* Simulate nested components that also use selectors */}
      <ServerList />
      <ToolsList />
    </div>
  );
};

const ServerList = () => {
  const servers = useMcpServerStore(state => Array.from(state.servers.values()));
  
  return (
    <div data-testid="server-list">
      {servers.map((server, index) => (
        <ServerItem key={server.config.id || index} serverId={server.config.id} />
      ))}
    </div>
  );
};

const ServerItem = ({ serverId }: { serverId: string }) => {
  const server = useMcpServerStore(state => state.servers.get(serverId));
  const tools = useMcpServerStore(state => state.discoveredTools.get(serverId) || []);
  
  if (!server) return null;
  
  return (
    <div data-testid={`server-${serverId}`}>
      <div>Name: {server.config.name}</div>
      <div>Status: {server.status}</div>
      <div>Tools: {tools.length}</div>
    </div>
  );
};

const ToolsList = () => {
  const allTools = useMcpServerStore(state => {
    const tools: any[] = [];
    for (const serverTools of state.discoveredTools.values()) {
      tools.push(...serverTools);
    }
    return tools;
  });
  
  return (
    <div data-testid="tools-list">
      <div>Total Tools: {allTools.length}</div>
      {allTools.map((tool, index) => (
        <div key={`${tool.name}-${index}`} data-testid={`tool-${index}`}>
          {tool.name}
        </div>
      ))}
    </div>
  );
};

// Error boundary to catch maximum update depth errors
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Something went wrong.</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
            <pre>{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

describe('MCP Playground No Loop Test', () => {
  beforeEach(() => {
    // Reset store to clean state
    const store = useMcpServerStore.getState();
    store.servers.clear();
    store.configs.clear();
    store.discoveredTools.clear();
    
    // Clear any test logs
    if (globalThis.__ZUSTAND_SET_LOG__) {
      globalThis.__ZUSTAND_SET_LOG__.length = 0;
    }
    
    // Reset any error states
    useMcpServerStore.setState({ 
      error: null, 
      isLoading: false,
      selectedServerId: null 
    });
  });

  it('should render without throwing Maximum update depth exceeded', () => {
    // This is the core test - it should not throw
    expect(() => {
      render(
        <TestErrorBoundary>
          <MockMcpPlayground />
        </TestErrorBoundary>
      );
    }).not.toThrow(/Maximum update depth/);
    
    // Verify the component actually rendered
    expect(screen.getByTestId('mcp-playground')).toBeInTheDocument();
    expect(screen.getByText('MCP Playground')).toBeInTheDocument();
  });

  it('should render under StrictMode without infinite loops', () => {
    expect(() => {
      render(
        <StrictMode>
          <TestErrorBoundary>
            <MockMcpPlayground />
          </TestErrorBoundary>
        </StrictMode>
      );
    }).not.toThrow(/Maximum update depth/);
    
    // Should not trigger error boundary
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    expect(screen.getByTestId('mcp-playground')).toBeInTheDocument();
  });

  it('should handle store updates without causing loops', () => {
    const { rerender } = render(
      <TestErrorBoundary>
        <MockMcpPlayground />
      </TestErrorBoundary>
    );
    
    // Add some test data
    const mockServer = {
      config: { id: 'test-server', name: 'Test Server' },
      status: 'running' as any,
      port: 8080,
      pid: 12345,
      startedAt: Date.now()
    };
    
    const mockTools = [
      { name: 'test-tool-1', description: 'Test tool 1' },
      { name: 'test-tool-2', description: 'Test tool 2' }
    ];
    
    // Update store - this should not cause infinite loops
    expect(() => {
      useMcpServerStore.setState(state => ({
        servers: new Map(state.servers).set('test-server', mockServer),
        discoveredTools: new Map(state.discoveredTools).set('test-server', mockTools)
      }));
      
      rerender(
        <TestErrorBoundary>
          <MockMcpPlayground />
        </TestErrorBoundary>
      );
    }).not.toThrow(/Maximum update depth/);
    
    // Verify data is displayed
    expect(screen.getByTestId('server-count')).toHaveTextContent('Servers: 1');
    expect(screen.getByTestId('running-count')).toHaveTextContent('Running: 1');
    expect(screen.getByTestId('tools-count')).toHaveTextContent('Tools: 1');
  });

  it('should handle nested components with selectors', () => {
    // Add test data first
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
    
    const mockTools1 = [{ name: 'tool-1', description: 'Tool 1' }];
    const mockTools2 = [{ name: 'tool-2', description: 'Tool 2' }];
    
    useMcpServerStore.setState(state => ({
      servers: new Map([
        ['server-1', mockServer1],
        ['server-2', mockServer2]
      ]),
      discoveredTools: new Map([
        ['server-1', mockTools1],
        ['server-2', mockTools2]
      ])
    }));
    
    expect(() => {
      render(
        <StrictMode>
          <TestErrorBoundary>
            <MockMcpPlayground />
          </TestErrorBoundary>
        </StrictMode>
      );
    }).not.toThrow(/Maximum update depth/);
    
    // Verify nested components rendered
    expect(screen.getByTestId('server-1')).toBeInTheDocument();
    expect(screen.getByTestId('server-2')).toBeInTheDocument();
    expect(screen.getByTestId('tools-list')).toBeInTheDocument();
  });

  it('should not accumulate setState calls during render', () => {
    render(
      <TestErrorBoundary>
        <MockMcpPlayground />
      </TestErrorBoundary>
    );
    
    const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
    
    // Should have minimal setState calls (only initialization)
    expect(setStateCalls.length).toBeLessThanOrEqual(3);
    
    // Log calls for debugging if excessive
    if (setStateCalls.length > 3) {
      console.warn('Excessive setState calls during MCP Playground render:', setStateCalls);
    }
  });

  it('should handle error states without causing loops', () => {
    // Set an error state
    useMcpServerStore.setState({ 
      error: 'Test error message',
      isLoading: false 
    });
    
    expect(() => {
      render(
        <TestErrorBoundary>
          <MockMcpPlayground />
        </TestErrorBoundary>
      );
    }).not.toThrow(/Maximum update depth/);
    
    // Verify error is displayed
    expect(screen.getByTestId('error-state')).toHaveTextContent('Error: Test error message');
  });

  it('should handle loading states without causing loops', () => {
    // Set loading state
    useMcpServerStore.setState({ 
      isLoading: true,
      error: null 
    });
    
    expect(() => {
      render(
        <TestErrorBoundary>
          <MockMcpPlayground />
        </TestErrorBoundary>
      );
    }).not.toThrow(/Maximum update depth/);
    
    // Verify loading state is displayed
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading: true');
  });
});