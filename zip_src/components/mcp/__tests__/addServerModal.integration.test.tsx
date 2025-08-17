/**
 * Add Server Modal Integration Test
 * 
 * Tests the complete flow of adding a new MCP server through the UI:
 * - Rendering the Playground
 * - Clicking "Add Server" button
 * - Filling out the form
 * - Submitting the form
 * - Verifying server card appears
 * - Verifying store is updated
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import McpPlayground from '../McpPlayground';
import { useMcpServerManagementStore } from '../../../stores/mcpServerManagementStore';
import { McpServerStatus } from '../../../services/mcp/types';

// Mock the installation helper
vi.mock('../../../services/mcp/installation', () => ({
  ensureMcpInstalled: vi.fn().mockResolvedValue({
    success: true,
    execPath: '/usr/local/bin/npx',
    args: ['@modelcontextprotocol/server-sequential-thinking']
  })
}));

// Mock the existing MCP server store
vi.mock('@/stores/mcpServerStore', () => ({
  useMcpServerStore: () => ({
    getAllToolSpecs: () => [],
    refreshAllServers: vi.fn(),
    refreshAllTools: vi.fn()
  }),
  useServerInstances: () => [],
  useRunningServers: () => [],
  useServerById: () => null,
  useServerConfigById: () => null,
  useServerTools: () => [],
  useOAuthState: () => null,
  useServerTokens: () => null,
  useInstallationState: () => 'idle'
}));

// Mock clsx
vi.mock('clsx', () => ({
  clsx: (...args: any[]) => args.filter(Boolean).join(' ')
}));

// Mock Tauri shell plugin
vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: vi.fn().mockImplementation((command: string, args?: string[]) => ({
    execute: vi.fn().mockResolvedValue({
      code: 0,
      stdout: 'Mock command output',
      stderr: ''
    }),
    spawn: vi.fn().mockResolvedValue({
      code: 0,
      stdout: 'Mock spawn output',
      stderr: ''
    })
  }))
}));

describe('AddServerModal Integration Test', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset the store before each test
    const store = useMcpServerManagementStore.getState();
    store.servers.clear();
    store.instances.clear();
    store.installationStates.clear();
    store.selectedServerId = null;
    store.isAddServerModalOpen = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete the full flow of adding a new MCP server', async () => {
    // Render the playground
    render(<McpPlayground />);

    // Initially, there should be no servers
    expect(screen.getByText('No MCP Servers')).toBeInTheDocument();
    expect(screen.getByText('Add your first MCP server to get started with the playground.')).toBeInTheDocument();

    // Click the "Add MCP Server" button
    const addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    // Modal should be open
    await waitFor(() => {
      expect(screen.getByText('Add MCP Server')).toBeInTheDocument();
    });

    // Fill out the form for an npm package
    const nameInput = screen.getByLabelText(/server name/i);
    const packageNameInput = screen.getByLabelText(/package name/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'Sequential Thinking');
    await user.type(packageNameInput, '@modelcontextprotocol/server-sequential-thinking');
    await user.type(descriptionInput, 'A server for sequential thinking and reasoning');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /add server/i });
    await user.click(submitButton);

    // Wait for the modal to close and server to be added
    await waitFor(() => {
      expect(screen.queryByText('Add MCP Server')).not.toBeInTheDocument();
    });

    // Verify the server card appears
    await waitFor(() => {
      expect(screen.getByText('Sequential Thinking')).toBeInTheDocument();
    });

    // Verify server details are displayed
    expect(screen.getByText('A server for sequential thinking and reasoning')).toBeInTheDocument();
    expect(screen.getByText(/npx @modelcontextprotocol\/server-sequential-thinking/)).toBeInTheDocument();

    // Verify the store is updated
    const store = useMcpServerManagementStore.getState();
    expect(store.servers.size).toBe(1);
    
    const addedServer = Array.from(store.servers.values())[0];
    expect(addedServer.name).toBe('Sequential Thinking');
    expect(addedServer.type).toBe('npm');
    expect(addedServer.packageName).toBe('@modelcontextprotocol/server-sequential-thinking');
    expect(addedServer.description).toBe('A server for sequential thinking and reasoning');

    // Verify installation state is set
    expect(store.installationStates.get(addedServer.id)).toBe('installed');

    // Verify the "Install & Start" button is available
    expect(screen.getByRole('button', { name: /install & start/i })).toBeInTheDocument();
  });

  it('should handle form validation errors', async () => {
    render(<McpPlayground />);

    // Click the "Add MCP Server" button
    const addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /add server/i });
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Server name is required')).toBeInTheDocument();
    });

    // Fill name but not package name
    const nameInput = screen.getByLabelText(/server name/i);
    await user.type(nameInput, 'Test Server');
    await user.click(submitButton);

    // Should show package name validation error
    await waitFor(() => {
      expect(screen.getByText('Package name is required for npm servers')).toBeInTheDocument();
    });
  });

  it('should handle different server types', async () => {
    render(<McpPlayground />);

    // Open modal
    const addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    // Fill basic info
    const nameInput = screen.getByLabelText(/server name/i);
    await user.type(nameInput, 'Docker Server');

    // Change to Docker type
    const typeSelect = screen.getByLabelText(/server type/i);
    await user.selectOptions(typeSelect, 'docker');

    // Should show Docker image field
    expect(screen.getByLabelText(/docker image/i)).toBeInTheDocument();

    // Fill Docker image
    const dockerImageInput = screen.getByLabelText(/docker image/i);
    await user.type(dockerImageInput, 'my-org/mcp-server:latest');

    // Submit
    const submitButton = screen.getByRole('button', { name: /add server/i });
    await user.click(submitButton);

    // Verify Docker server was added
    await waitFor(() => {
      expect(screen.getByText('Docker Server')).toBeInTheDocument();
    });

    const store = useMcpServerManagementStore.getState();
    const addedServer = Array.from(store.servers.values())[0];
    expect(addedServer.type).toBe('docker');
    expect(addedServer.dockerImage).toBe('my-org/mcp-server:latest');
  });

  it('should handle custom executable servers', async () => {
    render(<McpPlayground />);

    // Open modal
    const addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    // Fill basic info
    const nameInput = screen.getByLabelText(/server name/i);
    await user.type(nameInput, 'Custom Server');

    // Change to custom type
    const typeSelect = screen.getByLabelText(/server type/i);
    await user.selectOptions(typeSelect, 'custom');

    // Should show executable path and args fields
    expect(screen.getByLabelText(/executable path/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/arguments/i)).toBeInTheDocument();

    // Fill custom fields
    const execPathInput = screen.getByLabelText(/executable path/i);
    const argsInput = screen.getByLabelText(/arguments/i);
    
    await user.type(execPathInput, '/usr/local/bin/my-mcp-server');
    await user.type(argsInput, '--port 3000 --config /path/to/config');

    // Submit
    const submitButton = screen.getByRole('button', { name: /add server/i });
    await user.click(submitButton);

    // Verify custom server was added
    await waitFor(() => {
      expect(screen.getByText('Custom Server')).toBeInTheDocument();
    });

    const store = useMcpServerManagementStore.getState();
    const addedServer = Array.from(store.servers.values())[0];
    expect(addedServer.type).toBe('custom');
    expect(addedServer.execPath).toBe('/usr/local/bin/my-mcp-server');
    expect(addedServer.args).toEqual(['--port', '3000', '--config', '/path/to/config']);
  });

  it('should handle tags input', async () => {
    render(<McpPlayground />);

    // Open modal
    const addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    // Fill required fields
    const nameInput = screen.getByLabelText(/server name/i);
    const packageNameInput = screen.getByLabelText(/package name/i);
    const tagsInput = screen.getByLabelText(/tags/i);

    await user.type(nameInput, 'Tagged Server');
    await user.type(packageNameInput, '@example/server');
    await user.type(tagsInput, 'ai, reasoning, experimental');

    // Submit
    const submitButton = screen.getByRole('button', { name: /add server/i });
    await user.click(submitButton);

    // Verify server with tags was added
    await waitFor(() => {
      expect(screen.getByText('Tagged Server')).toBeInTheDocument();
    });

    const store = useMcpServerManagementStore.getState();
    const addedServer = Array.from(store.servers.values())[0];
    expect(addedServer.tags).toEqual(['ai', 'reasoning', 'experimental']);

    // Verify tags are displayed in the UI
    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getByText('reasoning')).toBeInTheDocument();
    expect(screen.getByText('experimental')).toBeInTheDocument();
  });

  it('should close modal when clicking cancel', async () => {
    render(<McpPlayground />);

    // Open modal
    const addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    // Modal should be open
    expect(screen.getByText('Add MCP Server')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Add MCP Server')).not.toBeInTheDocument();
    });

    // No server should be added
    const store = useMcpServerManagementStore.getState();
    expect(store.servers.size).toBe(0);
  });

  it('should close modal when clicking the X button', async () => {
    render(<McpPlayground />);

    // Open modal
    const addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    // Modal should be open
    expect(screen.getByText('Add MCP Server')).toBeInTheDocument();

    // Click the X button
    const closeButton = screen.getByRole('button', { name: '×' });
    await user.click(closeButton);

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Add MCP Server')).not.toBeInTheDocument();
    });
  });

  it('should show multiple servers when added', async () => {
    render(<McpPlayground />);

    // Add first server
    let addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    let nameInput = screen.getByLabelText(/server name/i);
    let packageNameInput = screen.getByLabelText(/package name/i);
    
    await user.type(nameInput, 'First Server');
    await user.type(packageNameInput, '@example/first-server');
    
    let submitButton = screen.getByRole('button', { name: /add server/i });
    await user.click(submitButton);

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText('Add MCP Server')).not.toBeInTheDocument();
    });

    // Add second server
    addServerButton = screen.getByRole('button', { name: /add server/i });
    await user.click(addServerButton);

    nameInput = screen.getByLabelText(/server name/i);
    packageNameInput = screen.getByLabelText(/package name/i);
    
    await user.type(nameInput, 'Second Server');
    await user.type(packageNameInput, '@example/second-server');
    
    submitButton = screen.getByRole('button', { name: /add server/i });
    await user.click(submitButton);

    // Both servers should be visible
    await waitFor(() => {
      expect(screen.getByText('First Server')).toBeInTheDocument();
      expect(screen.getByText('Second Server')).toBeInTheDocument();
    });

    // Header should show count
    expect(screen.getByText('MCP Servers (2)')).toBeInTheDocument();

    // Store should have both servers
    const store = useMcpServerManagementStore.getState();
    expect(store.servers.size).toBe(2);
  });

  it('should verify installation state transitions (idle -> installing -> installed)', async () => {
    render(<McpPlayground />);

    // Add a server first
    const addServerButton = screen.getByRole('button', { name: /add mcp server/i });
    await user.click(addServerButton);

    const nameInput = screen.getByLabelText(/server name/i);
    const packageNameInput = screen.getByLabelText(/package name/i);
    
    await user.type(nameInput, 'Test Server');
    await user.type(packageNameInput, '@example/test-server');
    
    const submitButton = screen.getByRole('button', { name: /add server/i });
    await user.click(submitButton);

    // Wait for server to be added
    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });

    // Initially should be in idle state (not installed)
    let store = useMcpServerManagementStore.getState();
    const serverId = Array.from(store.servers.keys())[0];
    expect(store.installationStates.get(serverId)).toBeUndefined(); // idle by default

    // Click "Install & Start" button
    const installButton = screen.getByRole('button', { name: /install & start/i });
    
    // Mock the installation process to simulate state transitions
    const originalInstallAndStart = store.installAndStartServer;
    const mockInstallAndStart = vi.fn().mockImplementation(async (id: string) => {
      // Set to installing
      store = useMcpServerManagementStore.getState();
      store.installationStates.set(id, 'installing');
      
      // Simulate async installation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set to installed
      store.installationStates.set(id, 'installed');
      
      // Create instance
      const server = store.servers.get(id);
      if (server) {
        store.instances.set(id, {
          config: server,
          status: McpServerStatus.RUNNING,
          startedAt: Date.now()
        });
      }
    });

    // Replace the store method temporarily
    useMcpServerManagementStore.setState({ installAndStartServer: mockInstallAndStart });

    await user.click(installButton);

    // Verify the installation state transitions
    await waitFor(() => {
      const finalStore = useMcpServerManagementStore.getState();
      expect(finalStore.installationStates.get(serverId)).toBe('installed');
      expect(finalStore.instances.has(serverId)).toBe(true);
    });

    // Restore original method
    useMcpServerManagementStore.setState({ installAndStartServer: originalInstallAndStart });
  });
});