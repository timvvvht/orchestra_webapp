/**
 * Tests for NewTaskModal worktree checkbox behavior
 * Verifies conditional dirty repo gating and correct option passing to background worker
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewTaskModal } from '../NewTaskModal';
import * as taskOrchestration from '@/utils/taskOrchestration';
import { startBackgroundSessionOps } from '@/workers/sessionBackgroundWorker';
import { useAuth } from '@/auth/AuthContext';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';

// Mock dependencies
vi.mock('@/utils/taskOrchestration');
vi.mock('@/workers/sessionBackgroundWorker');
vi.mock('@/auth/AuthContext');
vi.mock('@/hooks/useAgentConfigs');
vi.mock('@/hooks/useMissionControlShortcuts', () => ({
  useMissionControlShortcuts: () => ({
    getShortcutHint: () => '⌘↵'
  })
}));
vi.mock('@/hooks/useFileSearch', () => ({
  useFileSearch: () => ({
    results: [],
    isLoading: false
  })
}));
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: { vault: { path: '/test/vault' } }
  })
}));
vi.mock('@/context/SelectionContext', () => ({
  useSelections: () => ({ selectedModelId: 'test-model' })
}));
vi.mock('@/utils/projectStorage', () => ({
  recentProjectsManager: {
    get: () => [{ name: 'test-project', path: '/test/project' }],
    add: vi.fn()
  }
}));
vi.mock('@/stores/missionControlStore', () => ({
  useMissionControlStore: {
    getState: () => ({
      sessions: [],
      setSessions: vi.fn(),
      setInitialDraftCodePath: vi.fn()
    })
  }
}));
vi.mock('@/stores/draftStore', () => ({
  useDraftStore: {
    getState: () => ({
      addDraft: vi.fn()
    })
  }
}));

// Mock additional utilities
vi.mock('@/utils/remapFilePills', () => ({
  remapFilePills: (content: string) => content
}));

vi.mock('@/utils/gitStatus', () => ({
  getRepoPorcelainStatus: vi.fn().mockResolvedValue([
    { status: 'M', path: 'test-file.txt' }
  ])
}));

vi.mock('@/utils', () => ({
  AUTO_MODE_PRESETS: {
    best: { explore: 'gpt-4', plan: 'gpt-4', execute: 'gpt-4', debug: 'gpt-4' }
  }
}));

// Mock other components
vi.mock('../LexicalPillEditor', () => ({
  LexicalPillEditor: ({ value, onChange }: any) => (
    <textarea
      data-testid="task-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

vi.mock('../GitStatusList', () => ({
  default: ({ entries }: any) => (
    <div data-testid="git-status-list">
      {entries.map((entry: any, idx: number) => (
        <div key={idx} data-testid={`git-status-${entry.status}-${entry.path}`}>
          {entry.status} {entry.path}
        </div>
      ))}
    </div>
  )
}));

describe('NewTaskModal Worktree Toggle', () => {
  const mockOnClose = vi.fn();
  const mockOnSessionCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
    // Set default worktree preference to true
    localStorage.setItem('orchestra.enableWorktrees', 'true');

    // Mock auth to return a user
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user-id' }
    });

    // Mock agent configs
    (useAgentConfigs as any).mockReturnValue({
      agentConfigsArray: [{ id: 'test-config', agent: { name: 'Test Agent' } }]
    });

    // Mock task orchestration
    (taskOrchestration.createTaskSession as any).mockResolvedValue('test-session-id');
    (taskOrchestration.checkRepositoryState as any).mockResolvedValue({
      isGit: true,
      isDirty: true
    });

    // Mock background worker
    (startBackgroundSessionOps as any).mockResolvedValue(undefined);
  });

  it('worktrees default to enabled', () => {
    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Find the settings toggle button
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    // Should show isolated workspace enabled by default
    expect(screen.getByText('Isolated workspace enabled')).toBeInTheDocument();
  });

  it('worktrees ON + dirty repo: shows commit UI and blocks send', async () => {
    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Set up content
    const editor = screen.getByTestId('task-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });

    // Should NOT show inline commit input when Isolation ON + dirty
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Quick commit message...')).not.toBeInTheDocument();
    });

    // Click send (worktrees are enabled by default)
    const sendButton = screen.getByText('Create Task');
    fireEvent.click(sendButton);

    // Should show commit UI
    await waitFor(() => {
      expect(screen.getByText('Repository has uncommitted changes')).toBeInTheDocument();
      expect(screen.getByText('Commit Message')).toBeInTheDocument();
    });

    // Should NOT call startBackgroundSessionOps yet
    expect(startBackgroundSessionOps).not.toHaveBeenCalled();
  });

  it('worktrees OFF + dirty repo: bypasses commit UI and calls worker', async () => {
    // Set worktrees to disabled in localStorage
    localStorage.setItem('orchestra.enableWorktrees', 'false');
    
    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Set up content
    const editor = screen.getByTestId('task-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });

    // Click send
    const sendButton = screen.getByText('Create Task');
    fireEvent.click(sendButton);

    // Should NOT show commit UI
    await waitFor(() => {
      expect(screen.queryByText('Repository has uncommitted changes')).not.toBeInTheDocument();
    });

    // Should call startBackgroundSessionOps with skipWorkspacePreparation: true
    await waitFor(() => {
      expect(startBackgroundSessionOps).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          enableWorktrees: false,
          skipWorkspacePreparation: true
        })
      );
    });
  });

  it('worktrees ON + clean repo: calls worker with skipWorkspacePreparation: false', async () => {
    // Mock clean repo
    (taskOrchestration.checkRepositoryState as any).mockResolvedValue({
      isGit: true,
      isDirty: false
    });

    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Set up content
    const editor = screen.getByTestId('task-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });

    // Click send
    const sendButton = screen.getByText('Create Task');
    fireEvent.click(sendButton);

    // Should call startBackgroundSessionOps with skipWorkspacePreparation: false
    await waitFor(() => {
      expect(startBackgroundSessionOps).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          enableWorktrees: true,
          skipWorkspacePreparation: false
        })
      );
    });
  });

  it('non-git path: no gating regardless of worktree setting', async () => {
    // Mock non-git path
    (taskOrchestration.checkRepositoryState as any).mockResolvedValue({
      isGit: false,
      isDirty: false
    });

    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Set up content
    const editor = screen.getByTestId('task-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });

    // Click send
    const sendButton = screen.getByText('Create Task');
    fireEvent.click(sendButton);

    // Should NOT show commit UI
    await waitFor(() => {
      expect(screen.queryByText('Repository has uncommitted changes')).not.toBeInTheDocument();
    });

    // Should call startBackgroundSessionOps with skipWorkspacePreparation: false
    await waitFor(() => {
      expect(startBackgroundSessionOps).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          enableWorktrees: true,
          skipWorkspacePreparation: false
        })
      );
    });
  });

  it('worktree setting persists across modal opens', () => {
    // Set worktrees to disabled
    localStorage.setItem('orchestra.enableWorktrees', 'false');
    
    const { unmount } = render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Open settings to verify it shows direct editing mode
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText('Direct editing mode')).toBeInTheDocument();

    unmount();

    // Re-render modal
    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Open settings again
    const newSettingsButton = screen.getByText('Settings');
    fireEvent.click(newSettingsButton);

    // Should still show direct editing mode
    expect(screen.getByText('Direct editing mode')).toBeInTheDocument();
  });
});