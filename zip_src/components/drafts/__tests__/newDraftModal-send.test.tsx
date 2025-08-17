/**
 * Integration test for NewDraftModal send functionality
 * 
 * Tests that NewDraftModal correctly:
 * 1. Calls startNewChatForDraft when send button is clicked
 * 2. Passes correct parameters including draft content and user info
 * 3. Handles success and error cases properly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewDraftModal } from '../NewDraftModal';
import { startNewChatForDraft } from '@/lib/chat/newChatHelper';
import { useAuth } from '@/auth/AuthContext';
import { getDefaultACSClient } from '@/services/acs';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useSelections } from '@/context/SelectionContext';
import { useSettingsStore } from '@/stores/settingsStore';

// Mock dependencies
vi.mock('@/lib/chat/newChatHelper');
vi.mock('@/auth/AuthContext');
vi.mock('@/services/acs');
vi.mock('@/hooks/useAgentConfigs');
vi.mock('@/context/SelectionContext');
vi.mock('@/stores/settingsStore');
vi.mock('@/hooks/useFileSearch');
vi.mock('@/hooks/useMissionControlShortcuts');
vi.mock('@/utils/projectStorage');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockStartNewChatForDraft = vi.mocked(startNewChatForDraft);
const mockUseAuth = vi.mocked(useAuth);
const mockGetDefaultACSClient = vi.mocked(getDefaultACSClient);
const mockUseAgentConfigs = vi.mocked(useAgentConfigs);
const mockUseSelections = vi.mocked(useSelections);
const mockUseSettingsStore = vi.mocked(useSettingsStore);

describe('NewDraftModal Send Integration', () => {
  const mockAcsClient = {
    core: {
      sendMessage: vi.fn()
    }
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockAgentConfigs = [
    {
      id: 'general-config',
      agent: {
        name: 'General Assistant'
      }
    },
    {
      id: 'code-config', 
      agent: {
        name: 'Code Assistant'
      }
    }
  ];

  const mockSelections = {
    selectedModelId: 'gpt-4o-mini'
  };

  const mockSettings = {
    vault: {
      path: '/default/vault/path'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseAuth.mockReturnValue({
      user: mockUser,
      booted: true
    } as any);

    mockGetDefaultACSClient.mockReturnValue(mockAcsClient as any);

    mockUseAgentConfigs.mockReturnValue({
      agentConfigsArray: mockAgentConfigs
    } as any);

    mockUseSelections.mockReturnValue(mockSelections as any);

    mockUseSettingsStore.mockReturnValue({
      settings: mockSettings
    } as any);

    // Mock file search hook
    vi.doMock('@/hooks/useFileSearch', () => ({
      useFileSearch: () => ({
        results: [],
        isLoading: false
      })
    }));

    // Mock shortcuts hook
    vi.doMock('@/hooks/useMissionControlShortcuts', () => ({
      useMissionControlShortcuts: () => ({
        getShortcutHint: (key: string) => key === 'save' ? '⌘S' : '⌘Enter'
      })
    }));

    // Mock project storage
    vi.doMock('@/utils/projectStorage', () => ({
      recentProjectsManager: {
        get: () => [{ path: '/recent/project/path' }]
      }
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call startNewChatForDraft when send button is clicked (fallback mode)', async () => {
    const mockOnClose = vi.fn();
    const mockOnSessionCreated = vi.fn();

    // Mock successful helper response
    const mockHelperResult = {
      sessionId: 'session-456',
      workspacePath: '/tmp/worktree-session-456',
      userMessageId: 'msg-789'
    };
    mockStartNewChatForDraft.mockResolvedValue(mockHelperResult);

    render(
      <NewDraftModal 
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
        // No onSend prop - should use fallback mode
      />
    );

    // Fill in the form
    const contentTextarea = screen.getByPlaceholderText(/Describe the bug, feature request/);
    const codePathInput = screen.getByDisplayValue('/recent/project/path');
    
    fireEvent.change(contentTextarea, { 
      target: { value: 'Fix the authentication bug in the login module' } 
    });
    fireEvent.change(codePathInput, { 
      target: { value: '/project/auth/path' } 
    });

    // Click send button
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Wait for async operations
    await waitFor(() => {
      expect(mockStartNewChatForDraft).toHaveBeenCalledWith({
        draftText: 'Fix the authentication bug in the login module',
        userId: 'user-123',
        agentConfigName: 'General Assistant',
        acsClient: mockAcsClient,
        agentConfigId: 'general-config',
        sessionName: 'Draft Task',
        agentCwd: '/project/auth/path'
      });
    });

    // Verify onSessionCreated was called with correct data
    expect(mockOnSessionCreated).toHaveBeenCalledWith('session-456', {
      id: 'session-456',
      mission_title: 'Draft Task',
      status: 'active',
      agent_config_name: 'General Assistant',
      agent_cwd: '/tmp/worktree-session-456',
      created_at: expect.any(String),
      last_message_at: expect.any(String),
      model_id: 'gpt-4o-mini',
      latest_message_id: 'msg-789',
      latest_message_role: 'user',
      latest_message_content: 'Fix the authentication bug in the login module',
      latest_message_timestamp: expect.any(String),
      archived_at: null
    });

    // Verify modal was closed
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should use onSend prop when provided instead of fallback', async () => {
    const mockOnClose = vi.fn();
    const mockOnSend = vi.fn().mockResolvedValue(undefined);

    render(
      <NewDraftModal 
        onClose={mockOnClose}
        onSend={mockOnSend}
      />
    );

    // Fill in the form
    const contentTextarea = screen.getByPlaceholderText(/Describe the bug, feature request/);
    const codePathInput = screen.getByDisplayValue('/recent/project/path');
    
    fireEvent.change(contentTextarea, { 
      target: { value: 'Implement new feature X' } 
    });
    fireEvent.change(codePathInput, { 
      target: { value: '/project/feature/path' } 
    });

    // Click send button
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Wait for async operations
    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith({
        content: 'Implement new feature X',
        codePath: '/project/feature/path',
        agentConfigId: 'general-config',
        modelId: 'gpt-4o-mini',
        id: expect.stringMatching(/^temp-\d+$/)
      });
    });

    // Verify startNewChatForDraft was NOT called
    expect(mockStartNewChatForDraft).not.toHaveBeenCalled();

    // Verify modal was closed
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle authentication error in fallback mode', async () => {
    const mockOnClose = vi.fn();

    // Mock unauthenticated user
    mockUseAuth.mockReturnValue({
      user: null,
      booted: true
    } as any);

    render(
      <NewDraftModal 
        onClose={mockOnClose}
      />
    );

    // Fill in the form
    const contentTextarea = screen.getByPlaceholderText(/Describe the bug, feature request/);
    const codePathInput = screen.getByDisplayValue('/recent/project/path');
    
    fireEvent.change(contentTextarea, { 
      target: { value: 'Test message' } 
    });
    fireEvent.change(codePathInput, { 
      target: { value: '/test/path' } 
    });

    // Click send button
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockStartNewChatForDraft).not.toHaveBeenCalled();
    });

    // Verify modal was not closed (user needs to sign in)
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should handle startNewChatForDraft failure', async () => {
    const mockOnClose = vi.fn();
    const mockOnSessionCreated = vi.fn();

    // Mock helper failure
    const mockError = new Error('Failed to create worktree');
    mockStartNewChatForDraft.mockRejectedValue(mockError);

    render(
      <NewDraftModal 
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Fill in the form
    const contentTextarea = screen.getByPlaceholderText(/Describe the bug, feature request/);
    const codePathInput = screen.getByDisplayValue('/recent/project/path');
    
    fireEvent.change(contentTextarea, { 
      target: { value: 'Test message' } 
    });
    fireEvent.change(codePathInput, { 
      target: { value: '/test/path' } 
    });

    // Click send button
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockStartNewChatForDraft).toHaveBeenCalled();
    });

    // Verify onSessionCreated was not called
    expect(mockOnSessionCreated).not.toHaveBeenCalled();

    // Verify modal was not closed due to error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should use correct agent config when different one is selected', async () => {
    const mockOnClose = vi.fn();

    // Mock successful helper response
    const mockHelperResult = {
      sessionId: 'session-456',
      workspacePath: '/tmp/worktree-session-456',
      userMessageId: 'msg-789'
    };
    mockStartNewChatForDraft.mockResolvedValue(mockHelperResult);

    render(
      <NewDraftModal 
        onClose={mockOnClose}
      />
    );

    // Fill in the form
    const contentTextarea = screen.getByPlaceholderText(/Describe the bug, feature request/);
    fireEvent.change(contentTextarea, { 
      target: { value: 'Code review task' } 
    });

    // Open advanced options to access agent selection
    const advancedButton = screen.getByText('Advanced Options');
    fireEvent.click(advancedButton);

    // Select different agent config
    const agentSelect = screen.getByDisplayValue('General Assistant');
    fireEvent.change(agentSelect, { target: { value: 'code-config' } });

    // Click send button
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Wait for async operations
    await waitFor(() => {
      expect(mockStartNewChatForDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          agentConfigName: 'Code Assistant',
          agentConfigId: 'code-config'
        })
      );
    });
  });

  it('should disable send button when form is incomplete', () => {
    const mockOnClose = vi.fn();

    render(
      <NewDraftModal 
        onClose={mockOnClose}
      />
    );

    const sendButton = screen.getByText('Send to Agent');
    
    // Initially should be enabled (has default codePath)
    expect(sendButton).not.toBeDisabled();

    // Clear the codePath
    const codePathInput = screen.getByDisplayValue('/recent/project/path');
    fireEvent.change(codePathInput, { target: { value: '' } });

    // Now should be disabled
    expect(sendButton).toBeDisabled();

    // Add content but no codePath - still disabled
    const contentTextarea = screen.getByPlaceholderText(/Describe the bug, feature request/);
    fireEvent.change(contentTextarea, { target: { value: 'Test message' } });
    expect(sendButton).toBeDisabled();

    // Add codePath back - should be enabled
    fireEvent.change(codePathInput, { target: { value: '/test/path' } });
    expect(sendButton).not.toBeDisabled();
  });
});