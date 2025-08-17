import { useMissionControlStore, MissionControlAgent } from '../missionControlStore';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Session Ordering with Final Assistant Messages', () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useMissionControlStore());
    act(() => {
      result.current.setSessions([]);
      result.current.setViewMode('active');
      result.current.setSelectedSession(null);
    });
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
  });

  const createMockSession = (
    id: string,
    latest_message_role: string,
    timestamp: string,
    status: string = 'idle'
  ): MissionControlAgent => ({
    id,
    mission_title: `Session ${id}`,
    status,
    last_message_at: timestamp,
    created_at: timestamp,
    agent_config_name: 'general',
    model_id: 'claude-3',
    latest_message_id: `msg-${id}`,
    latest_message_role,
    latest_message_content: `Content for ${id}`,
    latest_message_timestamp: timestamp,
    agent_cwd: `/test/${id}`,
    base_dir: `/test`,
    archived_at: null,
  });

  it('prioritizes unread final assistant messages at the top', () => {
    const { result } = renderHook(() => useMissionControlStore());

    // Create sessions with different states
    const sessions = [
      createMockSession('session1', 'user', '2024-01-01T10:00:00Z'), // Unread user message
      createMockSession('session2', 'assistant', '2024-01-01T11:00:00Z'), // Unread assistant message (should be first)
      createMockSession('session3', 'user', '2024-01-01T12:00:00Z'), // Unread user message (will be marked read)
      createMockSession('session4', 'session_end', '2024-01-01T09:00:00Z'), // Unread session_end (should be second)
    ];

    act(() => {
      result.current.setSessions(sessions);
      // Mark session3 as read to test read/unread separation
      result.current.markSessionRead('session3');
    });

    const groupedSessions = result.current.getGroupedSessions();
    const idleSessionIds = groupedSessions.idle.map(s => s.id);

    // Unread final assistant messages should be at the top
    // session2 (assistant, newer) should be first
    // session4 (session_end, older) should be second  
    // session1 (user, unread but not final assistant) should be third
    // session3 (user, read) should be last
    expect(idleSessionIds).toEqual(['session2', 'session4', 'session1', 'session3']);
  });

  it('sorts unread final assistant messages by newest first', () => {
    const { result } = renderHook(() => useMissionControlStore());

    const sessions = [
      createMockSession('older-assistant', 'assistant', '2024-01-01T09:00:00Z'),
      createMockSession('newer-assistant', 'assistant', '2024-01-01T11:00:00Z'),
      createMockSession('middle-session-end', 'session_end', '2024-01-01T10:00:00Z'),
    ];

    act(() => {
      result.current.setSessions(sessions);
      // All are unread by default
    });

    const groupedSessions = result.current.getGroupedSessions();
    const idleSessionIds = groupedSessions.idle.map(s => s.id);

    // Should be sorted by newest first among unread final assistant messages
    expect(idleSessionIds).toEqual(['newer-assistant', 'middle-session-end', 'older-assistant']);
  });

  it('separates read and unread sessions correctly', () => {
    const { result } = renderHook(() => useMissionControlStore());

    const sessions = [
      createMockSession('read-assistant', 'assistant', '2024-01-01T11:00:00Z'),
      createMockSession('unread-assistant', 'assistant', '2024-01-01T10:00:00Z'),
      createMockSession('read-user', 'user', '2024-01-01T09:00:00Z'),
      createMockSession('unread-user', 'user', '2024-01-01T08:00:00Z'),
    ];

    act(() => {
      result.current.setSessions(sessions);
      // Mark some as read
      result.current.markSessionRead('read-assistant');
      result.current.markSessionRead('read-user');
    });

    const groupedSessions = result.current.getGroupedSessions();
    const idleSessionIds = groupedSessions.idle.map(s => s.id);

    // Order should be:
    // 1. Unread final assistant messages first
    // 2. Other unread sessions
    // 3. Read sessions (by timestamp)
    expect(idleSessionIds).toEqual(['unread-assistant', 'unread-user', 'read-assistant', 'read-user']);
  });
});