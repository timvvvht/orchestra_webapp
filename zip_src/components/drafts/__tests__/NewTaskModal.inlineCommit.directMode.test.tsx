/**
 * Tests for NewTaskModal inline commit behavior in Direct Mode
 * Verifies that when Isolation is OFF, dirty repos show inline commit and allow sending
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewTaskModal } from '../NewTaskModal';
import * as taskOrchestration from '@/utils/taskOrchestration';
import { startBackgroundSessionOps } from '@/workers/sessionBackgroundWorker';
import { useAuth } from '@/auth/AuthContext';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/utils/taskOrchestration');
vi.mock('@/workers/sessionBackgroundWorker');
vi.mock('@/auth/AuthContext');
vi.mock('@/hooks/useAgentConfigs');
vi.mock('sonner', () => ({
  toast: {
    message: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  }
}));

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

describe('NewTaskModal Direct Mode Inline Commit', () => {
  const mockOnClose = vi.fn();
  const mockOnSessionCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear localStorage and set Direct Mode (Isolation OFF)
    localStorage.clear();
    localStorage.setItem('orchestra.enableWorktrees', 'false');

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

  it('direct mode dirty: shows inline commit and allows send', async () => {
    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Type content
    const editor = screen.getByTestId('task-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });

    // Wait for repo status check to complete and inline commit to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Quick commit message...')).toBeInTheDocument();
    });

    // Click send
    const sendButton = screen.getByText('Create Task');
    fireEvent.click(sendButton);

    // Should call startBackgroundSessionOps (send proceeds)
    await waitFor(() => {
      expect(startBackgroundSessionOps).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          enableWorktrees: false,
          skipWorkspacePreparation: true
        })
      );
    });

    // Should show toast prompt about uncommitted changes
    expect((toast as any).message).toHaveBeenCalledWith(
      'Uncommitted changes detected',
      expect.objectContaining({
        description: 'Consider committing before proceeding. You can use the inline commit bar.'
      })
    );

    // Inline commit bar should still be present
    expect(screen.getByPlaceholderText('Quick commit message...')).toBeInTheDocument();
  });

  it('direct mode clean: no inline commit, send proceeds normally', async () => {
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

    // Type content
    const editor = screen.getByTestId('task-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });

    // Should NOT show inline commit bar
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Quick commit message...')).not.toBeInTheDocument();
    });

    // Click send
    const sendButton = screen.getByText('Create Task');
    fireEvent.click(sendButton);

    // Should call startBackgroundSessionOps
    await waitFor(() => {
      expect(startBackgroundSessionOps).toHaveBeenCalled();
    });

    // Should NOT show toast prompt
    expect((toast as any).message).not.toHaveBeenCalled();
  });

  it('direct mode non-git: no inline commit, send proceeds normally', async () => {
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

    // Type content
    const editor = screen.getByTestId('task-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });

    // Should NOT show inline commit bar
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Quick commit message...')).not.toBeInTheDocument();
    });

    // Click send
    const sendButton = screen.getByText('Create Task');
    fireEvent.click(sendButton);

    // Should call startBackgroundSessionOps
    await waitFor(() => {
      expect(startBackgroundSessionOps).toHaveBeenCalled();
    });

    // Should NOT show toast prompt
    expect((toast as any).message).not.toHaveBeenCalled();
  });
});