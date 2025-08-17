/**
 * Tests for WorktreeConflictModal component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorktreeConflictModal } from '../WorktreeConflictModal';
import { readFileAbs, writeFileAbs } from '@/utils/worktreeFs';
import { stripGitConflictMarkers } from '@/utils/conflictResolution';

// Mock dependencies
vi.mock('@/utils/worktreeFs');
vi.mock('@/utils/conflictResolution');
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));
vi.mock('@/components/AdvancedMonacoDiffViewer', () => ({
  AdvancedMonacoDiffViewer: ({ original, modified, language, onModifiedChange }: any) => (
    <div data-testid="monaco-diff-viewer">
      <div data-testid="original-content">{original}</div>
      <div data-testid="modified-content">{modified}</div>
      <div data-testid="language">{language}</div>
      <button 
        data-testid="modify-content"
        onClick={() => onModifiedChange('modified content')}
      >
        Modify Content
      </button>
    </div>
  ),
  detectLanguage: (path: string) => {
    if (path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    return 'plaintext';
  }
}));

const mockReadFileAbs = vi.mocked(readFileAbs);
const mockWriteFileAbs = vi.mocked(writeFileAbs);
const mockStripGitConflictMarkers = vi.mocked(stripGitConflictMarkers);

describe('WorktreeConflictModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    sessionId: 'test-session-123',
    sessionName: 'Test Session',
    projectRoot: '/test/project',
    worktreePath: '/test/worktree',
    conflictedFiles: ['src/main.ts', 'package.json'],
    onResolvedAll: vi.fn()
  };

  const mockFileContent = `<<<<<<< HEAD
Original content
=======
Modified content
>>>>>>> branch`;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockReadFileAbs.mockResolvedValue(mockFileContent);
    mockWriteFileAbs.mockResolvedValue(undefined);
    mockStripGitConflictMarkers.mockReturnValue({
      cleaned: 'Original content',
      hadMarkers: true
    });
  });

  it('should render modal when open', () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    expect(screen.getByText('Resolve Merge Conflicts')).toBeInTheDocument();
    expect(screen.getByText('Test Session')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    render(<WorktreeConflictModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Resolve Merge Conflicts')).not.toBeInTheDocument();
  });

  it('should display conflicted files in sidebar', () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    expect(screen.getByText('src/main.ts')).toBeInTheDocument();
    expect(screen.getByText('package.json')).toBeInTheDocument();
    expect(screen.getByText('Conflicted Files')).toBeInTheDocument();
  });

  it('should select first file by default', async () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockReadFileAbs).toHaveBeenCalledWith('/test/worktree/src/main.ts');
    });
    
    expect(screen.getByText('src/main.ts')).toBeInTheDocument();
  });

  it('should load file content when file is selected', async () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    // Click on second file
    fireEvent.click(screen.getByText('package.json'));
    
    await waitFor(() => {
      expect(mockReadFileAbs).toHaveBeenCalledWith('/test/worktree/package.json');
    });
  });

  it('should display Monaco diff viewer when file is selected', async () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-diff-viewer')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('original-content')).toHaveTextContent(mockFileContent);
    expect(screen.getByTestId('language')).toHaveTextContent('typescript');
  });

  it('should save file when Save button is clicked', async () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-diff-viewer')).toBeInTheDocument();
    });
    
    // Modify content
    fireEvent.click(screen.getByTestId('modify-content'));
    
    // Click save button
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockWriteFileAbs).toHaveBeenCalledWith('/test/worktree/src/main.ts', 'modified content');
    });
  });

  it('should mark file as resolved when Mark Resolved is clicked', async () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-diff-viewer')).toBeInTheDocument();
    });
    
    // Click mark resolved button
    fireEvent.click(screen.getByText('Mark Resolved'));
    
    // Button should be disabled
    expect(screen.getByText('Mark Resolved')).toBeDisabled();
    
    // File should be marked as resolved (check visual indicator)
    const fileButton = screen.getByText('src/main.ts').closest('button');
    expect(fileButton).toHaveClass('bg-blue-100');
  });

  it('should enable Complete Merge button when all files are resolved', async () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-diff-viewer')).toBeInTheDocument();
    });
    
    // Initially should be disabled
    expect(screen.getByText('Complete Merge')).toBeDisabled();
    
    // Mark first file as resolved
    fireEvent.click(screen.getByText('Mark Resolved'));
    
    // Switch to second file
    fireEvent.click(screen.getByText('package.json'));
    
    await waitFor(() => {
      expect(mockReadFileAbs).toHaveBeenCalledWith('/test/worktree/package.json');
    });
    
    // Mark second file as resolved
    fireEvent.click(screen.getByText('Mark Resolved'));
    
    // Complete Merge button should be enabled
    expect(screen.getByText('Complete Merge')).not.toBeDisabled();
  });

  it('should call onResolvedAll when Complete Merge is clicked', async () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-diff-viewer')).toBeInTheDocument();
    });
    
    // Mark both files as resolved
    fireEvent.click(screen.getByText('Mark Resolved'));
    fireEvent.click(screen.getByText('package.json'));
    
    await waitFor(() => {
      expect(mockReadFileAbs).toHaveBeenCalledWith('/test/worktree/package.json');
    });
    
    fireEvent.click(screen.getByText('Mark Resolved'));
    
    // Click Complete Merge
    fireEvent.click(screen.getByText('Complete Merge'));
    
    await waitFor(() => {
      expect(defaultProps.onResolvedAll).toHaveBeenCalled();
    });
  });

  it('should call onClose when Cancel is clicked', () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should handle file read errors gracefully', async () => {
    mockReadFileAbs.mockRejectedValue(new Error('File not found'));
    
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load file: src/main.ts')).toBeInTheDocument();
    });
  });

  it('should handle file save errors gracefully', async () => {
    mockWriteFileAbs.mockRejectedValue(new Error('Permission denied'));
    
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-diff-viewer')).toBeInTheDocument();
    });
    
    // Modify content and try to save
    fireEvent.click(screen.getByTestId('modify-content'));
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to save file: src/main.ts')).toBeInTheDocument();
    });
  });

  it('should detect conflict markers in files', async () => {
    render(<WorktreeConflictModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockStripGitConflictMarkers).toHaveBeenCalledWith(mockFileContent);
    });
    
    expect(mockStripGitConflictMarkers).toHaveReturnedWith({
      cleaned: 'Original content',
      hadMarkers: true
    });
  });

  it('should work with no conflicted files', () => {
    render(<WorktreeConflictModal {...defaultProps} conflictedFiles={[]} />);
    
    expect(screen.getByText('Select a file to resolve conflicts')).toBeInTheDocument();
    expect(screen.queryByText('src/main.ts')).not.toBeInTheDocument();
  });
});