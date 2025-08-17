/**
 * Tests for NewTaskModal inline commit toggle behavior
 * Verifies that toggling Isolation ON/OFF immediately shows/hides inline commit bar
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

describe('NewTaskModal Inline Commit Toggle Behavior', () => {
  const mockOnClose = vi.fn();
  const mockOnSessionCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear localStorage and start with Isolation ON (default)
    localStorage.clear();
    localStorage.setItem('orchestra.enableWorktrees', 'true');

    // Mock auth to return a user
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user-id' }
    });

    // Mock agent configs
    (useAgentConfigs as any).mockReturnValue({
      agentConfigsArray: [{ id: 'test-config', agent: { name: 'Test Agent' } }]
    });

    // Mock task orchestration - dirty repo
    (taskOrchestration.createTaskSession as any).mockResolvedValue('test-session-id');
    (taskOrchestration.checkRepositoryState as any).mockResolvedValue({
      isGit: true,
      isDirty: true
    });

    // Mock background worker
    (startBackgroundSessionOps as any).mockResolvedValue(undefined);
  });

  it('toggling isolation OFF shows inline commit bar for dirty repo', async () => {
    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Wait for initial repo status check
    await waitFor(() => {
      // Initially with Isolation ON + dirty, no inline commit bar
      expect(screen.queryByPlaceholderText('Quick commit message...')).not.toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    // Wait for settings to open and show "Isolated workspace enabled" initially
    await waitFor(() => {
      expect(screen.getByText('Isolated workspace enabled')).toBeInTheDocument();
    });

    // Toggle Isolation OFF
    const isolationToggle = screen.getByRole('checkbox');
    fireEvent.click(isolationToggle);

    // Should now show "Direct editing mode"
    await waitFor(() => {
      expect(screen.getByText('Direct editing mode')).toBeInTheDocument();
    });

    // Inline commit bar should now appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Quick commit message...')).toBeInTheDocument();
    });
  });

  it('toggling isolation ON hides inline commit bar for dirty repo', async () => {
    // Start with Isolation OFF
    localStorage.setItem('orchestra.enableWorktrees', 'false');

    render(
      <NewTaskModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Wait for initial repo status check - should show inline commit
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Quick commit message...')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    // Wait for settings to open and show "Direct editing mode" initially
    await waitFor(() => {
      expect(screen.getByText('Direct editing mode')).toBeInTheDocument();
    });

    // Toggle Isolation ON
    const isolationToggle = screen.getByRole('checkbox');
    fireEvent.click(isolationToggle);

    // Should now show "Isolated workspace enabled"
    await waitFor(() => {
      expect(screen.getByText('Isolated workspace enabled')).toBeInTheDocument();
    });

    // Inline commit bar should disappear
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Quick commit message...')).not.toBeInTheDocument();
    });
  });

  it('clean repo shows no inline commit regardless of isolation setting', async () => {
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

    // Wait for initial repo status check
    await waitFor(() => {
      // No inline commit bar for clean repo
      expect(screen.queryByPlaceholderText('Quick commit message...')).not.toBeInTheDocument();
    });

    // Open settings and toggle Isolation OFF
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    const isolationToggle = screen.getByRole('checkbox');
    fireEvent.click(isolationToggle);

    // Still no inline commit bar for clean repo
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Quick commit message...')).not.toBeInTheDocument();
    });

    // Toggle back ON
    fireEvent.click(isolationToggle);

    // Still no inline commit bar
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Quick commit message...')).not.toBeInTheDocument();
    });
  });
});