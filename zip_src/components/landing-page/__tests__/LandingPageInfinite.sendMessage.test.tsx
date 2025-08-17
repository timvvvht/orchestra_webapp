import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LandingPageInfinite } from '../LandingPageInfinite';
import { useAuth } from '@/auth/AuthContext';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSelections } from '@/context/SelectionContext';
import { getDefaultACSClient } from '@/services/acs';
import { sendChatMessage } from '@/utils/sendChatMessage';
import { MemoryRouter, useNavigate } from 'react-router-dom';

// Mock all the hooks and dependencies
vi.mock('@/auth/AuthContext');
vi.mock('@/hooks/useAgentConfigs');
vi.mock('@/stores/settingsStore');
vi.mock('@/context/SelectionContext');
vi.mock('@/services/acs');
vi.mock('@/utils/sendChatMessage');

// Mock LexicalPillEditor to make testing easier
vi.mock('@/components/drafts/LexicalPillEditor', () => ({
  LexicalPillEditor: ({ value, onChange, placeholder, autoFocus }: any) => (
    <textarea
      data-testid="lexical-editor"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full h-32 bg-transparent text-white border border-white/20 rounded p-2"
    />
  ),
}));
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: vi.fn()
}));

describe('LandingPageInfinite - Fire-and-Forget Message Sending', () => {
  const mockNavigate = vi.fn();
  const mockAuth = {
    isAuthenticated: true,
    user: { id: 'user123' },
    setShowModal: vi.fn()
  };
  const mockAgentConfigs = {
    agentConfigs: {
      'agent1': {
        id: 'agent1',
        agent: { name: 'Test Agent' },
        ai_config: { model_id: 'gpt-4' }
      }
    },
    agentConfigsArray: [
      {
        id: 'agent1',
        agent: { name: 'Test Agent' },
        ai_config: { model_id: 'gpt-4' }
      }
    ]
  };
  const mockSettingsState = { 
  settings: { 
    vault: { path: '/workspace' },
    theme: { colorScheme: 'dark' },
    keyboard: { shortcuts: {} },
    notifications: { enabled: {} },
    ui: { mode: 'novice' },
    defaultAgentId: 'agent1',
    version: 1
  },
  isLoading: false,
  error: null
};
  const mockSelections = {
    selectedModelId: null,
    setSelectedModelId: vi.fn()
  };
  const mockAcsClient = {
    sessions: {
      createSession: vi.fn()
    }
  };

  beforeEach(() => {
    // Mock window.alert
    vi.stubGlobal('alert', vi.fn());
    
    vi.clearAllMocks();
    
    // Setup mocks
    (useAuth as any).mockReturnValue(mockAuth);
    (useAgentConfigs as any).mockReturnValue(mockAgentConfigs);
    (useSettingsStore as any).mockReturnValue(mockSettingsState);
    (useSelections as any).mockReturnValue(mockSelections);
    
    // Mock the getState method on the store
    (useSettingsStore as any).getState = vi.fn().mockReturnValue(mockSettingsState);
    (getDefaultACSClient as any).mockReturnValue(mockAcsClient);
    (useNavigate as any).mockReturnValue(mockNavigate);
    
    // Mock successful session creation
    mockAcsClient.sessions.createSession.mockResolvedValue({
      data: { data: { id: 'sessionABC' } }
    });
    
    // Mock successful message sending
    (sendChatMessage as any).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create session and send message via fire-and-forget', async () => {
    render(
      <MemoryRouter>
        <LandingPageInfinite />
      </MemoryRouter>
    );

    // Find the Lexical editor (now mocked as textarea)
    const editor = screen.getByTestId('lexical-editor');
    
    // Simulate typing by changing the textarea value
    fireEvent.change(editor, { target: { value: 'Hello, test message' } });

    // Click send button
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Verify session creation was called
    await waitFor(() => {
      expect(mockAcsClient.sessions.createSession).toHaveBeenCalledWith({
        name: 'Chat with Test Agent',
        agent_config_id: 'agent1',
        agent_cwd: '/workspace',
        base_dir: '/workspace'
      });
    });

    // Verify fire-and-forget message sending was called
    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith({
        sessionId: 'sessionABC',
        message: 'Hello, test message',
        userId: 'user123',
        agentConfigName: 'agent1',
        acsClient: mockAcsClient,
        acsOverrides: { agent_cwd_override: '/workspace', base_dir_override: '/workspace' },
        overrides: {},
        tools: ['cat', 'tree', 'search_files', 'str_replace_editor', 'read_files']
      });
    });

    // Verify navigation was called without initialMessage in query params
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/chat/sessionABC?agentConfigId=agent1&sessionName=Chat+with+Test+Agent&projectPath=%252Fworkspace'
      );
    });

    // Verify that initialMessage is NOT in the URL
    const navigateCall = mockNavigate.mock.calls[0][0];
    expect(navigateCall).not.toContain('initialMessage=');
  });

  it('should handle message sending errors gracefully', async () => {
    // Mock message sending failure
    (sendChatMessage as any).mockRejectedValue(new Error('Network error'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <LandingPageInfinite />
      </MemoryRouter>
    );

    // Type a message and send
    const editor = screen.getByTestId('lexical-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Verify session creation still happens
    await waitFor(() => {
      expect(mockAcsClient.sessions.createSession).toHaveBeenCalled();
    });

    // Verify error is logged but navigation still happens
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[LandingPage] Fire-and-forget initial message failed:',
        expect.any(Error)
      );
      expect(mockNavigate).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should include model override in message sending when selected', async () => {
    // Setup model selection
    mockSelections.selectedModelId = 'claude-3-5-sonnet-20241022';
    (useSelections as any).mockReturnValue(mockSelections);

    render(
      <MemoryRouter>
        <LandingPageInfinite />
      </MemoryRouter>
    );

    // Type a message and send
    const editor = screen.getByTestId('lexical-editor');
    fireEvent.change(editor, { target: { value: 'Test with model override' } });
    
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Verify model override is included in sendChatMessage call
    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith({
        sessionId: 'sessionABC',
        message: 'Test with model override',
        userId: 'user123',
        agentConfigName: 'agent1',
        acsClient: mockAcsClient,
        acsOverrides: { agent_cwd_override: '/workspace', base_dir_override: '/workspace' },
        overrides: { model_id: 'claude-3-5-sonnet-20241022' },
        tools: ['cat', 'tree', 'search_files', 'str_replace_editor', 'read_files']
      });
    });

    // Verify model override is included in navigation URL
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('modelId=claude-3-5-sonnet-20241022')
      );
    });
  });

  it('should not send message if user is not authenticated', async () => {
    // Setup unauthenticated user
    const unauthenticatedAuth = {
      isAuthenticated: false,
      user: null,
      setShowModal: vi.fn()
    };
    (useAuth as any).mockReturnValue(unauthenticatedAuth);

    render(
      <MemoryRouter>
        <LandingPageInfinite />
      </MemoryRouter>
    );

    // Type a message and send
    const editor = screen.getByTestId('lexical-editor');
    fireEvent.change(editor, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Verify session creation is NOT called
    await waitFor(() => {
      expect(mockAcsClient.sessions.createSession).not.toHaveBeenCalled();
    });

    // Verify message sending is NOT called
    await waitFor(() => {
      expect(sendChatMessage).not.toHaveBeenCalled();
    });

    // Verify auth modal is shown
    expect(unauthenticatedAuth.setShowModal).toHaveBeenCalledWith(true);
  });
});