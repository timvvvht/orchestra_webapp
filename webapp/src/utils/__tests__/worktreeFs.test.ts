/**
 * Tests for worktree file system utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileAbs, writeFileAbs, existsAbs } from '../worktreeFs';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// Mock window.__TAURI_INTERNALS__ for Tauri environment
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {},
  writable: true,
});

describe('Worktree File System Utilities', () => {
  describe('readFileAbs', () => {
    it('should call invoke with correct command and path', async () => {
      const testPath = '/test/path/file.txt';
      const testContent = 'File content';
      
      mockInvoke.mockResolvedValue(testContent);
      
      const result = await readFileAbs(testPath);
      
      expect(mockInvoke).toHaveBeenCalledWith('fs_read_file_abs', { path: testPath });
      expect(result).toBe(testContent);
    });

    it('should handle read errors', async () => {
      const testPath = '/test/path/file.txt';
      const testError = new Error('File not found');
      
      mockInvoke.mockRejectedValue(testError);
      
      await expect(readFileAbs(testPath)).rejects.toThrow('File not found');
    });
  });

  describe('writeFileAbs', () => {
    it('should call invoke with correct command, path and content', async () => {
      const testPath = '/test/path/file.txt';
      const testContent = 'File content';
      
      mockInvoke.mockResolvedValue(undefined);
      
      await writeFileAbs(testPath, testContent);
      
      expect(mockInvoke).toHaveBeenCalledWith('fs_write_file_abs', { 
        path: testPath, 
        contents: testContent 
      });
    });

    it('should handle write errors', async () => {
      const testPath = '/test/path/file.txt';
      const testContent = 'File content';
      const testError = new Error('Permission denied');
      
      mockInvoke.mockRejectedValue(testError);
      
      await expect(writeFileAbs(testPath, testContent)).rejects.toThrow('Permission denied');
    });
  });

  describe('existsAbs', () => {
    it('should call invoke with correct command and path', async () => {
      const testPath = '/test/path/file.txt';
      
      mockInvoke.mockResolvedValue(true);
      
      const result = await existsAbs(testPath);
      
      expect(mockInvoke).toHaveBeenCalledWith('fs_exists_abs', { path: testPath });
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const testPath = '/test/path/nonexistent.txt';
      
      mockInvoke.mockResolvedValue(false);
      
      const result = await existsAbs(testPath);
      
      expect(result).toBe(false);
    });

    it('should handle exists errors', async () => {
      const testPath = '/test/path/file.txt';
      const testError = new Error('IO error');
      
      mockInvoke.mockRejectedValue(testError);
      
      await expect(existsAbs(testPath)).rejects.toThrow('IO error');
    });
  });

  describe('Tauri environment guard', () => {
    it('should throw error when not in Tauri environment', () => {
      // Temporarily remove __TAURI_INTERNALS__
      const originalInternals = (window as any).__TAURI_INTERNALS__;
      delete (window as any).__TAURI_INTERNALS__;
      
      expect(() => readFileAbs('/test/path')).toThrow('File operations require Tauri environment');
      
      // Restore __TAURI_INTERNALS__
      (window as any).__TAURI_INTERNALS__ = originalInternals;
    });
  });
});