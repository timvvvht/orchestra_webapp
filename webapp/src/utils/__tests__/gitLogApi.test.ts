import { getGitLog, CommitEntry } from '../gitLogApi';
import { invoke } from '@tauri-apps/api/tauri';

// Mock the invoke function
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('getGitLog', () => {
  const mockCommitEntries: CommitEntry[] = [
    {
      sha: 'abc123def456',
      author: 'John Doe',
      date: '2024-01-15 10:30:00 -0500',
      message: 'Initial commit',
    },
    {
      sha: 'def456ghi789',
      author: 'Jane Smith',
      date: '2024-01-16 14:45:00 -0500',
      message: 'Add feature X',
    },
    {
      sha: 'ghi789jkl012',
      author: 'Bob Johnson',
      date: '2024-01-17 09:15:00 -0500',
      message: 'Fix bug in feature X',
    },
  ];

  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it('should call invoke with correct parameters', async () => {
    mockInvoke.mockResolvedValue(mockCommitEntries);

    const params = { path: '/test/repo', limit: 10 };
    await getGitLog(params);

    expect(mockInvoke).toHaveBeenCalledWith('simple_git_log', {
      path: '/test/repo',
      limit: 10,
    });
  });

  it('should use default limit when not provided', async () => {
    mockInvoke.mockResolvedValue(mockCommitEntries);

    const params = { path: '/test/repo' };
    await getGitLog(params);

    expect(mockInvoke).toHaveBeenCalledWith('simple_git_log', {
      path: '/test/repo',
      limit: 50, // default value
    });
  });

  it('should return the commit entries from invoke', async () => {
    mockInvoke.mockResolvedValue(mockCommitEntries);

    const result = await getGitLog({ path: '/test/repo' });

    expect(result).toEqual(mockCommitEntries);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      sha: 'abc123def456',
      author: 'John Doe',
      date: '2024-01-15 10:30:00 -0500',
      message: 'Initial commit',
    });
  });

  it('should handle empty array result', async () => {
    mockInvoke.mockResolvedValue([]);

    const result = await getGitLog({ path: '/empty/repo' });

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should throw error when invoke fails', async () => {
    const error = new Error('Repository not found');
    mockInvoke.mockRejectedValue(error);

    await expect(getGitLog({ path: '/nonexistent/repo' })).rejects.toThrow('Repository not found');
  });

  it('should parse commit entries with correct structure', async () => {
    const singleCommit: CommitEntry[] = [
      {
        sha: 'a1b2c3d4e5f6',
        author: 'Test Author',
        date: '2024-01-20 16:00:00 +0000',
        message: 'Test commit message',
      },
    ];
    
    mockInvoke.mockResolvedValue(singleCommit);

    const result = await getGitLog({ path: '/test/repo' });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sha: expect.any(String),
      author: expect.any(String),
      date: expect.any(String),
      message: expect.any(String),
    });
  });
});