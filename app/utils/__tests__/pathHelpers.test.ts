/**
 * Tests for path helper utilities
 */

import { describe, it, expect } from 'vitest';
import { toWorktreeAbsPath } from '../pathHelpers';

describe('Path Helpers', () => {
  describe('toWorktreeAbsPath', () => {
    it('should handle basic path joining', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project', 'src/main.ts');
      expect(result).toBe('/Users/tim/Code/project/src/main.ts');
    });

    it('should remove trailing slash from worktree root', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project/', 'src/main.ts');
      expect(result).toBe('/Users/tim/Code/project/src/main.ts');
    });

    it('should remove leading slash from relative path', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project', '/src/main.ts');
      expect(result).toBe('/Users/tim/Code/project/src/main.ts');
    });

    it('should handle both trailing and leading slashes', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project/', '/src/main.ts');
      expect(result).toBe('/Users/tim/Code/project/src/main.ts');
    });

    it('should handle nested paths', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project', 'components/Button/Button.tsx');
      expect(result).toBe('/Users/tim/Code/project/components/Button/Button.tsx');
    });

    it('should handle relative paths with dots', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project', './src/main.ts');
      expect(result).toBe('/Users/tim/Code/project/./src/main.ts');
    });

    it('should handle Windows-style paths (basic normalization)', () => {
      const result = toWorktreeAbsPath('C:\\Users\\tim\\Code\\project', 'src\\main.ts');
      expect(result).toContain('src/main.ts');
    });

    it('should normalize multiple slashes', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project//', '//src/main.ts');
      expect(result).toBe('/Users/tim/Code/project/src/main.ts');
    });

    it('should handle empty relative path', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project', '');
      expect(result).toBe('/Users/tim/Code/project');
    });

    it('should handle root-level file', () => {
      const result = toWorktreeAbsPath('/Users/tim/Code/project', 'README.md');
      expect(result).toBe('/Users/tim/Code/project/README.md');
    });
  });
});