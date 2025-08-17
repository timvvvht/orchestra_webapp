import { describe, it, expect } from 'vitest';
import { remapFilePills, isInProject } from '@/utils/remapFilePills';

describe('remapFilePills', () => {
  const originalRoot = '/Users/tim/projects/my-app';
  const worktreeRoot = '/tmp/worktree-123';

  it('should remap file pills that start with originalRoot', () => {
    const markdown = 'Check out [@auth.ts](@file:/Users/tim/projects/my-app/src/auth.ts) for authentication logic.';
    const expected = 'Check out [@auth.ts](@file:/tmp/worktree-123/src/auth.ts) for authentication logic.';
    
    const result = remapFilePills(markdown, originalRoot, worktreeRoot);
    expect(result).toBe(expected);
  });

  it('should leave vault paths (outside originalRoot) unchanged', () => {
    const markdown = 'Reference [@config.json](@file:/Users/tim/vault/config.json) for settings.';
    const expected = 'Reference [@config.json](@file:/Users/tim/vault/config.json) for settings.';
    
    const result = remapFilePills(markdown, originalRoot, worktreeRoot);
    expect(result).toBe(expected);
  });

  it('should handle multiple pills with mixed paths', () => {
    const markdown = `
      Check [@auth.ts](@file:/Users/tim/projects/my-app/src/auth.ts) and 
      [@config.json](@file:/Users/tim/vault/config.json) and 
      [@utils.ts](@file:/Users/tim/projects/my-app/lib/utils.ts).
    `;
    const expected = `
      Check [@auth.ts](@file:/tmp/worktree-123/src/auth.ts) and 
      [@config.json](@file:/Users/tim/vault/config.json) and 
      [@utils.ts](@file:/tmp/worktree-123/lib/utils.ts).
    `;
    
    const result = remapFilePills(markdown, originalRoot, worktreeRoot);
    expect(result).toBe(expected);
  });

  it('should handle trailing slashes in originalRoot', () => {
    const originalWithSlash = '/Users/tim/projects/my-app/';
    const markdown = 'Check [@auth.ts](@file:/Users/tim/projects/my-app/src/auth.ts) for auth.';
    const expected = 'Check [@auth.ts](@file:/tmp/worktree-123/src/auth.ts) for auth.';
    
    const result = remapFilePills(markdown, originalWithSlash, worktreeRoot);
    expect(result).toBe(expected);
  });

  it('should handle trailing slashes in worktreeRoot', () => {
    const worktreeWithSlash = '/tmp/worktree-123/';
    const markdown = 'Check [@auth.ts](@file:/Users/tim/projects/my-app/src/auth.ts) for auth.';
    const expected = 'Check [@auth.ts](@file:/tmp/worktree-123/src/auth.ts) for auth.';
    
    const result = remapFilePills(markdown, originalRoot, worktreeWithSlash);
    expect(result).toBe(expected);
  });

  it('should handle files at the root of originalRoot', () => {
    const markdown = 'Check [@package.json](@file:/Users/tim/projects/my-app/package.json) for deps.';
    const expected = 'Check [@package.json](@file:/tmp/worktree-123/package.json) for deps.';
    
    const result = remapFilePills(markdown, originalRoot, worktreeRoot);
    expect(result).toBe(expected);
  });

  it('should handle empty markdown', () => {
    const result = remapFilePills('', originalRoot, worktreeRoot);
    expect(result).toBe('');
  });

  it('should handle markdown with no file pills', () => {
    const markdown = 'This is just regular markdown text with no file references.';
    const result = remapFilePills(markdown, originalRoot, worktreeRoot);
    expect(result).toBe(markdown);
  });

  it('should handle malformed file pills gracefully', () => {
    const markdown = 'Malformed [@incomplete](@file:) and [@valid.ts](@file:/Users/tim/projects/my-app/valid.ts)';
    // The malformed pill (empty path) should be left unchanged, but the valid pill should be remapped
    const expected = 'Malformed [@incomplete](@file:) and [@valid.ts](@file:/tmp/worktree-123/valid.ts)';
    
    const result = remapFilePills(markdown, originalRoot, worktreeRoot);
    expect(result).toBe(expected);
  });

  it('should preserve display names exactly', () => {
    const markdown = 'Check [@My Special File.tsx](@file:/Users/tim/projects/my-app/src/special.tsx) here.';
    const expected = 'Check [@My Special File.tsx](@file:/tmp/worktree-123/src/special.tsx) here.';
    
    const result = remapFilePills(markdown, originalRoot, worktreeRoot);
    expect(result).toBe(expected);
  });
});

describe('isInProject', () => {
  const originalRoot = '/Users/tim/projects/my-app';

  it('should return true for files within the project', () => {
    expect(isInProject('/Users/tim/projects/my-app/src/auth.ts', originalRoot)).toBe(true);
    expect(isInProject('/Users/tim/projects/my-app/package.json', originalRoot)).toBe(true);
  });

  it('should return false for files outside the project', () => {
    expect(isInProject('/Users/tim/vault/config.json', originalRoot)).toBe(false);
    expect(isInProject('/Users/tim/other-project/file.ts', originalRoot)).toBe(false);
  });

  it('should handle trailing slashes in originalRoot', () => {
    const originalWithSlash = '/Users/tim/projects/my-app/';
    expect(isInProject('/Users/tim/projects/my-app/src/auth.ts', originalWithSlash)).toBe(true);
    expect(isInProject('/Users/tim/vault/config.json', originalWithSlash)).toBe(false);
  });

  it('should handle exact path matches', () => {
    expect(isInProject('/Users/tim/projects/my-app', originalRoot)).toBe(true);
  });
});