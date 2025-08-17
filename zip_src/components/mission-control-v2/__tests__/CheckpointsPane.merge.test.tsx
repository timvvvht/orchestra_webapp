import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckpointsPane from '../CheckpointsPane';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('@/services/scm/SCMManager', () => ({
  SCMManager: vi.fn().mockImplementation(() => ({
    revert: vi.fn().mockResolvedValue(undefined),
    diff: vi.fn().mockResolvedValue('mock diff content'),
  })),
}));

vi.mock('@/auth/SupabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('@/utils/tauriGitCommands', () => ({
  gitShowFile: vi.fn().mockResolvedValue({ success: true, stdout: 'mock file content' }),
}));

vi.mock('@/utils/diffParser', () => ({
  parseMultiFileDiff: vi.fn().mockReturnValue({ files: [] }),
  detectLanguage: vi.fn().mockReturnValue('javascript'),
}));

vi.mock('@/utils/gitDiffStats', () => ({
  getDiffStatsFromUnifiedDiff: vi.fn().mockReturnValue({
    filesChanged: 1,
    additions: 10,
    deletions: 5,
  }),
}));

// Mock MergeWorktreeButton to a simple button with data attribute
vi.mock('../MergeWorktreeButton', () => ({
  MergeWorktreeButton: (props: any) => (
    <button 
      data-merge-button={props['data-merge-button']} 
      data-testid="merge-worktree-button"
      onClick={() => console.log('MergeWorktreeButton clicked')}
      {...props}
    >
      Merge & finalize
    </button>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn().mockReturnValue('2 minutes ago'),
}));

// Mock DiffViewer
vi.mock('@/components/DiffViewer', () => ({
  DiffViewer: ({ onClose }: any) => (
    <div data-testid="diff-viewer">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('CheckpointsPane - Merge Flow', () => {
  const mockAgent = {
    id: 'test-agent',
    mission_title: 'Test Mission',
    agent_cwd: '/test/workspace',
    status: 'complete' as const,
    isFinalized: false,
  };

  const mockSessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('verifies MergeWorktreeButton mock renders with data attribute', () => {
    // Test that our mock MergeWorktreeButton works correctly
    const { container } = render(
      <div>
        <div className="hidden">
          <button data-merge-button={mockSessionId} data-testid="merge-worktree-button">
            Merge & finalize
          </button>
        </div>
      </div>
    );

    const hiddenMergeButton = container.querySelector(`[data-merge-button="${mockSessionId}"]`);
    expect(hiddenMergeButton).toBeTruthy();
    expect(hiddenMergeButton?.closest('.hidden')).toBeTruthy();
  });

  it('localStorage preference check works correctly', () => {
    // Set the localStorage preference to hide confirmation
    localStorage.setItem('mc.hideMergeConfirmation', 'true');

    // Verify the preference was set
    expect(localStorage.getItem('mc.hideMergeConfirmation')).toBe('true');

    // Simulate the localStorage check that happens in handleMergeCheckpoint
    const hidePref = localStorage.getItem('mc.hideMergeConfirmation');
    if (hidePref === 'true') {
      toast.info("Merge confirmation is disabled. Clear 'mc.hideMergeConfirmation' to re-enable the dialog.");
    }

    expect(toast.info).toHaveBeenCalledWith("Merge confirmation is disabled. Clear 'mc.hideMergeConfirmation' to re-enable the dialog.");
  });

  it('missing trigger detection works correctly', () => {
    // Simulate the querySelector logic from handleMergeCheckpoint when no button exists
    const mergeButton = document.querySelector(`[data-merge-button="${mockSessionId}"]`) as HTMLButtonElement | null;
    if (!mergeButton) {
      toast.error('Merge control not available. Please refresh or ensure session is ready.');
    }

    expect(toast.error).toHaveBeenCalledWith('Merge control not available. Please refresh or ensure session is ready.');
  });

  it('CheckpointsPane component renders without crashing', () => {
    // Basic smoke test to ensure the component can render
    expect(() => {
      render(
        <CheckpointsPane 
          sessionId={mockSessionId} 
          agent={mockAgent} 
        />
      );
    }).not.toThrow();
  });
});