/**
 * Unit tests for Git helper functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isGitRepo } from '../gitHelpers';
import { checkRepoDirtyLightweight } from '../worktreeApi';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

describe('isGitRepo', () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for non-git directory', async () => {
    mockInvoke.mockResolvedValue(false);
    
    const result = await isGitRepo('/path/to/non-git');
    
    expect(result).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith('file_exists', { path: '/path/to/non-git/.git' });
  });

  it('should return true for directory with .git folder', async () => {
    mockInvoke.mockResolvedValue(true);
    
    const result = await isGitRepo('/path/to/git-repo');
    
    expect(result).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('file_exists', { path: '/path/to/git-repo/.git' });
  });
});

describe('checkRepoDirtyLightweight', () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for clean repo', async () => {
    mockInvoke.mockResolvedValue(false);
    
    const result = await checkRepoDirtyLightweight('/path/to/clean-repo');
    
    expect(result).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith('check_repo_dirty', {
      projectRoot: '/path/to/clean-repo'
    });
  });

  it('should return true for dirty repo', async () => {
    mockInvoke.mockResolvedValue(true);
    
    const result = await checkRepoDirtyLightweight('/path/to/dirty-repo');
    
    expect(result).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('check_repo_dirty', {
      projectRoot: '/path/to/dirty-repo'
    });
  });
});