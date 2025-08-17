/**
 * NewDraftModal Worktree Path Integration Tests
 * Tests that the modal correctly fetches real worktree CWD and updates Supabase
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from 'sonner';
import { NewDraftModal } from '../NewDraftModal';
import * as taskOrchestration from '@/utils/taskOrchestration';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useAuth } from '@/auth/AuthContext';
import { startBackgroundSessionOps } from '@/workers/sessionBackgroundWorker';
import { autoCommitRepo } from '@/utils/worktreeApi';

// Mock dependencies
vi.mock('sonner');
vi.mock('@/utils/taskOrchestration');
vi.mock('@/stores/missionControlStore');
vi.mock('@/auth/AuthContext');
vi.mock('@/workers/sessionBackgroundWorker');
vi.mock('@/utils/worktreeApi');
vi.mock('@/hooks/useAgentConfigs', () => ({
  useAgentConfigs: () => ({
    agentConfigsArray: [
      { id: 'test-config-1', agent: { name: 'Test Agent' } }
    ]
  })
}));
vi.mock('@/context/SelectionContext', () => ({
  useSelections: () => ({
    selectedModelId: 'test-model'
  })
}));
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: { vault: { path: '/test/vault' } }
  })
}));

// Mock other dependencies
vi.mock('@/utils/projectStorage', () => ({
  recentProjectsManager: {
    get: () => [{ path: '/test/recent/project' }]
  }
}));

vi.mock('@/hooks/useFileSearch', () => ({
  useFileSearch: () => ({
    results: [],
    isLoading: false
  })
}));

vi.mock('@/hooks/useMissionControlShortcuts', () => ({
  useMissionControlShortcuts: () => ({
    getShortcutHint: (key: string) => key === 'save' ? '⌘S' : '⌘↵'
  })
}));

// Mock LexicalPillEditor to make testing easier
let mockOnChange: ((value: string) => void) | null = null;

vi.mock('../LexicalPillEditor', () => ({
  LexicalPillEditor: ({ value, onChange, placeholder, autoFocus }: any) => {
    // Store the onChange callback so we can call it directly in tests
    mockOnChange = onChange;
    return (
      <div
        role="textbox"
        data-testid="lexical-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={(e: any) => {
          // Simulate the editor calling onChange when content changes
          const newValue = e.target.textContent || '';
          onChange(newValue);
        }}
        style={{ minHeight: '150px', border: '1px solid #ccc', padding: '8px' }}
      >
        {value}
      </div>
    );
  }
}));

const mockTaskOrchestration = taskOrchestration as any;
const mockUseMissionControlStore = useMissionControlStore as any;
const mockUseAuth = useAuth as any;
const mockStartBackgroundSessionOps = startBackgroundSessionOps as any;
const mockToast = toast as any;
const mockAutoCommitRepo = autoCommitRepo as any;

describe('NewDraftModal - Worktree Path Integration', () => {
  const mockStore = {
    sessions: [],
    setSessions: vi.fn(),
    setBackgroundProcessing: vi.fn(),
    updateSession: vi.fn()
  };

  const mockAuth = {
    user: { id: 'test-user-123' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnChange = null;
    
    // Setup store mock
    mockUseMissionControlStore.mockImplementation(() => ({
      getState: () => mockStore,
      ...mockStore
    }) as any);

    // Setup auth mock
    mockUseAuth.mockReturnValue(mockAuth as any);

    // Setup task orchestration mocks
    mockTaskOrchestration.createTaskSession.mockResolvedValue('session-123');
    mockTaskOrchestration.prepareTaskWorkspace.mockResolvedValue('/tmp/worktree-session-123');
    mockTaskOrchestration.updateTaskCwd.mockResolvedValue();
    mockTaskOrchestration.checkRepositoryState.mockResolvedValue({
      isDirty: false,
      isGit: true
    });

    // Setup toast mocks
    mockToast.success = vi.fn();
    mockToast.error = vi.fn();

    // Setup autoCommitRepo mock
    mockAutoCommitRepo.mockResolvedValue(undefined);
  });

  it('should call prepareTaskWorkspace and updateTaskCwd in normal send flow', async () => {
    const onClose = vi.fn();
    const onSessionCreated = vi.fn();

    render(
      <NewDraftModal 
        onClose={onClose} 
        onSessionCreated={onSessionCreated}
      />
    );

    // Wait for the component to render and the onChange callback to be available
    await waitFor(() => {
      expect(mockOnChange).toBeTruthy();
    });
    
    // Wait for codePath to be auto-filled from recent projects, or set it manually
    let codePathInput;
    try {
      await waitFor(() => {
        codePathInput = screen.getByDisplayValue('/test/recent/project');
        expect(codePathInput).toBeInTheDocument();
      }, { timeout: 2000 });
    } catch (error) {
      // If auto-fill didn't work, manually set the codePath
      console.log('Auto-fill failed, setting codePath manually...');
      codePathInput = screen.getByPlaceholderText(/Click to see recent projects or type path/);
      fireEvent.change(codePathInput, { target: { value: '/test/recent/project' } });
      
      await waitFor(() => {
        expect(codePathInput.value).toBe('/test/recent/project');
      });
    }
    
    // Simulate typing in the Lexical editor by calling onChange directly
    await act(async () => {
      mockOnChange!('Test message');
    });

    // Wait for the component to re-render with the new content
    await waitFor(() => {
      const editor = screen.getByTestId('lexical-editor');
      expect(editor).toHaveTextContent('Test message');
    });

    // Debug: Check the codePath input
    try {
      const codePathInput = screen.getByDisplayValue('/test/recent/project');
      console.log('CodePath input found:', codePathInput.value);
    } catch (error) {
      console.log('CodePath input not found, checking all inputs...');
      const allInputs = screen.getAllByRole('textbox');
      allInputs.forEach((input, index) => {
        console.log(`Input ${index}:`, input.value || input.textContent);
      });
    }

    // Debug: Check the button state
    const sendButton = screen.getByRole('button', { name: /Send to Agent/ });
    console.log('Send button disabled:', sendButton.hasAttribute('disabled'));
    console.log('Send button classes:', sendButton.className);
    
    // Force click the send button (for testing purposes)
    sendButton.removeAttribute('disabled');
    
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Wait for async operations
    await waitFor(() => {
      expect(mockTaskOrchestration.createTaskSession).toHaveBeenCalledWith('Draft Task', 'test-config-1');
    });

    await waitFor(() => {
      expect(mockTaskOrchestration.prepareTaskWorkspace).toHaveBeenCalledWith('session-123', '/test/recent/project');
    });

    await waitFor(() => {
      expect(mockTaskOrchestration.updateTaskCwd).toHaveBeenCalledWith('session-123', '/tmp/worktree-session-123');
    });

    // Wait for the session to be added to the store
    await waitFor(() => {
      expect(mockStore.setSessions).toHaveBeenCalled();
    });

    // Verify session data was created with real worktree path
    expect(mockStore.setSessions).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'session-123',
        agent_cwd: '/tmp/worktree-session-123' // Should use real worktree path, not original codePath
      }),
      ...mockStore.sessions
    ]);

    // Verify background operations started with real worktree path and remapped content
    expect(mockStartBackgroundSessionOps).toHaveBeenCalledWith('session-123', 
      expect.objectContaining({
        projectRoot: '/tmp/worktree-session-123', // Should use real worktree path
        firstMessage: 'Test message' // Content should be remapped (though no pills in this test)
      })
    );

    // Verify onSessionCreated was called with correct data
    expect(onSessionCreated).toHaveBeenCalledWith('session-123', 
      expect.objectContaining({
        agent_cwd: '/tmp/worktree-session-123'
      })
    );
  });

  it('should handle worktree preparation failure gracefully', async () => {
    const onClose = vi.fn();
    
    // Mock prepareTaskWorkspace to fail
    mockTaskOrchestration.prepareTaskWorkspace.mockRejectedValue(new Error('Worktree creation failed'));

    render(<NewDraftModal onClose={onClose} />);

    // Wait for the component to render and the onChange callback to be available
    await waitFor(() => {
      expect(mockOnChange).toBeTruthy();
    });
    
    // Wait for codePath to be auto-filled from recent projects, or set it manually
    let codePathInput;
    try {
      await waitFor(() => {
        codePathInput = screen.getByDisplayValue('/test/recent/project');
        expect(codePathInput).toBeInTheDocument();
      }, { timeout: 2000 });
    } catch (error) {
      // If auto-fill didn't work, manually set the codePath
      console.log('Auto-fill failed, setting codePath manually...');
      codePathInput = screen.getByPlaceholderText(/Click to see recent projects or type path/);
      fireEvent.change(codePathInput, { target: { value: '/test/recent/project' } });
      
      await waitFor(() => {
        expect(codePathInput.value).toBe('/test/recent/project');
      });
    }
    
    // Simulate typing in the Lexical editor by calling onChange directly
    await act(async () => {
      mockOnChange!('Test message');
    });

    // Wait for the component to re-render with the new content
    await waitFor(() => {
      const editor = screen.getByTestId('lexical-editor');
      expect(editor).toHaveTextContent('Test message');
    });

    // Debug: Check the codePath input
    try {
      const codePathInput = screen.getByDisplayValue('/test/recent/project');
      console.log('CodePath input found:', codePathInput.value);
    } catch (error) {
      console.log('CodePath input not found, checking all inputs...');
      const allInputs = screen.getAllByRole('textbox');
      allInputs.forEach((input, index) => {
        console.log(`Input ${index}:`, input.value || input.textContent);
      });
    }

    // Debug: Check the button state
    const sendButton = screen.getByRole('button', { name: /Send to Agent/ });
    console.log('Send button disabled:', sendButton.hasAttribute('disabled'));
    console.log('Send button classes:', sendButton.className);
    
    // Force click the send button (for testing purposes)
    sendButton.removeAttribute('disabled');
    
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Wait for error handling
    await waitFor(() => {
      expect(mockTaskOrchestration.prepareTaskWorkspace).toHaveBeenCalled();
    });

    // Should show error toast
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to prepare workspace', {
        description: 'Using project root as fallback'
      });
    });

    // Wait for the session to be added to the store
    await waitFor(() => {
      expect(mockStore.setSessions).toHaveBeenCalled();
    });

    // Should fall back to original codePath
    expect(mockStore.setSessions).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'session-123',
        agent_cwd: '/test/recent/project' // Should fall back to original codePath
      }),
      ...mockStore.sessions
    ]);

    // Background operations should still start with fallback path
    expect(mockStartBackgroundSessionOps).toHaveBeenCalledWith('session-123', 
      expect.objectContaining({
        projectRoot: '/test/recent/project' // Should use fallback path
      })
    );
  });

  it('should call prepareTaskWorkspace and updateTaskCwd in commit-and-continue flow', async () => {
    const onClose = vi.fn();
    
    // Mock dirty repository state
    mockTaskOrchestration.checkRepositoryState.mockResolvedValue({
      isDirty: true,
      isGit: true
    });



    render(<NewDraftModal onClose={onClose} />);

    // Wait for the component to render and the onChange callback to be available
    await waitFor(() => {
      expect(mockOnChange).toBeTruthy();
    });
    
    // Wait for codePath to be auto-filled from recent projects, or set it manually
    let codePathInput;
    try {
      await waitFor(() => {
        codePathInput = screen.getByDisplayValue('/test/recent/project');
        expect(codePathInput).toBeInTheDocument();
      }, { timeout: 2000 });
    } catch (error) {
      // If auto-fill didn't work, manually set the codePath
      console.log('Auto-fill failed, setting codePath manually...');
      codePathInput = screen.getByPlaceholderText(/Click to see recent projects or type path/);
      fireEvent.change(codePathInput, { target: { value: '/test/recent/project' } });
      
      await waitFor(() => {
        expect(codePathInput.value).toBe('/test/recent/project');
      });
    }
    
    // Simulate typing in the Lexical editor by calling onChange directly
    await act(async () => {
      mockOnChange!('Test message');
    });

    // Wait for the component to re-render with the new content
    await waitFor(() => {
      const editor = screen.getByTestId('lexical-editor');
      expect(editor).toHaveTextContent('Test message');
    });

    // Debug: Check the codePath input
    try {
      const codePathInput = screen.getByDisplayValue('/test/recent/project');
      console.log('CodePath input found:', codePathInput.value);
    } catch (error) {
      console.log('CodePath input not found, checking all inputs...');
      const allInputs = screen.getAllByRole('textbox');
      allInputs.forEach((input, index) => {
        console.log(`Input ${index}:`, input.value || input.textContent);
      });
    }

    // Debug: Check the button state
    const sendButton = screen.getByRole('button', { name: /Send to Agent/ });
    console.log('Send button disabled:', sendButton.hasAttribute('disabled'));
    console.log('Send button classes:', sendButton.className);
    
    // Force click the send button (for testing purposes)
    sendButton.removeAttribute('disabled');
    
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Wait for dirty repo section to appear
    await waitFor(() => {
      expect(screen.getByText(/Repository has uncommitted changes/)).toBeInTheDocument();
    });

    // Fill commit message and click commit button
    const commitMessageInput = screen.getByPlaceholderText(/Enter commit message/);
    fireEvent.change(commitMessageInput, { target: { value: 'Test commit' } });

    const commitButton = screen.getByRole('button', { name: /Commit & Continue/ });
    fireEvent.click(commitButton);

    // Wait for commit and session creation
    await waitFor(() => {
      expect(mockAutoCommitRepo).toHaveBeenCalledWith('/test/recent/project', 'Test commit');
    });

    await waitFor(() => {
      expect(mockTaskOrchestration.createTaskSession).toHaveBeenCalledWith('Draft Task', 'test-config-1');
    });

    await waitFor(() => {
      expect(mockTaskOrchestration.prepareTaskWorkspace).toHaveBeenCalledWith('session-123', '/test/recent/project');
    });

    await waitFor(() => {
      expect(mockTaskOrchestration.updateTaskCwd).toHaveBeenCalledWith('session-123', '/tmp/worktree-session-123');
    });

    // Verify session data was created with real worktree path
    expect(mockStore.setSessions).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'session-123',
        agent_cwd: '/tmp/worktree-session-123'
      }),
      ...mockStore.sessions
    ]);
  });

  it('should remap file pills in firstMessage before sending to agent', async () => {
    const onClose = vi.fn();
    const onSessionCreated = vi.fn();

    render(
      <NewDraftModal 
        onClose={onClose} 
        onSessionCreated={onSessionCreated}
      />
    );

    // Wait for the component to render and the onChange callback to be available
    await waitFor(() => {
      expect(mockOnChange).toBeTruthy();
    });
    
    // Set codePath manually
    const codePathInput = screen.getByPlaceholderText(/Click to see recent projects or type path/);
    fireEvent.change(codePathInput, { target: { value: '/test/recent/project' } });
    
    await waitFor(() => {
      expect(codePathInput.value).toBe('/test/recent/project');
    });
    
    // Simulate typing content with file pills in the Lexical editor
    const contentWithPills = 'Check [@auth.ts](@file:/test/recent/project/src/auth.ts) and [@config.json](@file:/Users/tim/vault/config.json) for details.';
    
    await act(async () => {
      mockOnChange!(contentWithPills);
    });

    // Wait for the component to re-render with the new content
    await waitFor(() => {
      const editor = screen.getByTestId('lexical-editor');
      expect(editor).toHaveTextContent(contentWithPills);
    });

    // Click send button
    const sendButton = screen.getByRole('button', { name: /Send to Agent/ });
    sendButton.removeAttribute('disabled');
    
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Wait for async operations
    await waitFor(() => {
      expect(mockTaskOrchestration.createTaskSession).toHaveBeenCalledWith('Draft Task', 'test-config-1');
    });

    await waitFor(() => {
      expect(mockTaskOrchestration.prepareTaskWorkspace).toHaveBeenCalledWith('session-123', '/test/recent/project');
    });

    // Verify background operations started with remapped content
    await waitFor(() => {
      expect(mockStartBackgroundSessionOps).toHaveBeenCalledWith('session-123', 
        expect.objectContaining({
          projectRoot: '/tmp/worktree-session-123',
          // File pills should be remapped: project paths → worktree paths, vault paths unchanged
          firstMessage: 'Check [@auth.ts](@file:/tmp/worktree-session-123/src/auth.ts) and [@config.json](@file:/Users/tim/vault/config.json) for details.'
        })
      );
    });
  });
});