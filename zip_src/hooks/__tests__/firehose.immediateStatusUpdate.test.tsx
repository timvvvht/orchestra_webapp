import { renderHook, act } from '@testing-library/react';
import { useMissionControlFirehose } from '../useMissionControlFirehose';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useAuth } from '@/auth/AuthContext';
import { getFirehose } from '@/services/GlobalServiceManager';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@/auth/AuthContext');
vi.mock('@/services/GlobalServiceManager');
vi.mock('@/stores/missionControlStore');

const mockAuth = useAuth as any;
const mockGetFirehose = getFirehose as any;
const mockUseMissionControlStore = useMissionControlStore as any;

describe('useMissionControlFirehose - Immediate Status Update', () => {
  let mockFirehose: any;
  let mockStoreActions: any;
  let firehoseSubscriber: (event: any) => void;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock auth user
    mockAuth.mockReturnValue({
      user: { id: 'user123' },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    // Mock store actions
    mockStoreActions = {
      updateSession: vi.fn(),
      refetchPlans: vi.fn(),
      patchPlanFromToolResult: vi.fn(),
      markSessionUnread: vi.fn(),
      markSessionRead: vi.fn(),
      selectedSession: null,
      ensureInProcessingOrder: vi.fn(),
      removeFromProcessingOrder: vi.fn(),
    };
    mockUseMissionControlStore.mockReturnValue(mockStoreActions);

    // Mock firehose service
    mockFirehose = {
      subscribe: vi.fn((callback) => {
        firehoseSubscriber = callback;
        return vi.fn(); // unsubscribe function
      }),
    };
    mockGetFirehose.mockReturnValue(mockFirehose);
  });

  it('should immediately update status pill when session starts processing', () => {
    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate the first event for a session (could be any event type except 'done')
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'tool_call',
        data: { user_id: 'user123', tool_name: 'test_tool' },
      });
    });

    // Should call updateSession twice:
    // 1. First call with immediate status feedback (no content to avoid overwriting)
    // 2. Second call with specific tool_call content
    expect(mockStoreActions.updateSession).toHaveBeenCalledTimes(2);

    // First call should provide immediate status feedback only (no content)
    const firstCall = mockStoreActions.updateSession.mock.calls[0];
    expect(firstCall[0]).toBe('chat123');
    expect(firstCall[1]).toMatchObject({
      status: 'working',
    });
    // Should NOT include content fields to avoid overwriting real content
    expect(firstCall[1]).not.toHaveProperty('latest_message_content');
    expect(firstCall[1]).not.toHaveProperty('latest_message_role');

    // Second call should have the specific tool_call content
    const secondCall = mockStoreActions.updateSession.mock.calls[1];
    expect(secondCall[0]).toBe('chat123');
    expect(secondCall[1]).toMatchObject({
      latest_message_role: 'tool_call',
      status: 'working',
    });
  });

  it('should not provide immediate feedback for done events', () => {
    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a done event
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'done',
        data: { user_id: 'user123' },
      });
    });

    // Should only call updateSession once (for the done event, not for immediate feedback)
    expect(mockStoreActions.updateSession).toHaveBeenCalledTimes(1);
    
    const call = mockStoreActions.updateSession.mock.calls[0];
    expect(call[1]).toMatchObject({
      status: 'idle',
      latest_message_role: 'session_end',
    });
    expect(call[1].latest_message_content).not.toBe('Processing your request…');
  });

  it('should provide immediate feedback for chunk events', () => {
    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a chunk event
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'chunk',
        data: { user_id: 'user123', delta: 'Hello world' },
      });
    });

    // Should call updateSession twice:
    // 1. Immediate status feedback (no content)
    // 2. Chunk-specific content
    expect(mockStoreActions.updateSession).toHaveBeenCalledTimes(2);

    // First call should provide immediate status feedback only
    const firstCall = mockStoreActions.updateSession.mock.calls[0];
    expect(firstCall[1]).toMatchObject({
      status: 'working',
    });
    // Should NOT include content fields to avoid overwriting real content
    expect(firstCall[1]).not.toHaveProperty('latest_message_content');
    expect(firstCall[1]).not.toHaveProperty('latest_message_role');

    // Second call should have the chunk content
    const secondCall = mockStoreActions.updateSession.mock.calls[1];
    expect(secondCall[1]).toMatchObject({
      latest_message_role: 'assistant',
      latest_message_content: 'Hello world',
    });
  });
});