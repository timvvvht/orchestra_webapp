import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConflictDialog } from '../ConflictDialog';
import { WorktreeConflictModal } from '@/components/WorktreeConflictModal';

// Mock the WorktreeConflictModal
vi.mock('@/components/WorktreeConflictModal', () => ({
  WorktreeConflictModal: ({ isOpen, onClose, sessionId, sessionName, projectRoot, worktreePath, conflictedFiles, onResolvedAll }: any) => (
    <div data-testid="worktree-conflict-modal">
      <div data-testid="is-open">{isOpen.toString()}</div>
      <div data-testid="session-id">{sessionId}</div>
      <div data-testid="session-name">{sessionName || 'no-session-name'}</div>
      <div data-testid="project-root">{projectRoot}</div>
      <div data-testid="worktree-path">{worktreePath}</div>
      <div data-testid="conflicted-files">{JSON.stringify(conflictedFiles)}</div>
      <button onClick={onClose}>Close Modal</button>
      <button onClick={onResolvedAll}>Resolve All</button>
    </div>
  ),
}));

describe('ConflictDialog', () => {
  const mockConflictInfo = {
    sessionId: 'test-session-123',
    sessionName: 'Test Session',
    projectRoot: '/Users/tim/Code/orchestra',
    worktreePath: '/Users/tim/Code/orchestra/.orchestra/worktrees/test-session-123',
    conflictedFiles: ['src/file1.ts', 'src/file2.ts'],
    patch: 'diff content here',
  };

  const mockOnClose = vi.fn();
  const mockOnResolvedAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ConflictDialog
        open={false}
        onClose={mockOnClose}
        conflictInfo={mockConflictInfo}
        onResolvedAll={mockOnResolvedAll}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('worktree-conflict-modal')).not.toBeInTheDocument();
  });

  it('renders WorktreeConflictModal when open is true', () => {
    render(
      <ConflictDialog
        open={true}
        onClose={mockOnClose}
        conflictInfo={mockConflictInfo}
        onResolvedAll={mockOnResolvedAll}
      />
    );

    expect(screen.getByTestId('worktree-conflict-modal')).toBeInTheDocument();
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
  });

  it('forwards props correctly to WorktreeConflictModal', () => {
    render(
      <ConflictDialog
        open={true}
        onClose={mockOnClose}
        conflictInfo={mockConflictInfo}
        onResolvedAll={mockOnResolvedAll}
      />
    );

    expect(screen.getByTestId('session-id')).toHaveTextContent('test-session-123');
    expect(screen.getByTestId('session-name')).toHaveTextContent('Test Session');
    expect(screen.getByTestId('project-root')).toHaveTextContent('/Users/tim/Code/orchestra');
    expect(screen.getByTestId('worktree-path')).toHaveTextContent('/Users/tim/Code/orchestra/.orchestra/worktrees/test-session-123');
    expect(screen.getByTestId('conflicted-files')).toHaveTextContent(JSON.stringify(['src/file1.ts', 'src/file2.ts']));
  });

  it('handles undefined sessionName gracefully', () => {
    const conflictInfoWithoutSessionName = {
      ...mockConflictInfo,
      sessionName: undefined,
    };

    render(
      <ConflictDialog
        open={true}
        onClose={mockOnClose}
        conflictInfo={conflictInfoWithoutSessionName}
        onResolvedAll={mockOnResolvedAll}
      />
    );

    expect(screen.getByTestId('session-name')).toHaveTextContent('no-session-name');
  });

  it('returns null when conflictInfo is undefined', () => {
    const { container } = render(
      <ConflictDialog
        open={true}
        onClose={mockOnClose}
        conflictInfo={undefined}
        onResolvedAll={mockOnResolvedAll}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('worktree-conflict-modal')).not.toBeInTheDocument();
  });

  it('forwards callback handlers correctly', () => {
    render(
      <ConflictDialog
        open={true}
        onClose={mockOnClose}
        conflictInfo={mockConflictInfo}
        onResolvedAll={mockOnResolvedAll}
      />
    );

    const closeButton = screen.getByText('Close Modal');
    const resolveButton = screen.getByText('Resolve All');

    closeButton.click();
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    resolveButton.click();
    expect(mockOnResolvedAll).toHaveBeenCalledTimes(1);
  });
});