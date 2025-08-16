/**
 * Integration tests for worktree functionality
 * Tests the complete flow from Mission Control to worktree creation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStartSession } from '../startSession';
import { invokeCreateWorktree, isTauriEnvironment } from '../worktreeApi';

// Mock the dependencies
vi.mock('../worktreeApi', () => ({
  invokeCreateWorktree: vi.fn(),
  isTauriEnvironment: vi.fn(),
  invokeFinalizeWorktree: vi.fn(),
}));

vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn(() => ({
    sessions: {
      createSession: vi.fn(() => Promise.resolve({
        data: { data: { id: 'test-session-123' } }
      }))
    }
  }))
}));

vi.mock('@/stores/sessionPermissionsStore', () => ({
  sessionPermissionsUtils: {
    getOrCreateSessionPermissions: vi.fn(() => Promise.resolve())
  },
  useSessionPermissionsStore: {
    getState: vi.fn(() => ({
      getSessionPermissions: vi.fn(() => null)
    }))
  }
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn())
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn()
  }
}));

describe('Worktree Integration Tests', () => {
  const mockInvokeCreateWorktree = vi.mocked(invokeCreateWorktree);
  const mockIsTauriEnvironment = vi.mocked(isTauriEnvironment);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mission Control Worktree Creation', () => {
    it('should create worktree when createWorktree is true and in Tauri environment', async () => {
      // Arrange
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeCreateWorktree.mockResolvedValue({
        workspace_path: '/tmp/worktree-test-session-123',
        session_id: 'test-session-123',
        branch: 'session-test-session-123'
      });

      const { result } = renderHook(() => useStartSession());

      // Act
      await result.current({
        initialMessage: 'Test mission control task',
        agentConfigId: 'test-agent',
        codePath: '/test/project',
        createWorktree: true, // This should trigger worktree creation
        sessionName: 'Test Mission Control Session'
      });

      // Assert
      expect(mockIsTauriEnvironment).toHaveBeenCalled();
      expect(mockInvokeCreateWorktree).toHaveBeenCalledWith('test-session-123');
    });

    it('should skip worktree creation when createWorktree is false', async () => {
      // Arrange
      mockIsTauriEnvironment.mockReturnValue(true);

      const { result } = renderHook(() => useStartSession());

      // Act
      await result.current({
        initialMessage: 'Test regular session',
        agentConfigId: 'test-agent',
        codePath: '/test/project',
        createWorktree: false, // This should NOT trigger worktree creation
        sessionName: 'Test Regular Session'
      });

      // Assert
      expect(mockInvokeCreateWorktree).not.toHaveBeenCalled();
    });

    it('should skip worktree creation when not in Tauri environment', async () => {
      // Arrange
      mockIsTauriEnvironment.mockReturnValue(false);

      const { result } = renderHook(() => useStartSession());

      // Act
      await result.current({
        initialMessage: 'Test web session',
        agentConfigId: 'test-agent',
        codePath: '/test/project',
        createWorktree: true, // This should NOT trigger worktree creation (not in Tauri)
        sessionName: 'Test Web Session'
      });

      // Assert
      expect(mockIsTauriEnvironment).toHaveBeenCalled();
      expect(mockInvokeCreateWorktree).not.toHaveBeenCalled();
    });

    it('should handle worktree creation errors gracefully', async () => {
      // Arrange
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeCreateWorktree.mockRejectedValue(new Error('Worktree creation failed'));

      const { result } = renderHook(() => useStartSession());

      // Act & Assert - should not throw
      await expect(result.current({
        initialMessage: 'Test error handling',
        agentConfigId: 'test-agent',
        codePath: '/test/project',
        createWorktree: true,
        sessionName: 'Test Error Session'
      })).resolves.not.toThrow();

      expect(mockInvokeCreateWorktree).toHaveBeenCalledWith('test-session-123');
    });

    it('should use default createWorktree value of false for backward compatibility', async () => {
      // Arrange
      mockIsTauriEnvironment.mockReturnValue(true);

      const { result } = renderHook(() => useStartSession());

      // Act - not passing createWorktree option
      await result.current({
        initialMessage: 'Test default behavior',
        agentConfigId: 'test-agent',
        codePath: '/test/project',
        sessionName: 'Test Default Session'
        // createWorktree not specified - should default to false
      });

      // Assert
      expect(mockInvokeCreateWorktree).not.toHaveBeenCalled();
    });
  });

  describe('Worktree API Functions', () => {
    it('should detect Tauri environment correctly', () => {
      // Test the actual implementation logic
      const originalWindow = global.window;
      
      // Mock Tauri environment
      global.window = { __TAURI__: {} } as any;
      expect(isTauriEnvironment()).toBe(true);
      
      // Mock non-Tauri environment
      global.window = {} as any;
      expect(isTauriEnvironment()).toBe(false);
      
      // Mock no window (SSR)
      delete (global as any).window;
      expect(isTauriEnvironment()).toBe(false);
      
      // Restore
      global.window = originalWindow;
    });
  });
});