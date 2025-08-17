/**
 * Tests for NewDraftModal worktree checkbox behavior
 * Verifies conditional dirty repo gating and correct option passing to background worker
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewDraftModal } from '../NewDraftModal';
import * as taskOrchestration from '@/utils/taskOrchestration';
import { startBackgroundSessionOps } from '@/workers/sessionBackgroundWorker';
import { useAuth } from '@/auth/AuthContext';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';

// Mock dependencies
vi.mock('@/utils/taskOrchestration');
vi.mock('@/workers/sessionBackgroundWorker');
vi.mock('@/auth/AuthContext');
vi.mock('@/hooks/useAgentConfigs');
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

// Mock other components
vi.mock('../CodebaseSelector', () => ({
  CodebaseSelector: ({ value, onChange }: any) => (
    <input
      data-testid="codebase-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

vi.mock('../LexicalPillEditor', () => ({
  LexicalPillEditor: ({ value, onChange }: any) => (
    <textarea
      data-testid="lexical-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

describe('NewDraftModal Worktree Toggle', () => {
  const mockOnClose = vi.fn();
  const mockOnSessionCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

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

  it('checkbox defaults to checked (worktrees enabled)', () => {
    render(
      <NewDraftModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    const checkbox = screen.getByTestId('ndm-enable-worktrees');
    expect(checkbox).toBeChecked();
  });

  it('checkbox ON + dirty repo: shows commit UI and blocks send', async () => {
    render(
      <NewDraftModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Set up content and code path
    const editor = screen.getByTestId('lexical-editor');
    const codebaseSelector = screen.getByTestId('codebase-selector');
    
    fireEvent.change(editor, { target: { value: 'Test message' } });
    fireEvent.change(codebaseSelector, { target: { value: '/test/project' } });

    // Ensure checkbox is ON (default)
    const checkbox = screen.getByTestId('ndm-enable-worktrees');
    expect(checkbox).toBeChecked();

    // Click send
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Should show commit UI
    await waitFor(() => {
      expect(screen.getByText('Commit Message')).toBeInTheDocument();
    });

    // Should NOT call startBackgroundSessionOps yet
    expect(startBackgroundSessionOps).not.toHaveBeenCalled();
  });

  it('checkbox OFF + dirty repo: bypasses commit UI and calls worker', async () => {
    render(
      <NewDraftModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Set up content and code path
    const editor = screen.getByTestId('lexical-editor');
    const codebaseSelector = screen.getByTestId('codebase-selector');
    
    fireEvent.change(editor, { target: { value: 'Test message' } });
    fireEvent.change(codebaseSelector, { target: { value: '/test/project' } });

    // Turn OFF checkbox
    const checkbox = screen.getByTestId('ndm-enable-worktrees');
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Click send
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Should NOT show commit UI
    await waitFor(() => {
      expect(screen.queryByText('Commit Message')).not.toBeInTheDocument();
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

  it('checkbox ON + clean repo: calls worker with skipWorkspacePreparation: false', async () => {
    // Mock clean repo
    (taskOrchestration.checkRepositoryState as any).mockResolvedValue({
      isGit: true,
      isDirty: false
    });

    render(
      <NewDraftModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Set up content and code path
    const editor = screen.getByTestId('lexical-editor');
    const codebaseSelector = screen.getByTestId('codebase-selector');
    
    fireEvent.change(editor, { target: { value: 'Test message' } });
    fireEvent.change(codebaseSelector, { target: { value: '/test/project' } });

    // Ensure checkbox is ON (default)
    const checkbox = screen.getByTestId('ndm-enable-worktrees');
    expect(checkbox).toBeChecked();

    // Click send
    const sendButton = screen.getByText('Send to Agent');
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

  it('non-git path: no gating regardless of checkbox state', async () => {
    // Mock non-git path
    (taskOrchestration.checkRepositoryState as any).mockResolvedValue({
      isGit: false,
      isDirty: false
    });

    render(
      <NewDraftModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Set up content and code path
    const editor = screen.getByTestId('lexical-editor');
    const codebaseSelector = screen.getByTestId('codebase-selector');
    
    fireEvent.change(editor, { target: { value: 'Test message' } });
    fireEvent.change(codebaseSelector, { target: { value: '/non/git/path' } });

    // Ensure checkbox is ON
    const checkbox = screen.getByTestId('ndm-enable-worktrees');
    expect(checkbox).toBeChecked();

    // Click send
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Should NOT show commit UI
    await waitFor(() => {
      expect(screen.queryByText('Commit Message')).not.toBeInTheDocument();
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

  it('checkbox state persists across modal opens', () => {
    const { unmount } = render(
      <NewDraftModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Turn OFF checkbox
    const checkbox = screen.getByTestId('ndm-enable-worktrees');
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    unmount();

    // Re-render modal
    render(
      <NewDraftModal
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Checkbox should remember OFF state
    const newCheckbox = screen.getByTestId('ndm-enable-worktrees');
    expect(newCheckbox).not.toBeChecked();
  });
});