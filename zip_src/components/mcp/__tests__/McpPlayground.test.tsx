/**
 * Integration Tests for MCP Playground Components
 * 
 * Tests playground component rendering, interactions, real-time updates,
 * OAuth flow debugging, schema compilation, and export functionality.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Components under test
import McpPlayground from '../McpPlayground';
import McpToolInspector from '../McpToolInspector';
import McpServerMonitor from '../McpServerMonitor';
import McpOAuthDebugger from '../McpOAuthDebugger';
import McpSchemaPreview from '../McpSchemaPreview';

// Mock store and services
import { useMcpServerStore } from '@/stores/mcpServerStore';
import { mcpToolConverter } from '@/services/mcp/toolConverter';
import type { McpServerConfig, McpServerStatus, McpToolDefinition } from '@/services/mcp/types';

// ============================================================================
// MOCKS AND TEST SETUP
// ============================================================================

// Mock the MCP server store
vi.mock('@/stores/mcpServerStore', () => ({
  useMcpServerStore: vi.fn(),
  useServerInstances: vi.fn(),
  useRunningServers: vi.fn(),
  useServerById: vi.fn(),
  useServerConfigById: vi.fn(),
  useOAuthState: vi.fn(),
  useServerTokens: vi.fn()
}));

// Mock the tool converter
vi.mock('@/services/mcp/toolConverter', () => ({
  mcpToolConverter: {
    convertToToolSpec: vi.fn(),
    validateToolDefinition: vi.fn()
  }
}));

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
});

// Test data
const mockServerConfig: McpServerConfig = {
  id: 'test-server-1',
  name: 'Test MCP Server',
  description: 'A test server for integration testing',
  command: 'node',
  args: ['test-server.js'],
  env: {},
  authType: 'oauth',
  oauthConfig: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    authorizationUrl: 'https://example.com/oauth/authorize',
    tokenUrl: 'https://example.com/oauth/token',
    scopes: ['read', 'write'],
    redirectUri: 'http://localhost:3000/oauth/callback',
    usePKCE: true,
    codeChallengeMethod: 'S256'
  },
  enabled: true,
  autoStart: false
};

const mockServerStatus: McpServerStatus = {
  serverId: 'test-server-1',
  status: 'running',
  pid: 12345,
  port: 8080,
  startTime: Date.now() - 60000,
  lastActivity: Date.now() - 5000,
  memoryUsage: 45.2,
  cpuUsage: 12.8,
  requestCount: 156,
  errorCount: 2,
  uptime: 60000
};

const mockToolDefinition: McpToolDefinition = {
  name: 'test_tool',
  description: 'A test tool for integration testing',
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Test input parameter'
      }
    },
    required: ['input']
  },
  serverId: 'test-server-1'
};

const mockTokens = {
  accessToken: 'mock-access-token-12345',
  refreshToken: 'mock-refresh-token-67890',
  tokenType: 'Bearer',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600000,
  obtainedAt: Date.now(),
  scope: 'read write'
};

// Default mock store state
const defaultMockStore = {
  servers: [mockServerConfig],
  serverStatuses: { 'test-server-1': mockServerStatus },
  discoveredTools: { 'test-server-1': [mockToolDefinition] },
  oauthStates: { 'test-server-1': 'idle' },
  tokens: { 'test-server-1': mockTokens },
  
  // Actions
  addServer: vi.fn(),
  updateServer: vi.fn(),
  removeServer: vi.fn(),
  startServer: vi.fn(),
  stopServer: vi.fn(),
  restartServer: vi.fn(),
  discoverTools: vi.fn(),
  startOAuthFlow: vi.fn(),
  refreshToken: vi.fn(),
  getAllToolSpecs: vi.fn().mockReturnValue([]),
  getServerLogs: vi.fn().mockReturnValue([])
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// ============================================================================
// MCP PLAYGROUND TESTS
// ============================================================================

describe('McpPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMcpServerStore as any).mockReturnValue(defaultMockStore);
  });

  it('renders playground with all main sections', async () => {
    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Check for main sections
    expect(screen.getByText('MCP Test Playground')).toBeInTheDocument();
    expect(screen.getByText('Server Management')).toBeInTheDocument();
    expect(screen.getByText('Tool Discovery')).toBeInTheDocument();
    expect(screen.getByText('OAuth Testing')).toBeInTheDocument();
    expect(screen.getByText('Schema Preview')).toBeInTheDocument();
  });

  it('displays server status correctly', async () => {
    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Check server status display
    expect(screen.getByText('Test MCP Server')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('PID: 12345')).toBeInTheDocument();
  });

  it('handles server lifecycle controls', async () => {
    const user = userEvent.setup();
    const mockStartServer = vi.fn();
    const mockStopServer = vi.fn();
    const mockRestartServer = vi.fn();

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      startServer: mockStartServer,
      stopServer: mockStopServer,
      restartServer: mockRestartServer
    });

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Test stop server
    const stopButton = screen.getByRole('button', { name: /stop/i });
    await user.click(stopButton);
    expect(mockStopServer).toHaveBeenCalledWith('test-server-1');

    // Test restart server
    const restartButton = screen.getByRole('button', { name: /restart/i });
    await user.click(restartButton);
    expect(mockRestartServer).toHaveBeenCalledWith('test-server-1');
  });

  it('triggers tool discovery', async () => {
    const user = userEvent.setup();
    const mockDiscoverTools = vi.fn();

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      discoverTools: mockDiscoverTools
    });

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    const discoverButton = screen.getByRole('button', { name: /discover tools/i });
    await user.click(discoverButton);
    expect(mockDiscoverTools).toHaveBeenCalledWith('test-server-1');
  });

  it('starts OAuth flow', async () => {
    const user = userEvent.setup();
    const mockStartOAuthFlow = vi.fn();

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      startOAuthFlow: mockStartOAuthFlow
    });

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    const oauthButton = screen.getByRole('button', { name: /start oauth/i });
    await user.click(oauthButton);
    expect(mockStartOAuthFlow).toHaveBeenCalledWith('test-server-1');
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Check initial tab
    expect(screen.getByText('Server Management')).toBeInTheDocument();

    // Switch to tools tab
    const toolsTab = screen.getByRole('button', { name: /tools/i });
    await user.click(toolsTab);
    expect(screen.getByText('Tool Inspector')).toBeInTheDocument();

    // Switch to OAuth tab
    const oauthTab = screen.getByRole('button', { name: /oauth/i });
    await user.click(oauthTab);
    expect(screen.getByText('OAuth Debugger')).toBeInTheDocument();

    // Switch to schema tab
    const schemaTab = screen.getByRole('button', { name: /schema/i });
    await user.click(schemaTab);
    expect(screen.getByText('Schema Compilation Preview')).toBeInTheDocument();
  });

  it('handles real-time updates from store', async () => {
    const { rerender } = render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Initial state
    expect(screen.getByText('Running')).toBeInTheDocument();

    // Update store state
    const updatedStore = {
      ...defaultMockStore,
      serverStatuses: {
        'test-server-1': { ...mockServerStatus, status: 'stopped' as const }
      }
    };
    (useMcpServerStore as any).mockReturnValue(updatedStore);

    rerender(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Check updated state
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });
});

// ============================================================================
// TOOL INSPECTOR TESTS
// ============================================================================

describe('McpToolInspector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMcpServerStore as any).mockReturnValue(defaultMockStore);
  });

  it('renders tool inspector with discovered tools', () => {
    render(
      <TestWrapper>
        <McpToolInspector />
      </TestWrapper>
    );

    expect(screen.getByText('Tool Inspector')).toBeInTheDocument();
    expect(screen.getByText('test_tool')).toBeInTheDocument();
    expect(screen.getByText('A test tool for integration testing')).toBeInTheDocument();
  });

  it('displays tool schema details', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpToolInspector />
      </TestWrapper>
    );

    // Expand tool details
    const toolCard = screen.getByText('test_tool').closest('div');
    if (toolCard) {
      await user.click(toolCard);
    }

    // Check schema details
    await waitFor(() => {
      expect(screen.getByText('Input Schema')).toBeInTheDocument();
      expect(screen.getByText('"type": "object"')).toBeInTheDocument();
    });
  });

  it('handles tool search and filtering', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpToolInspector />
      </TestWrapper>
    );

    // Test search
    const searchInput = screen.getByPlaceholderText(/search tools/i);
    await user.type(searchInput, 'test');
    expect(screen.getByText('test_tool')).toBeInTheDocument();

    // Test search with no results
    await user.clear(searchInput);
    await user.type(searchInput, 'nonexistent');
    expect(screen.queryByText('test_tool')).not.toBeInTheDocument();
  });

  it('copies tool schema to clipboard', async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    });

    render(
      <TestWrapper>
        <McpToolInspector />
      </TestWrapper>
    );

    // Expand tool and copy schema
    const toolCard = screen.getByText('test_tool').closest('div');
    if (toolCard) {
      await user.click(toolCard);
    }

    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalled();
  });
});

// ============================================================================
// SERVER MONITOR TESTS
// ============================================================================

describe('McpServerMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMcpServerStore as any).mockReturnValue(defaultMockStore);
  });

  it('renders server monitor with performance metrics', () => {
    render(
      <TestWrapper>
        <McpServerMonitor />
      </TestWrapper>
    );

    expect(screen.getByText('Server Monitor')).toBeInTheDocument();
    expect(screen.getByText('45.2 MB')).toBeInTheDocument(); // Memory usage
    expect(screen.getByText('12.8%')).toBeInTheDocument(); // CPU usage
    expect(screen.getByText('156')).toBeInTheDocument(); // Request count
  });

  it('displays server logs', async () => {
    const mockLogs = [
      { timestamp: Date.now(), level: 'info', message: 'Server started' },
      { timestamp: Date.now() - 1000, level: 'error', message: 'Connection failed' }
    ];

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      getServerLogs: vi.fn().mockReturnValue(mockLogs)
    });

    render(
      <TestWrapper>
        <McpServerMonitor />
      </TestWrapper>
    );

    expect(screen.getByText('Server started')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('handles log filtering', async () => {
    const user = userEvent.setup();
    const mockLogs = [
      { timestamp: Date.now(), level: 'info', message: 'Info message' },
      { timestamp: Date.now() - 1000, level: 'error', message: 'Error message' }
    ];

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      getServerLogs: vi.fn().mockReturnValue(mockLogs)
    });

    render(
      <TestWrapper>
        <McpServerMonitor />
      </TestWrapper>
    );

    // Filter to show only errors
    const filterSelect = screen.getByDisplayValue(/all levels/i);
    await user.selectOptions(filterSelect, 'error');

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Info message')).not.toBeInTheDocument();
  });

  it('auto-refreshes metrics', async () => {
    vi.useFakeTimers();
    const mockGetServerLogs = vi.fn().mockReturnValue([]);

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      getServerLogs: mockGetServerLogs
    });

    render(
      <TestWrapper>
        <McpServerMonitor />
      </TestWrapper>
    );

    // Fast-forward time to trigger auto-refresh
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockGetServerLogs).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    vi.useRealTimers();
  });
});

// ============================================================================
// OAUTH DEBUGGER TESTS
// ============================================================================

describe('McpOAuthDebugger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMcpServerStore as any).mockReturnValue(defaultMockStore);
  });

  it('renders OAuth debugger with flow steps', () => {
    render(
      <TestWrapper>
        <McpOAuthDebugger />
      </TestWrapper>
    );

    expect(screen.getByText('OAuth Debugger')).toBeInTheDocument();
    expect(screen.getByText('Generate PKCE Parameters')).toBeInTheDocument();
    expect(screen.getByText('Build Authorization URL')).toBeInTheDocument();
    expect(screen.getByText('User Authorization')).toBeInTheDocument();
  });

  it('displays token information', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpOAuthDebugger />
      </TestWrapper>
    );

    // Switch to tokens tab
    const tokensTab = screen.getByRole('button', { name: /tokens/i });
    await user.click(tokensTab);

    expect(screen.getByText('Access Tokens')).toBeInTheDocument();
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('shows/hides token values', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpOAuthDebugger />
      </TestWrapper>
    );

    // Switch to tokens tab
    const tokensTab = screen.getByRole('button', { name: /tokens/i });
    await user.click(tokensTab);

    // Initially tokens should be hidden
    expect(screen.getByText('•'.repeat(40))).toBeInTheDocument();

    // Show tokens
    const showButton = screen.getByRole('button', { name: /show tokens/i });
    await user.click(showButton);

    expect(screen.getByText('mock-access-token-12345')).toBeInTheDocument();
  });

  it('displays PKCE parameters', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpOAuthDebugger />
      </TestWrapper>
    );

    // Switch to PKCE tab
    const pkceTab = screen.getByRole('button', { name: /pkce/i });
    await user.click(pkceTab);

    expect(screen.getByText('PKCE Parameters')).toBeInTheDocument();
    expect(screen.getByText('Code Verifier')).toBeInTheDocument();
    expect(screen.getByText('Code Challenge')).toBeInTheDocument();
  });

  it('handles token refresh', async () => {
    const user = userEvent.setup();
    const mockRefreshToken = vi.fn();

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      refreshToken: mockRefreshToken
    });

    render(
      <TestWrapper>
        <McpOAuthDebugger />
      </TestWrapper>
    );

    // Switch to tokens tab
    const tokensTab = screen.getByRole('button', { name: /tokens/i });
    await user.click(tokensTab);

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    expect(mockRefreshToken).toHaveBeenCalledWith('test-server-1');
  });
});

// ============================================================================
// SCHEMA PREVIEW TESTS
// ============================================================================

describe('McpSchemaPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      getAllToolSpecs: vi.fn().mockReturnValue([
        {
          name: 'mcp_tool',
          description: 'An MCP tool',
          input_schema: { type: 'object', properties: {} },
          source: 'mcp_test_server'
        }
      ])
    });
  });

  it('renders schema preview with metrics', () => {
    render(
      <TestWrapper>
        <McpSchemaPreview />
      </TestWrapper>
    );

    expect(screen.getByText('Schema Compilation Preview')).toBeInTheDocument();
    expect(screen.getByText('Total Tools')).toBeInTheDocument();
    expect(screen.getByText('Valid Tools')).toBeInTheDocument();
  });

  it('displays merged tool list', () => {
    render(
      <TestWrapper>
        <McpSchemaPreview />
      </TestWrapper>
    );

    // Should show both local and MCP tools
    expect(screen.getByText('read_file')).toBeInTheDocument(); // Local tool
    expect(screen.getByText('mcp_tool')).toBeInTheDocument(); // MCP tool
  });

  it('handles tool search and filtering', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpSchemaPreview />
      </TestWrapper>
    );

    // Test search
    const searchInput = screen.getByPlaceholderText(/search tools/i);
    await user.type(searchInput, 'read');
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.queryByText('mcp_tool')).not.toBeInTheDocument();
  });

  it('exports tool specifications', async () => {
    const user = userEvent.setup();
    const mockCreateElement = vi.fn().mockReturnValue({
      setAttribute: vi.fn(),
      click: vi.fn()
    });
    document.createElement = mockCreateElement;

    render(
      <TestWrapper>
        <McpSchemaPreview />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    expect(mockCreateElement).toHaveBeenCalledWith('a');
  });

  it('copies all specifications to clipboard', async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    });

    render(
      <TestWrapper>
        <McpSchemaPreview />
      </TestWrapper>
    );

    const copyButton = screen.getByRole('button', { name: /copy all/i });
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalled();
  });

  it('validates tool specifications', () => {
    render(
      <TestWrapper>
        <McpSchemaPreview />
      </TestWrapper>
    );

    // Switch to validation tab
    const validationTab = screen.getByRole('button', { name: /validation/i });
    fireEvent.click(validationTab);

    expect(screen.getByText('Validation Results')).toBeInTheDocument();
  });

  it('shows validation errors and warnings', async () => {
    const user = userEvent.setup();

    // Mock a tool with validation issues
    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      getAllToolSpecs: vi.fn().mockReturnValue([
        {
          name: '', // Invalid: empty name
          description: 'Tool with issues',
          input_schema: { type: 'string' }, // Warning: should be object
          source: 'test_server'
        }
      ])
    });

    render(
      <TestWrapper>
        <McpSchemaPreview />
      </TestWrapper>
    );

    // Switch to validation tab
    const validationTab = screen.getByRole('button', { name: /validation/i });
    await user.click(validationTab);

    // Should show validation issues
    expect(screen.getByText(/tool name is required/i)).toBeInTheDocument();
  });

  it('tests tool registration', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <TestWrapper>
        <McpSchemaPreview />
      </TestWrapper>
    );

    const testButton = screen.getByRole('button', { name: /test registration/i });
    await user.click(testButton);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Testing tool registration'),
      expect.any(Number),
      'tools'
    );

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('MCP Playground Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMcpServerStore as any).mockReturnValue(defaultMockStore);
  });

  it('handles complete workflow from server start to tool discovery', async () => {
    const user = userEvent.setup();
    const mockStartServer = vi.fn();
    const mockDiscoverTools = vi.fn();

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      startServer: mockStartServer,
      discoverTools: mockDiscoverTools
    });

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Start server
    const startButton = screen.getByRole('button', { name: /start/i });
    await user.click(startButton);
    expect(mockStartServer).toHaveBeenCalled();

    // Discover tools
    const discoverButton = screen.getByRole('button', { name: /discover tools/i });
    await user.click(discoverButton);
    expect(mockDiscoverTools).toHaveBeenCalled();
  });

  it('handles OAuth flow completion', async () => {
    const user = userEvent.setup();
    const mockStartOAuthFlow = vi.fn();

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      startOAuthFlow: mockStartOAuthFlow,
      oauthStates: { 'test-server-1': 'completed' }
    });

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Switch to OAuth tab
    const oauthTab = screen.getByRole('button', { name: /oauth/i });
    await user.click(oauthTab);

    // Start OAuth flow
    const startOAuthButton = screen.getByRole('button', { name: /start oauth flow/i });
    await user.click(startOAuthButton);
    expect(mockStartOAuthFlow).toHaveBeenCalled();
  });

  it('synchronizes data across all components', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Check that server data is consistent across tabs
    expect(screen.getByText('Test MCP Server')).toBeInTheDocument();

    // Switch to tools tab
    const toolsTab = screen.getByRole('button', { name: /tools/i });
    await user.click(toolsTab);
    expect(screen.getByText('test_tool')).toBeInTheDocument();

    // Switch to schema tab
    const schemaTab = screen.getByRole('button', { name: /schema/i });
    await user.click(schemaTab);
    expect(screen.getByText('Total Tools')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    const mockStartServer = vi.fn().mockRejectedValue(new Error('Server start failed'));

    (useMcpServerStore as any).mockReturnValue({
      ...defaultMockStore,
      startServer: mockStartServer,
      serverStatuses: {
        'test-server-1': { ...mockServerStatus, status: 'error' }
      }
    });

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Should display error state
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('maintains state during tab switches', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <McpPlayground />
      </TestWrapper>
    );

    // Make changes in one tab
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'test query');

    // Switch tabs and back
    const toolsTab = screen.getByRole('button', { name: /tools/i });
    await user.click(toolsTab);

    const serversTab = screen.getByRole('button', { name: /servers/i });
    await user.click(serversTab);

    // Search should be preserved
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });
});