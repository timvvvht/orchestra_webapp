import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorktreeMergePreview } from '@/hooks/useWorktreeMergePreview';
import * as api from '@/utils/worktreeApi';

describe('useWorktreeMergePreview', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads preview successfully', async () => {
    const mockSummary = {
      base: 'main', target: 'mc/s1', files_changed: 2, insertions: 10, deletions: 3,
      changes: [{ path: 'a.txt', status: 'M', additions: 7, deletions: 2 }]
    };
    vi.spyOn(api, 'invokePreviewMergeWorktree').mockResolvedValue(mockSummary as any);

    const { result } = renderHook(() => useWorktreeMergePreview());
    await act(async () => {
      const ret = await result.current.fetchPreview('s1', '/repo');
      expect(ret).toEqual(mockSummary);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockSummary);
  });

  it('handles error', async () => {
    vi.spyOn(api, 'invokePreviewMergeWorktree').mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useWorktreeMergePreview());
    await expect(result.current.fetchPreview('s1', '/repo')).rejects.toThrow('fail');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('fail');
  });
});
