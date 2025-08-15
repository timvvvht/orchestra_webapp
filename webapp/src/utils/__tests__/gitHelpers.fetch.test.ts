import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRepoStatus } from '../gitHelpers';
import { invoke } from '@tauri-apps/api/core';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('fetchRepoStatus', () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return repo status entries from backend', async () => {
    const mockResponse = [{ status: 'M', path: 'app.ts' }];
    mockInvoke.mockResolvedValue(mockResponse);

    const result = await fetchRepoStatus('/');

    expect(mockInvoke).toHaveBeenCalledWith('git_repo_status_porcelain', { projectRoot: '/' });
    expect(result).toEqual(mockResponse);
  });

  it('should throw GitStatusFailure error when backend fails', async () => {
    const mockError = new Error('Backend error');
    mockInvoke.mockRejectedValue(mockError);

    await expect(fetchRepoStatus('/')).rejects.toThrow('GitStatusFailure: Error: Backend error');
  });
});