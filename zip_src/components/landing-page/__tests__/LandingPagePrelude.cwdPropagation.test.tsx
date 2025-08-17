import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LandingPagePrelude } from '../LandingPagePrelude';
import { LandingPageInfinite } from '../LandingPageInfinite';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuth } from '@/auth/AuthContext';
import { getDefaultACSClient } from '@/services/acs';
import { sendChatMessage } from '@/utils/sendChatMessage';
import { sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';
import { useSelections } from '@/context/SelectionContext';
import { MemoryRouter } from 'react-router-dom';

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

describe('LandingPagePrelude - CWD Propagation', () => {
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

    mockUseSettingsStore.mockReturnValue({
      settings: {
        vault: {
          path: '/Users/test/vault'
        },
        defaultAgentId: 'agent-1'
      },
      setState: vi.fn(),
      getState: vi.fn(() => ({
        settings: {
          vault: { path: '/Users/test/vault' },
          defaultAgentId: 'agent-1'
        }
      }))
    } as any);

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

  it('should propagate selected folder path to LandingPageInfinite and use it as agent_cwd', async () => {
    // Create a wrapper component that simulates the orchestrator behavior
    let capturedProjectContext: any = null;
    
    const TestWrapper = () => {
      const [projectContext, setProjectContext] = React.useState<any>(null);
      
      const handleModeSelect = (mode: 'chat' | 'project', projectPath?: string) => {
        if (mode === 'project' && projectPath) {
          const newProjectContext = {
            name: projectPath.split('/').pop() || 'Project',
            path: projectPath
          };
          setProjectContext(newProjectContext);
          capturedProjectContext = newProjectContext;
        }
      };

      return projectContext ? (
        <LandingPageInfinite projectContext={projectContext} />
      ) : (
        <LandingPagePrelude 
          onModeSelect={handleModeSelect}
          recentProjects={[]}
        />
      );
    };

    // Render the test wrapper
    render(
      <MemoryRouter>
        <TestWrapper />
      </MemoryRouter>
    );

    // Initially, we should see the LandingPagePrelude
    await waitFor(() => {
      expect(screen.getByText('Welcome to Orchestra')).toBeInTheDocument();
    });

    // Since we can't actually open the Tauri dialog in tests, we'll simulate the callback
    // that would happen after a folder is selected
    const onModeSelect = (mode: 'chat' | 'project', projectPath?: string) => {
      if (mode === 'project' && projectPath) {
        const newProjectContext = {
          name: projectPath.split('/').pop() || 'Project',
          path: projectPath
        };
        capturedProjectContext = newProjectContext;
        
        // Re-render with the project context
        render(
          <MemoryRouter>
            <LandingPageInfinite projectContext={newProjectContext} />
          </MemoryRouter>
        );
      }
    };

    // Simulate folder selection
    onModeSelect('project', '/my/test/project');

    // Now we should see the LandingPageInfinite with the project context
    await waitFor(() => {
      expect(screen.getByTestId('lexical-editor')).toBeInTheDocument();
    });

    // Verify the project context bar is displayed
    await waitFor(() => {
      expect(screen.getByText('project')).toBeInTheDocument(); // project name from path
    });

    // Find and fill the editor
    const editor = screen.getByTestId('lexical-editor');
    fireEvent.change(editor, { target: { value: 'Hello test message' } });

    // Find and click the send button
    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    // Verify alert was NOT called
    expect(global.alert).not.toHaveBeenCalled();

    // Verify that createSession WAS called with the selected folder path as agent_cwd and base_dir
    const mockACSClient = mockGetDefaultACSClient();
    await waitFor(() => {
      expect(mockACSClient.sessions.createSession).toHaveBeenCalledWith({
        name: 'Chat with Test Agent',
        agent_config_id: 'agent-1',
        agent_cwd: '/my/test/project',
        base_dir: '/my/test/project'
      });
    });

    // Verify that sendChatMessage WAS called with the selected folder path as agent_cwd_override and base_dir_override
    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          message: 'Hello test message',
          userId: 'user-123',
          agentConfigName: 'agent-1',
          acsClient: mockACSClient,
          acsOverrides: {
            agent_cwd_override: '/my/test/project',
            base_dir_override: '/my/test/project'
          },
          overrides: {},
          tools: ['cat', 'tree', 'search_files', 'str_replace_editor', 'read_files']
        })
      );
    });
  });

  it('should prioritize project path over vault path when both are available', async () => {
    // Render LandingPageInfinite with both projectContext and vault path available
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

    // Verify that createSession WAS called with project path (not vault path) as agent_cwd and base_dir
    const mockACSClient = mockGetDefaultACSClient();
    await waitFor(() => {
      expect(mockACSClient.sessions.createSession).toHaveBeenCalledWith({
        name: 'Chat with Test Agent',
        agent_config_id: 'agent-1',
        agent_cwd: '/Users/test/project', // Project path, not vault path
        base_dir: '/Users/test/project' // Project path, not vault path
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
            agent_cwd_override: '/Users/test/project', // Project path, not vault path
            base_dir_override: '/Users/test/project' // Project path, not vault path
          },
          overrides: {},
          tools: ['cat', 'tree', 'search_files', 'str_replace_editor', 'read_files']
        })
      );
    });
  });
});