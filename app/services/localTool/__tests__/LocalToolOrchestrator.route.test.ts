import { vi } from 'vitest';
import { LocalToolOrchestrator } from '../LocalToolOrchestrator';
import { ensureLspServer } from '../lspServerBootstrap';
import { setBaseUrl } from '../httpLspClient';
import { invoke } from '@tauri-apps/api/core';

// Get the mocked functions
const mockInvoke = vi.mocked(invoke);
const mockSetBaseUrl = vi.mocked(setBaseUrl);

// Mock dependencies
const mockFirehose = {
  subscribe: vi.fn(),
};

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({ port: 8001 }),
}));

// Mock httpLspClient
vi.mock('../httpLspClient', () => ({
  setBaseUrl: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

describe('LocalToolOrchestrator Routing', () => {
  let orchestrator: LocalToolOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks to default resolved value
    mockInvoke.mockResolvedValue({ port: 8001 });
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        result: {
          tools: [
            { name: 'test_tool', description: 'Test tool', parameters: {} }
          ]
        }
      })
    });
    
    localStorageMock.getItem.mockReturnValue(null);
    
    // Create new orchestrator instance
    orchestrator = new LocalToolOrchestrator(mockFirehose as any);
  });

  describe('LSP Tool Routing', () => {
    it('should route tools to LSP HTTP client when available', async () => {
      // Arrange
      const testPort = 8001;
      mockInvoke.mockResolvedValue({ port: testPort });
      
      // Mock fetch for tool execution
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tools')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { name: 'test_tool', description: 'Test tool', parameters: {} }
            ])
          });
        } else if (url.includes('/execute_job')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              result: { success: true }
            })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Act
      await orchestrator.start();
      
      // Assert
      expect(mockInvoke).toHaveBeenCalledWith('lsp_start_server');
      expect(mockSetBaseUrl).toHaveBeenCalledWith(`http://127.0.0.1:${testPort}`);
      
      // Verify fetch was called with LSP port, not TES
      const listToolsCall = mockFetch.mock.calls.find(call => 
        call[0].includes('/tools') && !call[0].includes('/execute_job')
      );
      expect(listToolsCall).toBeTruthy();
      expect(listToolsCall![0]).toContain('8001');
      expect(listToolsCall![0]).not.toContain('12345');
    });

    it('should not route to TES fallback', async () => {
      // Arrange
      const testPort = 8001;
      mockInvoke.mockResolvedValue({ port: testPort });
      
      // Mock fetch for tool execution
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tools')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { name: 'test_tool', description: 'Test tool', parameters: {} }
            ])
          });
        } else if (url.includes('/execute_job')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              result: { success: true }
            })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Act
      await orchestrator.start();
      
      // Assert - verify no calls to TES endpoints
      const tesCalls = mockFetch.mock.calls.filter(call => 
        call[0].includes('/execute_job') || call[0].includes('12345')
      );
      expect(tesCalls).toHaveLength(0);
    });

    it('should throw error when LSP server fails to start', async () => {
      // Arrange
      mockInvoke.mockRejectedValue(new Error('LSP server failed to start'));
      
      // Act & Assert
      await expect(orchestrator.start()).rejects.toThrow('Failed to bootstrap LSP');
    });

    it('should use correct URL format for LSP calls', async () => {
      // Arrange
      const testPort = 8001;
      mockInvoke.mockResolvedValue({ port: testPort });
      
      let capturedUrl = '';
      mockFetch.mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { name: 'test_tool', description: 'Test tool', parameters: {} }
          ])
        });
      });

      // Act
      await orchestrator.start();
      
      // Assert
      expect(capturedUrl).toBe(`http://127.0.0.1:${testPort}/tools`);
      expect(capturedUrl).not.toEndWith('/');
    });
  });
});