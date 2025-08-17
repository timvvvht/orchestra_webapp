import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MergeConfirmDialog } from '@/components/mission-control-v2/MergeConfirmDialog';

const baseProps = {
  open: true,
  onConfirm: () => {},
  onCancel: () => {},
};

describe('MergeConfirmDialog - Preview', () => {
  it('shows loading state', () => {
    render(<MergeConfirmDialog {...baseProps} previewLoading={true} />);
    expect(screen.getByText(/Previewing changes/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<MergeConfirmDialog {...baseProps} previewError={'fail'} />);
    expect(screen.getByText(/Failed to load preview/i)).toBeInTheDocument();
  });

  it('shows preview data', () => {
    render(<MergeConfirmDialog {...baseProps} preview={{ base: 'main', target: 'mc/s1', files_changed: 1, insertions: 2, deletions: 1, changes: [{ path: 'a.txt', status: 'M', additions: 2, deletions: 1 }] }} />);
    expect(screen.getByText(/1 files changed/i)).toBeInTheDocument();
    expect(screen.getByText(/\+2/i)).toBeInTheDocument();
  });
});
