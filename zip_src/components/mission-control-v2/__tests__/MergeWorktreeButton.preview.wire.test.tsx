import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MergeWorktreeButton } from '@/components/mission-control-v2/MergeWorktreeButton';

vi.mock('@/hooks/useWorktreeMergePreview', () => ({
  useWorktreeMergePreview: () => ({
    isLoading: false,
    error: null,
    data: { base: 'main', target: 'mc/s1', files_changed: 1, insertions: 2, deletions: 1, changes: [{ path: 'a.txt', status: 'M', additions: 2, deletions: 1 }] },
    fetchPreview: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@/hooks/useDirtyRepoStatus', () => ({
  useDirtyRepoStatus: () => ({ isLoading: false, refetch: vi.fn().mockResolvedValue({ data: false }) }),
}));

vi.mock('@/hooks/useMergeWorktree', () => ({
  useMergeWorktree: () => ({ mergeWorktree: vi.fn().mockResolvedValue({ status: 'no_changes' }), isLoading: false })
}));

vi.mock('@/utils/worktreeUtils', () => ({
  getRepoRootFromWorktree: (p: string) => p,
}));

describe('MergeWorktreeButton - Preview wiring', () => {
  it('opens dialog and shows preview', async () => {
    render(<MergeWorktreeButton sessionId="s1" workspacePath="/repo/wt" /> as any);
    const btn = screen.getByTitle(/Merge & finalize/i);
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/files changed/i)).toBeInTheDocument();
    });
  });
});
