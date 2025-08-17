import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuth } from '@/auth/AuthContext';
import { getDefaultACSClient } from '@/services/acs';
import { sendChatMessage } from '@/utils/sendChatMessage';
import { sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';
import { useSelections } from '@/context/SelectionContext';
import { MemoryRouter } from 'react-router-dom';

import { LandingPageInfinite } from '../LandingPageInfinite';

// Mock all the dependencies
vi.mock('@/hooks/useAgentConfigs');
vi.mock('@/stores/settingsStore');
vi.mock('@/auth/AuthContext');
vi.mock('@/services/acs');
vi.mock('@/utils/sendChatMessage');
vi.mock('@/stores/sessionPermissionsStore');
vi.mock('@/context/SelectionContext');

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

// Mock react-router-dom
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: vi.fn()
}));

const mockUseAgentConfigs = useAgentConfigs as any;
const mockUseSettingsStore = useSettingsStore as any;
const mockUseAuth = useAuth as any;
const mockGetDefaultACSClient = getDefaultACSClient as any;
const mockSendChatMessage = sendChatMessage as any;
const mockSessionPermissionsUtils = sessionPermissionsUtils as any;
const mockUseSelections = useSelections as any;

describe('LandingPageInfinite - No CWD Error Handling', () => {
  const mockNavigate = vi.fn();
  const mockAgentConfigs = {
    'agent-1': {
      id: 'agent-1',
      agent: {
        name: 'Test Agent',
        description: 'A test agent',
        avatar: null,
        metadata: { skills: ['coding'] }
      },
      ai_config: {
        model_id: 'gpt-4'
      }
    }
  };

  const mockAgentConfigsArray = [mockAgentConfigs['agent-1']];

  beforeEach(async () => {
    // Mock window.alert
    vi.stubGlobal('alert', vi.fn());
    
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mocks
    mockUseAgentConfigs.mockReturnValue({
      agentConfigs: mockAgentConfigs,
      agentConfigsArray: mockAgentConfigsArray,
      isLoading: false,
      error: null
    });

    // Create a mock store instance that properly handles all method calls
    const mockStoreInstance = {
      settings: {
        vault: {
          path: '' // Empty vault path - this is the key test condition
        },
        defaultAgentId: 'agent-1'
      },
      setState: vi.fn(),
      getState: () => ({
        settings: {
          vault: { path: '' },
          defaultAgentId: 'agent-1'
        }
      })
    };
    
    mockUseSettingsStore.mockReturnValue(mockStoreInstance);
    
    // Also mock the global getState method that's called directly
    vi.spyOn(useSettingsStore, 'getState').mockImplementation(() => ({
      settings: {
        vault: { path: '' },
        defaultAgentId: 'agent-1'
      }
    }));

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-123' },
      setShowModal: vi.fn()
    } as any);

    // Mock ACS client
    const mockACSClient = {
      sessions: {
        createSession: vi.fn().mockResolvedValue({
          data: {
            data: {
              id: 'session-123'
            }
          }
        })
      }
    };
    mockGetDefaultACSClient.mockReturnValue(mockACSClient);

    // Mock session permissions utils
    mockSessionPermissionsUtils.getOrCreateSessionPermissions = vi.fn().mockResolvedValue(undefined);

    // Mock sendChatMessage as fire-and-forget
    mockSendChatMessage.mockResolvedValue(undefined);

    // Mock selections
    mockUseSelections.mockReturnValue({
      selectedModelId: null,
      setSelectedModelId: vi.fn()
    });

    // Mock navigate
    const { useNavigate } = await import('react-router-dom');
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should show alert and not create session when no CWD is available', async () => {
    // Render component without projectContext (no project path)
    render(
      <MemoryRouter>
        <LandingPageInfinite />
      </MemoryRouter>
    );

    // Wait for component to load and find the input
    await waitFor(() => {
      expect(screen.getByTestId('lexical-editor')).toBeInTheDocument();
    });

    // Find and fill the editor
    const editor = screen.getByTestId('lexical-editor');
    fireEvent.change(editor, { target: { value: 'Hello test message' } });

    // Find and click the send button
    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    // Verify alert was called with the expected error message
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'No working directory (vault path) configured – cannot start chat'
      );
    });

    // Verify that createSession was NOT called
    const mockACSClient = mockGetDefaultACSClient();
    expect(mockACSClient.sessions.createSession).not.toHaveBeenCalled();

    // Verify that sendChatMessage was NOT called
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it('should create session when vault path is available', async () => {
    // Update settings store to have a vault path
    const mockStoreInstanceWithVault = {
      settings: {
        vault: {
          path: '/Users/test/vault' // Valid vault path
        },
        defaultAgentId: 'agent-1'
      },
      setState: vi.fn(),
      getState: () => ({
        settings: {
          vault: { path: '/Users/test/vault' },
          defaultAgentId: 'agent-1'
        }
      })
    };
    
    mockUseSettingsStore.mockReturnValue(mockStoreInstanceWithVault);
    
    // Also update the global getState method
    vi.spyOn(useSettingsStore, 'getState').mockImplementation(() => ({
      settings: {
        vault: { path: '/Users/test/vault' },
        defaultAgentId: 'agent-1'
      }
    }));

    // Render component
    render(
      <MemoryRouter>
        <LandingPageInfinite />
      </MemoryRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('lexical-editor')).toBeInTheDocument();
    });

    // Find and fill the editor
    const editor = screen.getByTestId('lexical-editor');
    fireEvent.change(editor, { target: { value: 'Hello test message' } });

    // Find and click the send button
    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    // Verify alert was NOT called
    expect(global.alert).not.toHaveBeenCalled();

    // Verify that createSession WAS called with agent_cwd and base_dir
    const mockACSClient = mockGetDefaultACSClient();
    await waitFor(() => {
      expect(mockACSClient.sessions.createSession).toHaveBeenCalledWith({
        name: 'Chat with Test Agent',
        agent_config_id: 'agent-1',
        agent_cwd: '/Users/test/vault',
        base_dir: '/Users/test/vault'
      });
    });

    // Verify that sendChatMessage WAS called with the correct agent_cwd_override and base_dir_override
    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          message: 'Hello test message',
          userId: 'user-123',
          agentConfigName: 'agent-1',
          acsClient: mockACSClient,
          acsOverrides: {
            agent_cwd_override: '/Users/test/vault',
            base_dir_override: '/Users/test/vault'
          },
          overrides: {},
          tools: ['cat', 'tree', 'search_files', 'str_replace_editor', 'read_files']
        })
      );
    });
  });

  it('should create session when projectContext path is available', async () => {
    // Render component with projectContext (project mode)
    const projectContext = {
      name: 'Test Project',
      path: '/Users/test/project'
    };
    render(
      <MemoryRouter>
        <LandingPageInfinite projectContext={projectContext} />
      </MemoryRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('lexical-editor')).toBeInTheDocument();
    });

    // Find and fill the editor
    const editor = screen.getByTestId('lexical-editor');
    fireEvent.change(editor, { target: { value: 'Hello test message' } });

    // Find and click the send button
    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    // Verify alert was NOT called
    expect(global.alert).not.toHaveBeenCalled();

    // Verify that createSession WAS called with project path as agent_cwd and base_dir
    const mockACSClient = mockGetDefaultACSClient();
    await waitFor(() => {
      expect(mockACSClient.sessions.createSession).toHaveBeenCalledWith({
        name: 'Chat with Test Agent',
        agent_config_id: 'agent-1',
        agent_cwd: '/Users/test/project',
        base_dir: '/Users/test/project'
      });
    });

    // Verify that sendChatMessage WAS called with the project path as agent_cwd_override and base_dir_override
    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          message: 'Hello test message',
          userId: 'user-123',
          agentConfigName: 'agent-1',
          acsClient: mockACSClient,
          acsOverrides: {
            agent_cwd_override: '/Users/test/project',
            base_dir_override: '/Users/test/project'
          },
          overrides: {},
          tools: ['cat', 'tree', 'search_files', 'str_replace_editor', 'read_files']
        })
      );
    });
  });
});