/**
 * CheckpointPill Diff Chain Test
 * 
 * Tests the diff chaining functionality where:
 * - First checkpoint pill diffs against the worktree base commit
 * - Each subsequent checkpoint pill diffs against the previous checkpoint commit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckpointPill from '../CheckpointPill';
import { useEventStore } from '@/stores/eventStore';
import { getWorktreeBaseCommit } from '@/services/scm/SCMManager';
import type { ChatMessage } from '@/types/chatTypes';
import type { CanonicalEvent } from '@/types/events';

// Mock git commands
vi.mock('@/utils/tauriGitCommands', () => ({
  gitShowFile: vi.fn()
}));

// Mock diff parser
vi.mock('@/utils/diffParser', () => ({
  parseMultiFileDiff: vi.fn(),
  parseUnifiedDiff: vi.fn(),
  parseRawDiff: vi.fn()
}));

// Mock SCM Manager
vi.mock('@/services/scm/SCMManager', () => ({
  SCMManager: vi.fn().mockImplementation(() => ({
    diff: vi.fn()
  })),
  getWorktreeBaseCommit: vi.fn()
}));

// Mock ACS client
vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn()
}));

// Mock event store
vi.mock('@/stores/eventStore', () => ({
  useEventStore: vi.fn()
}));

// Mock other components
vi.mock('@/components/AdvancedMonacoDiffViewer', () => ({
  AdvancedMonacoDiffViewer: vi.fn(() => null),
  detectLanguage: vi.fn(() => 'typescript')
}));

vi.mock('@/components/RevertConfirmationModal', () => ({
  default: vi.fn(() => null)
}));

// Mock Tauri window
Object.defineProperty(window, '__TAURI__', {
  value: {
    invoke: vi.fn(),
  },
});

describe('CheckpointPill Diff Chain', () => {
  const mockSessionId = 'test-session-123';
  const mockWorkspacePath = '/test/workspace/path';
  const mockProjectRoot = '/test/project';
  const mockBaseCommit = 'base-commit-abc123';
  const mockFirstCheckpointCommit = 'checkpoint-1-def456';
  const mockSecondCheckpointCommit = 'checkpoint-2-ghi789';

  // Mock variables that will be set in beforeEach
  let mockGitShowFile: any;
  let mockParseMultiFileDiff: any;
  let mockParseUnifiedDiff: any;
  let mockParseRawDiff: any;
  let mockGetWorktreeBaseCommit: any;
  let mockSCMManagerDiff: any;
  let mockGetSession: any;
  let mockUseEventStore: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked functions
    const tauriGitCommands = await import('@/utils/tauriGitCommands');
    const diffParser = await import('@/utils/diffParser');
    const scmManager = await import('@/services/scm/SCMManager');
    const acs = await import('@/services/acs');
    const eventStore = await import('@/stores/eventStore');

    mockGitShowFile = vi.mocked(tauriGitCommands.gitShowFile);
    mockParseMultiFileDiff = vi.mocked(diffParser.parseMultiFileDiff);
    mockParseUnifiedDiff = vi.mocked(diffParser.parseUnifiedDiff);
    mockParseRawDiff = vi.mocked(diffParser.parseRawDiff);
    mockGetWorktreeBaseCommit = vi.mocked(scmManager.getWorktreeBaseCommit);
    mockUseEventStore = vi.mocked(eventStore.useEventStore);

    // Mock SCM manager instance
    mockSCMManagerDiff = vi.fn().mockResolvedValue('mock diff content');
    vi.mocked(scmManager.SCMManager).mockImplementation(() => ({
      diff: mockSCMManagerDiff
    }) as any);

    // Mock ACS client
    mockGetSession = vi.fn().mockResolvedValue({
      data: { agent_cwd: mockWorkspacePath }
    });
    vi.mocked(acs.getDefaultACSClient).mockReturnValue({
      sessions: { getSession: mockGetSession }
    } as any);
    
    // Mock getWorktreeBaseCommit
    mockGetWorktreeBaseCommit.mockImplementation(async (sessionId, projectRoot) => {
      console.log('🔍 [TEST] getWorktreeBaseCommit called with:', { sessionId, projectRoot });
      return mockBaseCommit;
    });

    // Mock git commands
    mockGitShowFile.mockResolvedValue({
      success: true,
      stdout: 'mock file content',
      stderr: ''
    });

    // Mock diff parser functions
    mockParseMultiFileDiff.mockReturnValue({
      files: [{
        fileName: 'test.ts',
        originalContent: 'original content',
        modifiedContent: 'modified content'
      }]
    });
    mockParseUnifiedDiff.mockReturnValue({
      fileName: 'test.ts',
      originalContent: 'original content',
      modifiedContent: 'modified content'
    });
    mockParseRawDiff.mockReturnValue({
      fileName: 'test.ts',
      originalContent: 'original content',
      modifiedContent: 'modified content'
    });
  });

  const createMockMessage = (commitHash: string, messageId: string): ChatMessage => ({
    id: messageId,
    sessionId: mockSessionId,
    role: 'assistant',
    content: 'Checkpoint created',
    timestamp: new Date().toISOString(),
    meta: {
      phase: 'end' as const,
      commitHash,
      stats: {
        filesChanged: 2,
        linesAdded: 10,
        linesRemoved: 5,
        fileList: [
          { path: 'file1.ts', linesAdded: 5, linesRemoved: 2 },
          { path: 'file2.ts', linesAdded: 5, linesRemoved: 3 }
        ]
      }
    }
  });

  const createMockCheckpointEvent = (id: string, commitHash: string): CanonicalEvent => ({
    id,
    createdAt: new Date().toISOString(),
    role: 'assistant',
    partial: false,
    source: 'sse',
    sessionId: mockSessionId,
    kind: 'checkpoint',
    data: {
      phase: 'end',
      commitHash,
      stats: {
        filesChanged: 1,
        linesAdded: 5,
        linesRemoved: 2,
        fileList: [{ path: 'test.ts', linesAdded: 5, linesRemoved: 2 }]
      }
    }
  });

  it('should use worktree base commit for first checkpoint pill', async () => {
    // Setup: No previous checkpoints in event store (completely empty)
    const mockEventStore = {
      getState: vi.fn(() => ({
        bySession: new Map(),
        byId: new Map()
      }))
    };
    mockUseEventStore.mockReturnValue(mockEventStore as any);

    const firstMessage = createMockMessage(mockFirstCheckpointCommit, 'msg-1');

    render(<CheckpointPill message={firstMessage} />);

    // Wait for the component to fully render
    await waitFor(() => {
      expect(screen.getByText('Checkpoint')).toBeInTheDocument();
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByText('file1.ts')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Click on the first file to trigger diff loading
    const user = userEvent.setup();
    const firstFile = screen.getByTitle('Click to view diff for file1.ts');
    await user.click(firstFile);

    await waitFor(() => {
      // Should call getWorktreeBaseCommit since no previous checkpoint exists
      expect(mockGetWorktreeBaseCommit).toHaveBeenCalledWith(
        mockSessionId,
        mockProjectRoot
      );
    });

    await waitFor(() => {
      // Should call diff with base commit as the start
      expect(mockSCMManagerDiff).toHaveBeenCalledWith(
        mockWorkspacePath,
        mockBaseCommit,
        mockFirstCheckpointCommit
      );
    });
  });

  it('should use previous checkpoint commit for second checkpoint pill', async () => {
    // Setup: Previous checkpoint exists in event store
    const mockEventStore = {
      getState: vi.fn(() => ({
        bySession: new Map([[mockSessionId, ['msg-1', 'msg-2']]]),
        byId: new Map([
          ['msg-1', createMockCheckpointEvent('msg-1', mockFirstCheckpointCommit)],
          ['msg-2', createMockCheckpointEvent('msg-2', mockSecondCheckpointCommit)]
        ])
      }))
    };
    mockUseEventStore.mockReturnValue(mockEventStore as any);

    const secondMessage = createMockMessage(mockSecondCheckpointCommit, 'msg-2');

    render(<CheckpointPill message={secondMessage} />);

    // Click on the first file to trigger diff loading
    const firstFile = screen.getByTitle('Click to view diff for file1.ts');
    fireEvent.click(firstFile);

    await waitFor(() => {
      // Should NOT call getWorktreeBaseCommit since previous checkpoint exists
      expect(mockGetWorktreeBaseCommit).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      // Should call diff with previous checkpoint commit as the start
      expect(mockSCMManagerDiff).toHaveBeenCalledWith(
        mockWorkspacePath,
        mockFirstCheckpointCommit, // Previous checkpoint commit
        mockSecondCheckpointCommit  // Current checkpoint commit
      );
    });
  });

  it('should handle multiple checkpoints in chain correctly', async () => {
    const mockThirdCheckpointCommit = 'checkpoint-3-jkl012';
    
    // Setup: Multiple checkpoints in event store
    const mockEventStore = {
      getState: vi.fn(() => ({
        bySession: new Map([[mockSessionId, ['msg-1', 'msg-2', 'msg-3']]]),
        byId: new Map([
          ['msg-1', createMockCheckpointEvent('msg-1', mockFirstCheckpointCommit)],
          ['msg-2', createMockCheckpointEvent('msg-2', mockSecondCheckpointCommit)],
          ['msg-3', createMockCheckpointEvent('msg-3', mockThirdCheckpointCommit)]
        ])
      }))
    };
    mockUseEventStore.mockReturnValue(mockEventStore as any);

    const thirdMessage = createMockMessage(mockThirdCheckpointCommit, 'msg-3');

    render(<CheckpointPill message={thirdMessage} />);

    // Click on the first file to trigger diff loading
    const firstFile = screen.getByTitle('Click to view diff for file1.ts');
    fireEvent.click(firstFile);

    await waitFor(() => {
      // Should call diff with the immediately previous checkpoint commit
      expect(mockSCMManagerDiff).toHaveBeenCalledWith(
        mockWorkspacePath,
        mockSecondCheckpointCommit, // Previous checkpoint commit (not the first one)
        mockThirdCheckpointCommit   // Current checkpoint commit
      );
    });
  });

  it('should extract project root correctly from workspace path', async () => {
    const mockWorkspacePathWithOrchestra = '/test/project/.orchestra/worktrees/session-123';
    
    // Override the ACS client mock for this test
    mockGetSession.mockResolvedValue({
      data: { agent_cwd: mockWorkspacePathWithOrchestra }
    });

    // Setup: No previous checkpoints
    const mockEventStore = {
      getState: vi.fn(() => ({
        bySession: new Map([[mockSessionId, ['msg-1']]]),
        byId: new Map([
          ['msg-1', createMockCheckpointEvent('msg-1', mockFirstCheckpointCommit)]
        ])
      }))
    };
    mockUseEventStore.mockReturnValue(mockEventStore as any);

    const firstMessage = createMockMessage(mockFirstCheckpointCommit, 'msg-1');

    render(<CheckpointPill message={firstMessage} />);

    // Click on the first file to trigger diff loading
    const firstFile = screen.getByTitle('Click to view diff for file1.ts');
    fireEvent.click(firstFile);

    await waitFor(() => {
      // Should extract project root correctly and call getWorktreeBaseCommit
      expect(mockGetWorktreeBaseCommit).toHaveBeenCalledWith(
        mockSessionId,
        '/test/project' // Extracted project root
      );
    });
  });
});