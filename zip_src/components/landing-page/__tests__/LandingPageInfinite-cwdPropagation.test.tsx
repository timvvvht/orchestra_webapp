import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPageOrchestrator } from '../LandingPageOrchestrator';
import { useLandingState } from '@/hooks/useLandingState';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuth } from '@/auth/AuthContext';
import { useSelections } from '@/context/SelectionContext';
import { sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('@/hooks/useLandingState');
vi.mock('@/stores/settingsStore');
vi.mock('@/auth/AuthContext');
vi.mock('@/context/SelectionContext');
vi.mock('@/stores/sessionPermissionsStore', () => ({
  sessionPermissionsUtils: {
    getOrCreateSessionPermissions: vi.fn(),
  },
}));

// Mock ACS client
vi.mock('@/services/acs', () => ({
  getDefaultACSClient: () => ({
    sessions: {
      createSession: vi.fn().mockResolvedValue({
        data: {
          data: {
            id: 'test-session-id-123',
          },
        },
      }),
    },
  }),
}));

// Mock agent configs
vi.mock('@/hooks/useAgentConfigs', () => ({
  useAgentConfigs: () => ({
    agentConfigs: {
      'test-agent-id': {
        id: 'test-agent-id',
        agent: {
          name: 'Test Agent',
          description: 'A test agent',
          avatar: null,
          metadata: {
            skills: ['coding', 'testing'],
          },
        },
        ai_config: {
          model_id: 'gpt-4',
        },
      },
    },
    agentConfigsArray: [
      {
        id: 'test-agent-id',
        agent: {
          name: 'Test Agent',
          description: 'A test agent',
          avatar: null,
          metadata: {
            skills: ['coding', 'testing'],
          },
        },
        ai_config: {
          model_id: 'gpt-4',
        },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock LexicalPillEditor
vi.mock('@/components/drafts/LexicalPillEditor', () => ({
  LexicalPillEditor: ({ value, onChange, placeholder, autoFocus }) => (
    <textarea
      data-testid="lexical-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full h-32 bg-transparent text-white border border-white/20 rounded p-2"
    />
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LandingPageInfinite - cwd Propagation Integration', () => {
  const mockSelectProjectMode = vi.fn();
  const mockSelectChatMode = vi.fn();
  const mockReturnToPrelude = vi.fn();
  const mockSetShowModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useLandingState
    (useLandingState as any).mockReturnValue({
      state: {
        mode: 'prelude',
        projectContext: null,
        recentProjects: [],
      },
      selectChatMode: mockSelectChatMode,
      selectProjectMode: mockSelectProjectMode,
      returnToPrelude: mockReturnToPrelude,
      removeRecentProject: vi.fn(),
    });

    // Mock useSettingsStore
    (useSettingsStore as any).mockReturnValue({
      settings: {
        theme: {
          colorScheme: 'dark',
          accentColor: 'green',
          themePreset: 'default',
          reducedMotion: false,
          interfaceDensity: 'comfortable',
          fontSize: 'medium',
        },
        vault: {
          path: '/vault/default',
          isConnected: false,
          autoSyncOnStartup: true,
          syncInterval: 'Every 15 minutes',
        },
        keyboard: {
          shortcuts: {},
          categories: {},
        },
        notifications: {
          enabled: {
            mission_complete: true,
            agent_approval: true,
            system_update: false,
            api_limit: true,
          },
          channels: {
            mission_complete: { inApp: true, email: true, mobile: true },
            agent_approval: { inApp: true, email: false, mobile: true },
            system_update: { inApp: true, email: false, mobile: false },
            api_limit: { inApp: true, email: true, mobile: false },
          },
          emailPreferences: {
            weeklySummary: true,
            productUpdates: true,
            marketing: false,
          },
          deliveryPreferences: {
            batching: true,
            doNotDisturb: false,
            sound: 'default',
            soundEnabled: true,
          },
        },
        ui: {
          mode: 'novice',
        },
        defaultAgentId: 'test-agent-id',
        version: 1,
      },
    });

    // Mock useAuth
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      setShowModal: mockSetShowModal,
    });

    // Mock useSelections
    (useSelections as any).mockReturnValue({
      selectedModelId: null,
      setSelectedModelId: vi.fn(),
    });

    // Mock session permissions
    (sessionPermissionsUtils.getOrCreateSessionPermissions as any).mockResolvedValue({
      sessionId: 'test-session-id-123',
      accessPolicy: {
        whitelist: ['/test/project/**'],
        blacklist: [],
        shell_forbidden_patterns: [],
      },
      lastModified: Date.now(),
      isCustomized: false,
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    );
  };

  describe('Project Path Propagation', () => {
    it('should propagate selected project path to session permissions and navigation URL', async () => {
      // Setup orchestrator with project context
      (useLandingState as any).mockReturnValue({
        state: {
          mode: 'project',
          projectContext: {
            path: '/test/project/path',
            name: 'Test Project',
            lastAccessed: Date.now(),
          },
          recentProjects: [],
        },
        selectChatMode: mockSelectChatMode,
        selectProjectMode: mockSelectProjectMode,
        returnToPrelude: mockReturnToPrelude,
        removeRecentProject: vi.fn(),
      });

      renderWithProviders(<LandingPageOrchestrator />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('What can I do for you today?')).toBeInTheDocument();
      });

      // Type a message
      const editor = screen.getByTestId('lexical-editor');
      fireEvent.change(editor, { target: { value: 'Hello, test message' } });

      // Click send button
      const sendButton = screen.getByText('Send');
      fireEvent.click(sendButton);

      // Verify session permissions was called with correct project path
      await waitFor(() => {
        expect(sessionPermissionsUtils.getOrCreateSessionPermissions).toHaveBeenCalledWith(
          'test-session-id-123',
          '/test/project/path'
        );
      });

      // Verify navigation URL contains project path
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('projectPath=%2Ftest%2Fproject%2Fpath')
        );
      });
    });
  });

  describe('Fallback Path (No Project)', () => {
    it('should use vault path as fallback when no project is selected', async () => {
      // Setup orchestrator in chat mode (no project)
      (useLandingState as any).mockReturnValue({
        state: {
          mode: 'chat',
          projectContext: null,
          recentProjects: [],
        },
        selectChatMode: mockSelectChatMode,
        selectProjectMode: mockSelectProjectMode,
        returnToPrelude: mockReturnToPrelude,
        removeRecentProject: vi.fn(),
      });

      renderWithProviders(<LandingPageOrchestrator />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('What can I do for you today?')).toBeInTheDocument();
      });

      // Type a message
      const editor = screen.getByTestId('lexical-editor');
      fireEvent.change(editor, { target: { value: 'Hello, test message' } });

      // Click send button
      const sendButton = screen.getByText('Send');
      fireEvent.click(sendButton);

      // Verify session permissions was called with vault path
      await waitFor(() => {
        expect(sessionPermissionsUtils.getOrCreateSessionPermissions).toHaveBeenCalledWith(
          'test-session-id-123',
          '/vault/default'
        );
      });

      // Verify navigation URL contains vault path
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('projectPath=%2Fvault%2Fdefault')
        );
      });
    });
  });

  describe('Edge Case - Project to Chat Mode Transition', () => {
    it('should use fallback path after transitioning from project to chat mode', async () => {
      // First setup with project
      (useLandingState as any).mockReturnValue({
        state: {
          mode: 'project',
          projectContext: {
            path: '/test/project/path',
            name: 'Test Project',
            lastAccessed: Date.now(),
          },
          recentProjects: [],
        },
        selectChatMode: mockSelectChatMode,
        selectProjectMode: mockSelectProjectMode,
        returnToPrelude: mockReturnToPrelude,
        removeRecentProject: vi.fn(),
      });

      const { rerender } = renderWithProviders(<LandingPageOrchestrator />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('What can I do for you today?')).toBeInTheDocument();
      });

      // Now transition to chat mode (simulate user clicking "change" and selecting chat)
      (useLandingState as any).mockReturnValue({
        state: {
          mode: 'chat',
          projectContext: null,
          recentProjects: [],
        },
        selectChatMode: mockSelectChatMode,
        selectProjectMode: mockSelectProjectMode,
        returnToPrelude: mockReturnToPrelude,
        removeRecentProject: vi.fn(),
      });

      rerender(<LandingPageOrchestrator />);

      // Type a message
      const editor = screen.getByTestId('lexical-editor');
      fireEvent.change(editor, { target: { value: 'Hello, test message' } });

      // Click send button
      const sendButton = screen.getByText('Send');
      fireEvent.click(sendButton);

      // Verify session permissions was called with vault path (fallback), not previous project path
      await waitFor(() => {
        expect(sessionPermissionsUtils.getOrCreateSessionPermissions).toHaveBeenCalledWith(
          'test-session-id-123',
          '/vault/default'
        );
      });

      // Verify navigation URL contains vault path
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('projectPath=%2Fvault%2Fdefault')
        );
      });
    });
  });
});