import { renderHook, act } from '@testing-library/react';
import { useMissionControlStore } from '../missionControlStore';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = mockLocalStorage;

describe('MissionControlStore Read State Persistence', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset the store by creating a new instance
    // Note: In a real app, you might need to clear the store state
    const { result } = renderHook(() => useMissionControlStore());
    act(() => {
      result.current.setSessions([]);
    });
  });

  describe('markSessionRead', () => {
    it('should mark session as read and save to localStorage', () => {
      const { result } = renderHook(() => useMissionControlStore());
      const sessionId = 'test-session-123';

      // Initially session should be unread (not in readMap)
      expect(result.current.isSessionUnread(sessionId)).toBe(true);

      // Mark session as read
      act(() => {
        result.current.markSessionRead(sessionId);
      });

      // Session should now be marked as read
      expect(result.current.isSessionUnread(sessionId)).toBe(false);

      // localStorage should have been called with updated readMap
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mc_read_state_v1',
        JSON.stringify({ [sessionId]: true })
      );
    });

    it('should persist read state across store instances', () => {
      // Setup: Mock localStorage to return existing read state
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ 'existing-session': true }));

      // Create first store instance and mark a session as read
      const { result: firstResult } = renderHook(() => useMissionControlStore());
      const newSessionId = 'new-session-456';

      act(() => {
        firstResult.current.markSessionRead(newSessionId);
      });

      // Verify localStorage was updated with both sessions
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mc_read_state_v1',
        JSON.stringify({ 'existing-session': true, [newSessionId]: true })
      );

      // Create second store instance (simulating page reload)
      // Mock localStorage to return the updated state
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ 'existing-session': true, [newSessionId]: true })
      );

      const { result: secondResult } = renderHook(() => useMissionControlStore());

      // Both sessions should be marked as read in the new instance
      expect(secondResult.current.isSessionUnread('existing-session')).toBe(false);
      expect(secondResult.current.isSessionUnread(newSessionId)).toBe(false);
      expect(secondResult.current.isSessionUnread('unknown-session')).toBe(true);
    });
  });

  describe('markSessionUnread', () => {
    it('should mark session as unread and save to localStorage', () => {
      const { result } = renderHook(() => useMissionControlStore());
      const sessionId = 'test-session-789';

      // First mark as read
      act(() => {
        result.current.markSessionRead(sessionId);
      });

      // Verify it's read
      expect(result.current.isSessionUnread(sessionId)).toBe(false);

      // Clear localStorage mock to track the next call
      mockLocalStorage.setItem.mockClear();

      // Now mark as unread
      act(() => {
        result.current.markSessionUnread(sessionId);
      });

      // Session should now be marked as unread
      expect(result.current.isSessionUnread(sessionId)).toBe(true);

      // localStorage should have been called with updated readMap
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mc_read_state_v1',
        JSON.stringify({ [sessionId]: false })
      );
    });
  });

  describe('isSessionUnread', () => {
    it('should return true for sessions not in readMap (default unread)', () => {
      const { result } = renderHook(() => useMissionControlStore());

      // Sessions not explicitly marked as read should be unread
      expect(result.current.isSessionUnread('unknown-session-1')).toBe(true);
      expect(result.current.isSessionUnread('unknown-session-2')).toBe(true);
    });

    it('should return false for sessions marked as read', () => {
      const { result } = renderHook(() => useMissionControlStore());
      const sessionId = 'read-session-123';

      // Mark session as read
      act(() => {
        result.current.markSessionRead(sessionId);
      });

      expect(result.current.isSessionUnread(sessionId)).toBe(false);
    });

    it('should return true for sessions explicitly marked as unread', () => {
      const { result } = renderHook(() => useMissionControlStore());
      const sessionId = 'unread-session-456';

      // First mark as read, then mark as unread
      act(() => {
        result.current.markSessionRead(sessionId);
        result.current.markSessionUnread(sessionId);
      });

      expect(result.current.isSessionUnread(sessionId)).toBe(true);
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage getItem errors gracefully', () => {
      // Mock localStorage getItem to throw an error
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      const { result } = renderHook(() => useMissionControlStore());

      // Should still work with default empty readMap
      expect(result.current.isSessionUnread('any-session')).toBe(true);
    });

    it('should handle localStorage setItem errors gracefully', () => {
      // Mock localStorage setItem to throw an error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      const { result } = renderHook(() => useMissionControlStore());
      const sessionId = 'error-session-123';

      // Should not throw error, just log it (console.error should be called)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.markSessionRead(sessionId);
      });

      // Session should still be marked as read in memory
      expect(result.current.isSessionUnread(sessionId)).toBe(false);

      // Console error should have been called
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save read state to localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('initial state loading', () => {
    it('should load existing read state from localStorage on initialization', () => {
      // Setup: Mock localStorage with existing read state
      const existingReadMap = {
        'read-session-1': true,
        'read-session-2': true,
        'unread-session': false
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingReadMap));

      const { result } = renderHook(() => useMissionControlStore());

      // Should respect the loaded read state
      expect(result.current.isSessionUnread('read-session-1')).toBe(false);
      expect(result.current.isSessionUnread('read-session-2')).toBe(false);
      expect(result.current.isSessionUnread('unread-session')).toBe(true);
      expect(result.current.isSessionUnread('new-session')).toBe(true); // Not in loaded map
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      // Mock localStorage with invalid JSON
      mockLocalStorage.getItem.mockReturnValue('invalid json string');

      const { result } = renderHook(() => useMissionControlStore());

      // Should fall back to empty readMap
      expect(result.current.isSessionUnread('any-session')).toBe(true);
    });

    it('should handle null/undefined in localStorage gracefully', () => {
      // Mock localStorage to return null
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useMissionControlStore());

      // Should fall back to empty readMap
      expect(result.current.isSessionUnread('any-session')).toBe(true);
    });
  });
});