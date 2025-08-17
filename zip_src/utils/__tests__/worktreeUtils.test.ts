/**
 * Tests for worktree utility functions
 */
import { describe, it, expect } from 'vitest';
import { 
  getRepoRootFromWorktree, 
  isWorktreePath, 
  getSessionIdFromWorktree 
} from '../worktreeUtils';

describe('worktreeUtils', () => {
  describe('getRepoRootFromWorktree', () => {
    it('should extract repo root from worktree path', () => {
      const worktreePath = '/Users/tim/Code/latte-analytics/.orchestra/worktrees/ca50959c-70b6-4eb7-8915-710d97f0f5e0';
      const expected = '/Users/tim/Code/latte-analytics';
      
      expect(getRepoRootFromWorktree(worktreePath)).toBe(expected);
    });

    it('should handle different repo paths', () => {
      const worktreePath = '/home/user/projects/my-app/.orchestra/worktrees/session-123';
      const expected = '/home/user/projects/my-app';
      
      expect(getRepoRootFromWorktree(worktreePath)).toBe(expected);
    });

    it('should return original path if not a worktree path', () => {
      const nonWorktreePath = '/Users/tim/Code/some-project';
      
      expect(getRepoRootFromWorktree(nonWorktreePath)).toBe(nonWorktreePath);
    });

    it('should handle edge cases', () => {
      expect(getRepoRootFromWorktree('')).toBe('');
      expect(getRepoRootFromWorktree('/')).toBe('/');
    });
  });

  describe('isWorktreePath', () => {
    it('should identify valid worktree paths', () => {
      const validPaths = [
        '/Users/tim/Code/latte-analytics/.orchestra/worktrees/ca50959c-70b6-4eb7-8915-710d97f0f5e0',
        '/home/user/project/.orchestra/worktrees/session-123',
        '/path/to/repo/.orchestra/worktrees/abc123'
      ];

      validPaths.forEach(path => {
        expect(isWorktreePath(path)).toBe(true);
      });
    });

    it('should reject invalid worktree paths', () => {
      const invalidPaths = [
        '/Users/tim/Code/latte-analytics',
        '/Users/tim/Code/latte-analytics/.orchestra',
        '/Users/tim/Code/latte-analytics/.orchestra/worktrees',
        '/Users/tim/Code/latte-analytics/.orchestra/worktrees/',
        '/some/random/path'
      ];

      invalidPaths.forEach(path => {
        expect(isWorktreePath(path)).toBe(false);
      });
    });
  });

  describe('getSessionIdFromWorktree', () => {
    it('should extract session ID from worktree path', () => {
      const worktreePath = '/Users/tim/Code/latte-analytics/.orchestra/worktrees/ca50959c-70b6-4eb7-8915-710d97f0f5e0';
      const expected = 'ca50959c-70b6-4eb7-8915-710d97f0f5e0';
      
      expect(getSessionIdFromWorktree(worktreePath)).toBe(expected);
    });

    it('should handle different session ID formats', () => {
      const testCases = [
        {
          path: '/home/user/project/.orchestra/worktrees/session-123',
          expected: 'session-123'
        },
        {
          path: '/path/to/repo/.orchestra/worktrees/abc123def456',
          expected: 'abc123def456'
        }
      ];

      testCases.forEach(({ path, expected }) => {
        expect(getSessionIdFromWorktree(path)).toBe(expected);
      });
    });

    it('should return null for invalid paths', () => {
      const invalidPaths = [
        '/Users/tim/Code/latte-analytics',
        '/Users/tim/Code/latte-analytics/.orchestra/worktrees',
        '/some/random/path'
      ];

      invalidPaths.forEach(path => {
        expect(getSessionIdFromWorktree(path)).toBeNull();
      });
    });
  });
});