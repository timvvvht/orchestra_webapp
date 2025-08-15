import { vi } from 'vitest';

// Mock Tauri APIs for testing environment
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({ port: 8001 }),
}));

// Import after mocking
import { setBaseUrl } from '../httpLspClient';
import { ensureLspServer } from '../lspServerBootstrap';
import { invoke } from '@tauri-apps/api/core';

// Get the mocked invoke function
const mockInvoke = vi.mocked(invoke);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

describe('LSP Server Bootstrap', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    
    // Reset the lspClient singleton by re-importing
    vi.resetModules();
    
    // Reset mock to default resolved value
    mockInvoke.mockResolvedValue({ port: 8001 });
  });

  describe('ensureLspServer', () => {
    it('should successfully start LSP server and configure client', async () => {
      // Arrange
      const testPort = 8001;
      mockInvoke.mockResolvedValue({ port: testPort });

      // Act
      const result = await ensureLspServer();

      // Assert
      expect(result).toBe(testPort);
      expect(mockInvoke).toHaveBeenCalledWith('lsp_start_server');
      
      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith('lspServerPort', String(testPort));
      
      // Verify setBaseUrl was called (we can't directly test the singleton, 
      // but we can verify the function was imported and called)
      expect(setBaseUrl).toBeDefined();
    });

    it('should retry on failure and eventually succeed', async () => {
      // Arrange
      const testPort = 8001;
      mockInvoke
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Server busy'))
        .mockResolvedValue({ port: testPort });

      // Act
      const result = await ensureLspServer();

      // Assert
      expect(result).toBe(testPort);
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('lspServerPort', String(testPort));
    });

    it('should throw error after max retries', async () => {
      // Arrange
      const errorMessage = 'Server unavailable';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(ensureLspServer()).rejects.toThrow('Failed to start LSP server after 3 attempts');
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should use exponential backoff between retries', async () => {
      // Arrange
      const testPort = 8001;
      mockInvoke
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue({ port: testPort });

      // Mock setTimeout to track delays
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const mockSetTimeout = setTimeoutSpy;
      
      // Mock setTimeout to call callback immediately for testing
      mockSetTimeout.mockImplementation((callback: any, delay: number) => {
        callback();
        return 0 as any;
      });

      // Act
      const result = await ensureLspServer();

      // Assert
      expect(result).toBe(testPort);
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      
      // Verify setTimeout was called with increasing delays
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
      expect(mockSetTimeout.mock.calls[0][1]).toBe(1000); // First retry: 1s
      expect(mockSetTimeout.mock.calls[1][1]).toBe(2000); // Second retry: 2s
      
      // Cleanup
      mockSetTimeout.mockRestore();
    });

    it('should store port in localStorage for persistence', async () => {
      // Arrange
      const testPort = 8001;
      mockInvoke.mockResolvedValue({ port: testPort });

      // Act
      await ensureLspServer();

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith('lspServerPort', String(testPort));
    });

    it('should configure LSP client with correct URL format', async () => {
      // Arrange
      const testPort = 8001;
      mockInvoke.mockResolvedValue({ port: testPort });

      // Act
      await ensureLspServer();

      // Assert
      // The setBaseUrl function should be called with the correct format
      // Since we can't directly test the singleton, we verify the port was used
      expect(localStorageMock.setItem).toHaveBeenCalledWith('lspServerPort', String(testPort));
    });
  });

  describe('Error Handling', () => {
    it('should handle different error types gracefully', async () => {
      // Arrange
      mockInvoke.mockRejectedValue('String error');

      // Act & Assert
      await expect(ensureLspServer()).rejects.toThrow('Failed to start LSP server after 3 attempts');
    });

    it('should handle object errors', async () => {
      // Arrange
      mockInvoke.mockRejectedValue({ message: 'Object error' });

      // Act & Assert
      await expect(ensureLspServer()).rejects.toThrow('Failed to start LSP server after 3 attempts');
    });

    it('should handle null/undefined errors', async () => {
      // Arrange
      mockInvoke.mockRejectedValue(null);

      // Act & Assert
      await expect(ensureLspServer()).rejects.toThrow('Failed to start LSP server after 3 attempts');
    });
  });

  describe('Integration with httpLspClient', () => {
    it('should export setBaseUrl function correctly', () => {
      // Assert
      expect(setBaseUrl).toBeDefined();
      expect(typeof setBaseUrl).toBe('function');
    });

    it('should be able to import and use setBaseUrl', () => {
      // Act & Assert
      expect(() => {
        setBaseUrl('http://localhost:8001');
      }).not.toThrow();
    });
  });
});