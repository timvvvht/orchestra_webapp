import { buildDiffFilesFromConflicts } from '../WorktreeConflictModal';
import { readFileAbs } from '@/utils/worktreeFs';
import { toWorktreeAbsPath } from '@/utils/pathHelpers';
import { detectLanguage } from '@/components/AdvancedMonacoDiffViewer';

// Mock dependencies
vi.mock('@/utils/worktreeFs');
vi.mock('@/utils/pathHelpers');
vi.mock('@/components/AdvancedMonacoDiffViewer');

describe('buildDiffFilesFromConflicts', () => {
  const mockWorktreePath = '/worktree';
  const mockConflictedFiles = ['src/index.ts', 'package.json'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    (toWorktreeAbsPath as any).mockImplementation((worktreePath: string, relPath: string) => {
      return `${worktreePath}/${relPath}`;
    });
    
    (readFileAbs as any).mockResolvedValue('mock file content');
    
    (detectLanguage as any).mockImplementation((filename: string) => {
      if (filename.endsWith('.ts')) return 'typescript';
      if (filename.endsWith('.json')) return 'json';
      return 'plaintext';
    });
  });

  it('should build DiffFile array with correct structure', async () => {
    const result = await buildDiffFilesFromConflicts(mockWorktreePath, mockConflictedFiles);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      filename: 'index.ts',
      filepath: '/worktree/src/index.ts',
      originalContent: 'mock file content',
      modifiedContent: 'mock file content',
      currentContent: 'mock file content',
      language: 'typescript',
      hasUnsavedChanges: false,
    });
    
    expect(result[1]).toMatchObject({
      filename: 'package.json',
      filepath: '/worktree/package.json',
      language: 'json',
    });
  });

  it('should handle file read errors gracefully', async () => {
    (readFileAbs as any).mockRejectedValue(new Error('File not found'));
    
    const result = await buildDiffFilesFromConflicts(mockWorktreePath, mockConflictedFiles);
    
    expect(result).toHaveLength(2);
    expect(result[0].originalContent).toBe('');
    expect(result[1].originalContent).toBe('');
  });

  it('should call path utilities correctly', async () => {
    await buildDiffFilesFromConflicts(mockWorktreePath, mockConflictedFiles);
    
    expect(toWorktreeAbsPath).toHaveBeenCalledWith(mockWorktreePath, 'src/index.ts');
    expect(toWorktreeAbsPath).toHaveBeenCalledWith(mockWorktreePath, 'package.json');
    expect(readFileAbs).toHaveBeenCalledWith('/worktree/src/index.ts');
    expect(readFileAbs).toHaveBeenCalledWith('/worktree/package.json');
  });

  it('should detect languages correctly', async () => {
    await buildDiffFilesFromConflicts(mockWorktreePath, mockConflictedFiles);
    
    expect(detectLanguage).toHaveBeenCalledWith('src/index.ts');
    expect(detectLanguage).toHaveBeenCalledWith('package.json');
  });
});