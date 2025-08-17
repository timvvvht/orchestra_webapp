import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DirtyRepoDialog from '../DirtyRepoDialog';

// Mock the git hooks
const mockGitStatus = vi.fn();
const mockGitDiffFile = vi.fn();
const mockGitStage = vi.fn();
const mockGitCommit = vi.fn();
const mockGitStash = vi.fn();
const mockGitDiscard = vi.fn();

vi.mock('../../../hooks/useGitStatus', () => ({
  useGitStatus: () => ({
    data: mockGitStatus(),
    refetch: vi.fn()
  })
}));

vi.mock('../../../hooks/useGitDiffFile', () => ({
  useGitDiffFile: () => ({
    data: mockGitDiffFile()
  })
}));

vi.mock('../../../hooks/useGitMutations', () => ({
  useGitStage: () => ({
    mutateAsync: mockGitStage,
    isPending: false
  }),
  useGitCommit: () => ({
    mutateAsync: mockGitCommit,
    isPending: false
  }),
  useGitStash: () => ({
    mutateAsync: mockGitStash,
    isPending: false
  }),
  useGitDiscard: () => ({
    mutateAsync: mockGitDiscard,
    isPending: false
  })
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  DiffEditor: ({ original, modified }: { original: string; modified: string }) => (
    <div data-testid="monaco-diff-editor">
      <div data-testid="original-content">{original}</div>
      <div data-testid="modified-content">{modified}</div>
    </div>
  )
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('DirtyRepoDialog', () => {
  const mockOnResolve = vi.fn();
  const mockOnClose = vi.fn();
  
  const defaultProps = {
    open: true,
    projectRoot: '/test/repo',
    onResolve: mockOnResolve,
    onClose: mockOnClose
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock data
    mockGitStatus.mockReturnValue([
      { path: 'file1.txt', status: 'M' },
      { path: 'file2.js', status: 'A' },
      { path: 'file3.py', status: '??' }
    ]);
    
    mockGitDiffFile.mockReturnValue('diff content here');
  });

  it('renders dialog with file list', () => {
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Repository Has Uncommitted Changes')).toBeInTheDocument();
    expect(screen.getByText('/test/repo')).toBeInTheDocument();
    expect(screen.getByText('Changed Files (3)')).toBeInTheDocument();
    
    // Check files are displayed
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.js')).toBeInTheDocument();
    expect(screen.getByText('file3.py')).toBeInTheDocument();
    
    // Check status labels
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Untracked')).toBeInTheDocument();
  });

  it('shows diff when file is selected', async () => {
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    // Click on a file
    fireEvent.click(screen.getByText('file1.txt'));
    
    // Should show diff viewer
    expect(screen.getByTestId('monaco-diff-editor')).toBeInTheDocument();
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
  });

  it('handles file selection with checkboxes', () => {
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    // Get checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Select first file
    fireEvent.click(checkboxes[0]);
    
    // Should show 1 selected
    expect(screen.getByText('1 of 3 files selected')).toBeInTheDocument();
    
    // Stage & Commit button should show count
    expect(screen.getByText('Stage & Commit (1)')).toBeInTheDocument();
  });

  it('handles Select All functionality', () => {
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    // Click Select All
    fireEvent.click(screen.getByText('Select All'));
    
    // Should show all selected
    expect(screen.getByText('3 of 3 files selected')).toBeInTheDocument();
    expect(screen.getByText('Stage & Commit (3)')).toBeInTheDocument();
  });

  it('handles Stage & Commit flow', async () => {
    mockGitStage.mockResolvedValue(undefined);
    mockGitCommit.mockResolvedValue('abc123');
    
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    // Select a file
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Click Stage & Commit
    fireEvent.click(screen.getByText('Stage & Commit (1)'));
    
    // Should show commit message input
    await waitFor(() => {
      expect(screen.getByLabelText('Commit Message')).toBeInTheDocument();
    });
    
    // Enter commit message
    const commitInput = screen.getByLabelText('Commit Message');
    fireEvent.change(commitInput, { target: { value: 'Test commit message' } });
    
    // Click Commit button
    fireEvent.click(screen.getByText('Commit'));
    
    // Should call git operations
    await waitFor(() => {
      expect(mockGitStage).toHaveBeenCalledWith({
        projectRoot: '/test/repo',
        files: ['file1.txt']
      });
      expect(mockGitCommit).toHaveBeenCalledWith({
        projectRoot: '/test/repo',
        message: 'Test commit message'
      });
    });
  });

  it('handles Stash & Continue', async () => {
    mockGitStash.mockResolvedValue(undefined);
    
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    // Click Stash & Continue
    fireEvent.click(screen.getByText('Stash & Continue'));
    
    await waitFor(() => {
      expect(mockGitStash).toHaveBeenCalledWith({
        projectRoot: '/test/repo'
      });
      expect(mockOnResolve).toHaveBeenCalled();
    });
  });

  it('handles Discard Changes with confirmation', async () => {
    mockGitDiscard.mockResolvedValue(undefined);
    
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    // Select a file
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Click Discard Changes
    fireEvent.click(screen.getByText('Discard Changes (1)'));
    
    // Should show confirmation dialog
    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to discard changes in 1 file(s)? This cannot be undone.'
    );
    
    await waitFor(() => {
      expect(mockGitDiscard).toHaveBeenCalledWith({
        projectRoot: '/test/repo',
        files: ['file1.txt']
      });
    });
    
    confirmSpy.mockRestore();
  });

  it('auto-resolves when repository becomes clean', () => {
    // Start with dirty files
    mockGitStatus.mockReturnValue([
      { path: 'file1.txt', status: 'M' }
    ]);
    
    const { rerender } = render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    // Repository becomes clean
    mockGitStatus.mockReturnValue([]);
    
    rerender(<DirtyRepoDialog {...defaultProps} />);
    
    // Should call onResolve
    expect(mockOnResolve).toHaveBeenCalled();
  });

  it('closes dialog when Cancel is clicked', () => {
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables buttons when no files are selected', () => {
    render(<DirtyRepoDialog {...defaultProps} />, { wrapper: createWrapper() });
    
    // Stage & Commit and Discard Changes should be disabled
    expect(screen.getByText('Stage & Commit (0)')).toBeDisabled();
    expect(screen.getByText('Discard Changes (0)')).toBeDisabled();
    
    // Stash & Continue should be enabled
    expect(screen.getByText('Stash & Continue')).not.toBeDisabled();
  });
});