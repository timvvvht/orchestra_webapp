import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { WorktreeConflictModal } from '../WorktreeConflictModal';
import { buildDiffFilesFromConflicts } from '../WorktreeConflictModal';

// Mock dependencies
vi.mock('../WorktreeConflictModal', async () => {
  const actual = await vi.importActual('../WorktreeConflictModal');
  return {
    ...actual,
    buildDiffFilesFromConflicts: vi.fn(),
  };
});

vi.mock('@/utils/worktreeFs', () => ({
  writeFileAbs: vi.fn(),
  readFileAbs: vi.fn(),
}));

vi.mock('@/utils/pathHelpers', () => ({
  toWorktreeAbsPath: vi.fn((path, rel) => `${path}/${rel}`),
}));

vi.mock('@/utils/conflictResolution', () => ({
  stripGitConflictMarkers: vi.fn((content) => ({
    hadMarkers: content.includes('<<<<<<<'),
    cleanContent: content.replace(/<<<<<</g, '').replace(/=====/g, '').replace(/>>>>>/g, ''),
  })),
}));

vi.mock('@/components/AdvancedMonacoDiffViewer', () => ({
  AdvancedMonacoDiffViewer: ({ files, initialFileIndex }: any) => (
    <div data-testid="advanced-diff-viewer">
      <div data-testid="file-count">{files.length}</div>
      <div data-testid="current-index">{initialFileIndex}</div>
      <div data-testid="diff-panes">
        {files.map((file: any, index: number) => (
          <div key={file.id} data-testid={`diff-pane-${index}`}>
            <div data-testid="filename">{file.filename}</div>
            <div data-testid="original">{file.originalContent}</div>
            <div data-testid="modified">{file.currentContent}</div>
          </div>
        ))}
      </div>
    </div>
  ),
  detectLanguage: (filename: string) => {
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.json')) return 'json';
    return 'plaintext';
  },
}));

describe('WorktreeConflictModal with AdvancedMonacoDiffViewer', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    sessionId: 'test-session',
    sessionName: 'Test Session',
    projectRoot: '/project',
    worktreePath: '/worktree',
    conflictedFiles: ['src/index.ts', 'package.json'],
    onResolvedAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock buildDiffFilesFromConflicts to return test data
    (buildDiffFilesFromConflicts as any).mockResolvedValue([
      {
        id: 'test-1',
        filename: 'index.ts',
        filepath: '/worktree/src/index.ts',
        originalContent: 'const x = 1;',
        modifiedContent: 'const x = 2;',
        currentContent: 'const x = 2;',
        language: 'typescript',
        hasUnsavedChanges: false,
      },
      {
        id: 'test-2',
        filename: 'package.json',
        filepath: '/worktree/package.json',
        originalContent: '{}',
        modifiedContent: '{"name": "test"}',
        currentContent: '{"name": "test"}',
        language: 'json',
        hasUnsavedChanges: false,
      },
    ]);
  });

  it('renders AdvancedMonacoDiffViewer with correct props', async () => {
    render(<WorktreeConflictModal {...mockProps} />);

    // Wait for async data loading
    await waitFor(() => {
      expect(screen.getByTestId('advanced-diff-viewer')).toBeInTheDocument();
    });

    const diffViewer = screen.getByTestId('advanced-diff-viewer');
    expect(diffViewer).toBeInTheDocument();

    // Check file count
    expect(screen.getByTestId('file-count')).toHaveTextContent('2');
    
    // Check initial index
    expect(screen.getByTestId('current-index')).toHaveTextContent('0');

    // Check that both files are rendered in diff panes
    expect(screen.getByTestId('diff-pane-0')).toBeInTheDocument();
    expect(screen.getByTestId('diff-pane-1')).toBeInTheDocument();
    
    // Check file names
    expect(screen.getByTestId('filename')).toHaveTextContent('index.ts');
  });

  it('shows loading state initially', () => {
    // Mock the function to delay response
    (buildDiffFilesFromConflicts as any).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<WorktreeConflictModal {...mockProps} />);

    expect(screen.getByText('Loading conflicted files...')).toBeInTheDocument();
  });

  it('renders sidebar with conflicted files', async () => {
    render(<WorktreeConflictModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Conflicted Files')).toBeInTheDocument();
    });

    // Check that both files are listed in sidebar
    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeInTheDocument();
      expect(screen.getByText('package.json')).toBeInTheDocument();
    });
  });

  it('calls buildDiffFilesFromConflicts with correct parameters', () => {
    render(<WorktreeConflictModal {...mockProps} />);

    expect(buildDiffFilesFromConflicts).toHaveBeenCalledWith(
      mockProps.worktreePath,
      mockProps.conflictedFiles
    );
  });
});