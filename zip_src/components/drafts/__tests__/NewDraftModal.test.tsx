/**
 * NewDraftModal.test.tsx - Unit tests for NewDraftModal
 * 
 * Tests the critical functionality of ensuring agent_cwd_override is always passed
 * when sending messages from the Mission Control draft modal.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewDraftModal } from '../NewDraftModal';

// Mock dependencies
vi.mock('@/utils/sendChatMessage', () => ({
  sendChatMessage: vi.fn()
}));

const mockStartSession = vi.fn().mockResolvedValue('test-session-id');
vi.mock('@/utils/startSession', () => ({
  useStartSession: () => mockStartSession
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    isAuthenticated: true
  })
}));

vi.mock('@/services/acs', () => ({
  getDefaultACSClient: () => ({
    core: {
      sendMessage: vi.fn()
    }
  })
}));

vi.mock('@/utils/registerSessionTools', () => ({
  registerApplyPatchTool: vi.fn()
}));

// Mock other dependencies
vi.mock('@/hooks/useAgentConfigs', () => ({
  useAgentConfigs: () => ({
    agentConfigsArray: [{ id: 'general', name: 'General Agent' }]
  })
}));

vi.mock('@/context/SelectionContext', () => ({
  useSelections: () => ({
    selectedModelId: null
  })
}));

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: {
      vault: { path: '/default/path' }
    }
  })
}));

vi.mock('@/stores/draftStore', () => ({
  useDraftStore: {
    getState: () => ({
      addDraft: vi.fn()
    })
  }
}));

vi.mock('@/utils/projectStorage', () => ({
  recentProjectsManager: {
    get: () => [{ path: '/recent/project/path' }]
  }
}));

vi.mock('@/stores/sessionPermissionsStore', () => ({
  sessionPermissionsUtils: {},
  useSessionPermissionsStore: () => ({})
}));

vi.mock('@/utils/environment', () => ({
  isTauri: () => false
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock ReactDOM.createPortal for modal rendering
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: any) => children
  };
});

describe('NewDraftModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSessionCreated = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass agent_cwd_override when sending message', async () => {
    const { sendChatMessage } = await import('@/utils/sendChatMessage');
    
    render(
      <NewDraftModal 
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Fill in the form
    const messageInput = screen.getByPlaceholderText(/Describe the bug, feature request/i);
    const codePathInput = screen.getByDisplayValue('/recent/project/path');
    
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.change(codePathInput, { target: { value: '/test/code/path' } });

    // Click send button
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Wait for async operations
    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith(
        expect.objectContaining({
          codePath: '/test/code/path',
          createWorktree: true
        })
      );
    });

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-id',
          message: 'Test message',
          acsOverrides: {
            agent_cwd_override: '/test/code/path' // 🎯 CRITICAL: This is what we're testing
          }
        })
      );
    });
  });

  it('should trim whitespace from codePath when passing agent_cwd_override', async () => {
    const { sendChatMessage } = await import('@/utils/sendChatMessage');
    
    render(
      <NewDraftModal 
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Fill in the form with whitespace
    const messageInput = screen.getByPlaceholderText(/Describe the bug, feature request/i);
    const codePathInput = screen.getByDisplayValue('/recent/project/path');
    
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.change(codePathInput, { target: { value: '  /test/code/path  ' } });

    // Click send button
    const sendButton = screen.getByText('Send to Agent');
    fireEvent.click(sendButton);

    // Wait for async operations
    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          acsOverrides: {
            agent_cwd_override: '/test/code/path' // Should be trimmed
          }
        })
      );
    });
  });

  it('should not send message if codePath is empty', async () => {
    const { sendChatMessage } = await import('@/utils/sendChatMessage');
    
    render(
      <NewDraftModal 
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Fill in only the message, leave codePath empty
    const messageInput = screen.getByPlaceholderText(/Describe the bug, feature request/i);
    const codePathInput = screen.getByDisplayValue('/recent/project/path');
    
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.change(codePathInput, { target: { value: '' } });

    // Send button should be disabled
    const sendButton = screen.getByText('Send to Agent');
    expect(sendButton).toBeDisabled();

    // sendChatMessage should not be called
    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});