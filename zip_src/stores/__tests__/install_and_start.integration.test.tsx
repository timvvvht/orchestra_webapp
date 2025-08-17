/**
 * MCP Installation Integration Test
 * 
 * Tests the MCP server installation functionality using Tauri shell plugin
 * instead of Node.js child_process.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the Tauri shell plugin
vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: vi.fn().mockImplementation((cmd: string, args: string[]) => ({
    execute: vi.fn().mockResolvedValue({ 
      code: 0, 
      stdout: '', 
      stderr: '' 
    })
  }))
}));

describe('MCP Installation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should install npm MCP server using Tauri shell plugin', async () => {
    const { ensureMcpInstalled } = await import('../../services/mcp/installation');
    const { Command } = await import('@tauri-apps/plugin-shell');
    
    const config = {
      id: 'sequential-thinking',
      name: 'Sequential Thinking',
      execPath: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      authType: 'none' as const,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await ensureMcpInstalled(config);

    // Verify Command was called with correct arguments
    expect(Command).toHaveBeenCalledWith('npx', [
      '--yes', 
      '@modelcontextprotocol/server-sequential-thinking', 
      '--help'
    ]);
  });

  it('should handle Docker image installation', async () => {
    const { ensureMcpInstalled } = await import('../../services/mcp/installation');
    const { Command } = await import('@tauri-apps/plugin-shell');
    
    const config = {
      id: 'docker-server',
      name: 'Docker MCP Server',
      execPath: 'docker',
      args: ['my-mcp-image:latest'],
      authType: 'none' as const,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await ensureMcpInstalled(config);

    // Verify Docker commands were called
    expect(Command).toHaveBeenCalledWith('docker', [
      'image', 
      'inspect', 
      'my-mcp-image:latest'
    ]);
  });

  it('should handle installation failures gracefully', async () => {
    const { ensureMcpInstalled } = await import('../../services/mcp/installation');
    const { Command } = await import('@tauri-apps/plugin-shell');
    
    // Mock command failure
    vi.mocked(Command).mockImplementation(() => ({
      execute: vi.fn().mockResolvedValue({ 
        code: 1, 
        stdout: '', 
        stderr: 'Package not found' 
      })
    }));

    const config = {
      id: 'failing-server',
      name: 'Failing Server',
      execPath: 'npx',
      args: ['-y', 'non-existent-package'],
      authType: 'none' as const,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await expect(ensureMcpInstalled(config)).rejects.toThrow('Command failed');
  });

  it('should validate config has required args for npm packages', async () => {
    const { ensureMcpInstalled } = await import('../../services/mcp/installation');
    
    const config = {
      id: 'invalid-server',
      name: 'Invalid Server',
      execPath: 'npx',
      args: [], // Empty args
      authType: 'none' as const,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await expect(ensureMcpInstalled(config)).rejects.toThrow('Package args not specified');
  });

  it('should validate Docker config has image name', async () => {
    const { ensureMcpInstalled } = await import('../../services/mcp/installation');
    
    const config = {
      id: 'invalid-docker',
      name: 'Invalid Docker Server',
      execPath: 'docker',
      args: [], // Empty args
      authType: 'none' as const,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await expect(ensureMcpInstalled(config)).rejects.toThrow('Docker image name not specified');
  });
});
