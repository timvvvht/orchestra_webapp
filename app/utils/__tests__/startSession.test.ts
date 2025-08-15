/**
 * Tests for startSession utility with session permissions integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStartSession } from '../startSession';
import { sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';

// Mock dependencies
vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn(() => ({
    sessions: {
      createSession: vi.fn()
    }
  }))
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn())
}));

vi.mock('@/stores/sessionPermissionsStore', () => ({
  sessionPermissionsUtils: {
    getOrCreateSessionPermissions: vi.fn()
  }
}));

vi.mock('../worktreeApi', () => ({
  invokeCreateWorktree: vi.fn(),
  isTauriEnvironment: vi.fn()
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn()
  }
}));

describe('useStartSession with session permissions integration', () => {
  const mockNavigate = vi.fn();
  const mockCreateSession = vi.fn();
  const mockGetOrCreateSessionPermissions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    const { getDefaultACSClient } = await import('@/services/acs');
    const { useNavigate } = await import('react-router-dom');
    
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(getDefaultACSClient).mockReturnValue({
      sessions: {
        createSession: mockCreateSession
      }
    } as any);
    
    vi.mocked(sessionPermissionsUtils.getOrCreateSessionPermissions)
      .mockImplementation(mockGetOrCreateSessionPermissions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create session permissions after ACS session creation', async () => {
    // Arrange
    const mockSessionId = 'test-session-123';
    const testCodePath = '/Users/tim/Code/test-project';
    const testMessage = 'Test message';
    const testAgentConfigId = 'test-agent-config';

    mockCreateSession.mockResolvedValue({
      data: {
        data: {
          id: mockSessionId
        }
      }
    });
    mockGetOrCreateSessionPermissions.mockResolvedValue({
      sessionId: mockSessionId,
      accessPolicy: {
        whitelist: [`${testCodePath}/**`, '/vault/path/**', '/tmp/**'],
        blacklist: [],
        shell_forbidden_patterns: []
      },
      lastModified: Date.now(),
      isCustomized: false
    });

    // Act
    const { result } = renderHook(() => useStartSession());
    await result.current({
      initialMessage: testMessage,
      agentConfigId: testAgentConfigId,
      codePath: testCodePath,
      sessionName: 'Test Session'
    });

    // Assert
    expect(mockCreateSession).toHaveBeenCalledWith({
      name: 'Test Session',
      agent_config_id: testAgentConfigId
    });

    expect(mockGetOrCreateSessionPermissions).toHaveBeenCalledWith(
      mockSessionId,
      testCodePath
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      `/chat/${mockSessionId}?initialMessage=${encodeURIComponent(testMessage)}&agentConfigId=${testAgentConfigId}&projectPath=${encodeURIComponent(testCodePath)}`
    );
  });

  it('should continue with session creation even if permissions setup fails', async () => {
    // Arrange
    const mockSessionId = 'test-session-456';
    const testCodePath = '/Users/tim/Code/test-project';
    const testMessage = 'Test message';
    const testAgentConfigId = 'test-agent-config';

    mockCreateSession.mockResolvedValue({
      data: {
        data: {
          id: mockSessionId
        }
      }
    });
    mockGetOrCreateSessionPermissions.mockRejectedValue(new Error('Vault API error'));

    // Spy on console.error to verify error logging
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    const { result } = renderHook(() => useStartSession());
    await result.current({
      initialMessage: testMessage,
      agentConfigId: testAgentConfigId,
      codePath: testCodePath,
      sessionName: 'Test Session'
    });

    // Assert
    expect(mockCreateSession).toHaveBeenCalled();
    expect(mockGetOrCreateSessionPermissions).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🚨 [startSession] Failed to set up session permissions:'),
      expect.any(Error)
    );
    expect(mockNavigate).toHaveBeenCalled(); // Should still navigate

    consoleSpy.mockRestore();
  });

  it('should include modelId in query string when provided', async () => {
    // Arrange
    const mockSessionId = 'test-session-789';
    const testCodePath = '/Users/tim/Code/test-project';
    const testMessage = 'Test message';
    const testAgentConfigId = 'test-agent-config';
    const testModelId = 'gpt-4';

    mockCreateSession.mockResolvedValue({
      data: {
        data: {
          id: mockSessionId
        }
      }
    });
    mockGetOrCreateSessionPermissions.mockResolvedValue({
      sessionId: mockSessionId,
      accessPolicy: {
        whitelist: [`${testCodePath}/**`],
        blacklist: [],
        shell_forbidden_patterns: []
      },
      lastModified: Date.now(),
      isCustomized: false
    });

    // Act
    const { result } = renderHook(() => useStartSession());
    await result.current({
      initialMessage: testMessage,
      agentConfigId: testAgentConfigId,
      codePath: testCodePath,
      modelId: testModelId,
      sessionName: 'Test Session'
    });

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining(`modelId=${testModelId}`)
    );
  });

  it('should call permissions setup with correct parameters', async () => {
    // Arrange
    const mockSessionId = 'test-session-permissions';
    const testCodePath = '/Users/tim/Code/orchestra';
    const testMessage = 'Test permissions integration';
    const testAgentConfigId = 'general';

    mockCreateSession.mockResolvedValue({
      data: {
        data: {
          id: mockSessionId
        }
      }
    });
    mockGetOrCreateSessionPermissions.mockResolvedValue({
      sessionId: mockSessionId,
      accessPolicy: {
        whitelist: [`${testCodePath}/**`, '/vault/path/**', '/tmp/**'],
        blacklist: [],
        shell_forbidden_patterns: []
      },
      lastModified: Date.now(),
      isCustomized: false
    });

    // Act
    const { result } = renderHook(() => useStartSession());
    await result.current({
      initialMessage: testMessage,
      agentConfigId: testAgentConfigId,
      codePath: testCodePath
    });

    // Assert - Verify permissions are set up with the exact session ID and code path
    expect(mockGetOrCreateSessionPermissions).toHaveBeenCalledTimes(1);
    expect(mockGetOrCreateSessionPermissions).toHaveBeenCalledWith(
      mockSessionId, // The actual session ID returned from ACS
      testCodePath   // The code path provided by the user
    );
  });

  describe('worktree functionality', () => {
    const mockInvokeCreateWorktree = vi.fn();
    const mockIsTauriEnvironment = vi.fn();

    beforeEach(async () => {
      const { invokeCreateWorktree, isTauriEnvironment } = await import('../worktreeApi');
      vi.mocked(invokeCreateWorktree).mockImplementation(mockInvokeCreateWorktree);
      vi.mocked(isTauriEnvironment).mockImplementation(mockIsTauriEnvironment);
    });

    it('should forward codePath to invokeCreateWorktree when createWorktree is true', async () => {
      // Arrange
      const mockSessionId = 'test-session-worktree';
      const testCodePath = '/Users/tim/Code/test-project';
      const testMessage = 'Test worktree creation';
      const testAgentConfigId = 'test-agent-config';
      const mockWorktreePath = '/Users/tim/Code/test-project/.orchestra/worktrees/test-session-worktree';

      mockCreateSession.mockResolvedValue({
        data: {
          data: {
            id: mockSessionId
          }
        }
      });
      mockGetOrCreateSessionPermissions.mockResolvedValue({
        sessionId: mockSessionId,
        accessPolicy: {
          whitelist: [`${mockWorktreePath}/**`],
          blacklist: [],
          shell_forbidden_patterns: []
        },
        lastModified: Date.now(),
        isCustomized: false
      });
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeCreateWorktree.mockResolvedValue({
        workspace_path: mockWorktreePath,
        session_id: mockSessionId,
        branch: `session-${mockSessionId}`,
        projectRoot: testCodePath
      });

      // Act
      const { result } = renderHook(() => useStartSession());
      await result.current({
        initialMessage: testMessage,
        agentConfigId: testAgentConfigId,
        codePath: testCodePath,
        createWorktree: true
      });

      // Assert
      expect(mockInvokeCreateWorktree).toHaveBeenCalledWith(mockSessionId, testCodePath);
      expect(mockGetOrCreateSessionPermissions).toHaveBeenCalledWith(
        mockSessionId,
        mockWorktreePath // Should use worktree path as effectiveCwd
      );
    });

    it('should handle empty codePath with fallback when createWorktree is true', async () => {
      // Arrange
      const mockSessionId = 'test-session-empty-path';
      const emptyCodePath = '';
      const testMessage = 'Test empty path handling';
      const testAgentConfigId = 'test-agent-config';
      const mockWorktreePath = './.orchestra/worktrees/test-session-empty-path';

      mockCreateSession.mockResolvedValue({
        data: {
          data: {
            id: mockSessionId
          }
        }
      });
      mockGetOrCreateSessionPermissions.mockResolvedValue({
        sessionId: mockSessionId,
        accessPolicy: {
          whitelist: [`${mockWorktreePath}/**`],
          blacklist: [],
          shell_forbidden_patterns: []
        },
        lastModified: Date.now(),
        isCustomized: false
      });
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeCreateWorktree.mockResolvedValue({
        workspace_path: mockWorktreePath,
        session_id: mockSessionId,
        branch: `session-${mockSessionId}`,
        projectRoot: '.'
      });

      // Act
      const { result } = renderHook(() => useStartSession());
      await result.current({
        initialMessage: testMessage,
        agentConfigId: testAgentConfigId,
        codePath: emptyCodePath,
        createWorktree: true
      });

      // Assert
      expect(mockInvokeCreateWorktree).toHaveBeenCalledWith(mockSessionId, '.'); // Should fallback to '.'
    });

    it('should skip worktree creation when not in Tauri environment', async () => {
      // Arrange
      const mockSessionId = 'test-session-no-tauri';
      const testCodePath = '/Users/tim/Code/test-project';
      const testMessage = 'Test non-Tauri environment';
      const testAgentConfigId = 'test-agent-config';

      mockCreateSession.mockResolvedValue({
        data: {
          data: {
            id: mockSessionId
          }
        }
      });
      mockGetOrCreateSessionPermissions.mockResolvedValue({
        sessionId: mockSessionId,
        accessPolicy: {
          whitelist: [`${testCodePath}/**`],
          blacklist: [],
          shell_forbidden_patterns: []
        },
        lastModified: Date.now(),
        isCustomized: false
      });
      mockIsTauriEnvironment.mockReturnValue(false);

      // Act
      const { result } = renderHook(() => useStartSession());
      await result.current({
        initialMessage: testMessage,
        agentConfigId: testAgentConfigId,
        codePath: testCodePath,
        createWorktree: true
      });

      // Assert
      expect(mockInvokeCreateWorktree).not.toHaveBeenCalled();
      expect(mockGetOrCreateSessionPermissions).toHaveBeenCalledWith(
        mockSessionId,
        testCodePath // Should use original codePath as effectiveCwd
      );
    });
  });
});