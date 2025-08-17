/**
 * MCP Server Management Store Integration Test
 * 
 * Tests the store functionality for adding servers, installation, and state management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useMcpServerManagementStore } from '../mcpServerManagementStore';
import { AddServerFormData } from '../../services/mcp/types';

// Mock the installation helper
vi.mock('../../services/mcp/installation', () => ({
  ensureMcpInstalled: vi.fn()
}));

// Mock Tauri shell plugin
vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: vi.fn().mockImplementation((cmd: string, args: string[]) => ({
    execute: vi.fn().mockResolvedValue({ 
      code: 0, 
      stdout: '', 
      stderr: '' 
    })
  }))
}));

describe('MCP Server Management Store Integration', () => {
  beforeEach(() => {
    // Reset store state
    useMcpServerManagementStore.setState({
      servers: new Map(),
      instances: new Map(),
      installationStates: new Map(),
      isAddServerModalOpen: false,
      selectedServerId: null
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addServer', () => {
    it('should add npm server to store', async () => {
      const store = useMcpServerManagementStore.getState();
      
      const serverData: AddServerFormData = {
        name: 'Test NPM Server',
        type: 'npm',
        packageName: '@test/mcp-server',
        description: 'Test server',
        tags: ['test']
      };

      await store.addServer(serverData);

      const servers = store.getAvailableServers();
      expect(servers).toHaveLength(1);
      
      const addedServer = servers[0];
      expect(addedServer.name).toBe('Test NPM Server');
      expect(addedServer.execPath).toBe('npx');
      expect(addedServer.args).toEqual(['-y', '@test/mcp-server']);
      expect(addedServer.description).toBe('Test server');
      expect(addedServer.tags).toEqual(['test']);
    });

    it('should add docker server to store', async () => {
      const store = useMcpServerManagementStore.getState();
      
      const serverData: AddServerFormData = {
        name: 'Test Docker Server',
        type: 'docker',
        dockerImage: 'test/mcp-server:latest',
        description: 'Docker test server'
      };

      await store.addServer(serverData);

      const servers = store.getAvailableServers();
      expect(servers).toHaveLength(1);
      
      const addedServer = servers[0];
      expect(addedServer.name).toBe('Test Docker Server');
      expect(addedServer.execPath).toBe('docker');
      expect(addedServer.args).toEqual(['run', '--rm', '-i', 'test/mcp-server:latest']);
    });

    it('should add custom server to store', async () => {
      const store = useMcpServerManagementStore.getState();
      
      const serverData: AddServerFormData = {
        name: 'Test Custom Server',
        type: 'custom',
        execPath: '/usr/local/bin/mcp-server',
        args: ['--port', '3000'],
        description: 'Custom executable server'
      };

      await store.addServer(serverData);

      const servers = store.getAvailableServers();
      expect(servers).toHaveLength(1);
      
      const addedServer = servers[0];
      expect(addedServer.name).toBe('Test Custom Server');
      expect(addedServer.execPath).toBe('/usr/local/bin/mcp-server');
      expect(addedServer.args).toEqual(['--port', '3000']);
    });
  });

  describe('installAndStartServer', () => {
    it('should successfully install and start server', async () => {
      const { ensureMcpInstalled } = await import('../../services/mcp/installation');
      vi.mocked(ensureMcpInstalled).mockResolvedValue(undefined);
      
      const store = useMcpServerManagementStore.getState();
      
      // Add a server first
      const serverData: AddServerFormData = {
        name: 'Test Server',
        type: 'npm',
        packageName: '@test/mcp-server'
      };
      
      await store.addServer(serverData);
      const servers = store.getAvailableServers();
      const serverId = servers[0].id;
      
      // Install and start
      await store.installAndStartServer(serverId);
      
      // Check installation state
      const installationState = useMcpServerManagementStore.getState().installationStates.get(serverId);
      expect(installationState).toBe('installed');
      
      // Check running instance
      const runningServers = store.getRunningServers();
      expect(runningServers).toHaveLength(1);
      expect(runningServers[0].config.id).toBe(serverId);
      expect(runningServers[0].status).toBe('running');
      
      // Verify installation helper was called
      expect(ensureMcpInstalled).toHaveBeenCalledWith(servers[0]);
    });

    it('should handle installation failure', async () => {
      const { ensureMcpInstalled } = await import('../../services/mcp/installation');
      const installError = new Error('Installation failed');
      vi.mocked(ensureMcpInstalled).mockRejectedValue(installError);
      
      const store = useMcpServerManagementStore.getState();
      
      // Add a server first
      const serverData: AddServerFormData = {
        name: 'Failing Server',
        type: 'npm',
        packageName: '@test/failing-server'
      };
      
      await store.addServer(serverData);
      const servers = store.getAvailableServers();
      const serverId = servers[0].id;
      
      // Attempt to install and start (should fail)
      await expect(store.installAndStartServer(serverId)).rejects.toThrow('Installation failed');
      
      // Check installation state is failed
      const installationState = useMcpServerManagementStore.getState().installationStates.get(serverId);
      expect(installationState).toBe('failed');
      
      // Check no running instance was created
      const runningServers = store.getRunningServers();
      expect(runningServers).toHaveLength(0);
    });

    it('should throw error for non-existent server', async () => {
      const store = useMcpServerManagementStore.getState();
      
      await expect(store.installAndStartServer('non-existent-id')).rejects.toThrow('Server not found: non-existent-id');
    });
  });

  describe('removeServer', () => {
    it('should remove server and clean up state', async () => {
      const store = useMcpServerManagementStore.getState();
      
      // Add a server
      const serverData: AddServerFormData = {
        name: 'Server to Remove',
        type: 'npm',
        packageName: '@test/remove-server'
      };
      
      await store.addServer(serverData);
      const servers = store.getAvailableServers();
      const serverId = servers[0].id;
      
      // Select the server
      store.selectServer(serverId);
      expect(useMcpServerManagementStore.getState().selectedServerId).toBe(serverId);
      
      // Remove the server
      store.removeServer(serverId);
      
      // Verify server is removed
      expect(store.getAvailableServers()).toHaveLength(0);
      
      // Verify selected server is cleared
      expect(useMcpServerManagementStore.getState().selectedServerId).toBeNull();
    });
  });

  describe('UI state management', () => {
    it('should manage modal state', () => {
      const store = useMcpServerManagementStore.getState();
      
      expect(store.isAddServerModalOpen).toBe(false);
      
      store.openAddServerModal();
      expect(useMcpServerManagementStore.getState().isAddServerModalOpen).toBe(true);
      
      store.closeAddServerModal();
      expect(useMcpServerManagementStore.getState().isAddServerModalOpen).toBe(false);
    });

    it('should manage server selection', () => {
      const store = useMcpServerManagementStore.getState();
      
      expect(store.selectedServerId).toBeNull();
      
      store.selectServer('test-server-id');
      expect(useMcpServerManagementStore.getState().selectedServerId).toBe('test-server-id');
      
      store.selectServer(null);
      expect(useMcpServerManagementStore.getState().selectedServerId).toBeNull();
    });
  });

  describe('getters', () => {
    it('should return correct server by id', async () => {
      const store = useMcpServerManagementStore.getState();
      
      const serverData: AddServerFormData = {
        name: 'Getter Test Server',
        type: 'npm',
        packageName: '@test/getter-server'
      };
      
      await store.addServer(serverData);
      const servers = store.getAvailableServers();
      const serverId = servers[0].id;
      
      const foundServer = store.getServerById(serverId);
      expect(foundServer).toBeDefined();
      expect(foundServer?.name).toBe('Getter Test Server');
      
      const notFoundServer = store.getServerById('non-existent');
      expect(notFoundServer).toBeUndefined();
    });
  });
});