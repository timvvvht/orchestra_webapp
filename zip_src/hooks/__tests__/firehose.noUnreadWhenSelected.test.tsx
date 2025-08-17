import { renderHook, act } from '@testing-library/react';
import { useMissionControlFirehose } from '../useMissionControlFirehose';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useAuth } from '@/auth/AuthContext';
import { getFirehose } from '@/services/GlobalServiceManager';

// Mock dependencies
jest.mock('@/auth/AuthContext');
jest.mock('@/services/GlobalServiceManager');
jest.mock('@/stores/missionControlStore');

const mockAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetFirehose = getFirehose as jest.MockedFunction<typeof getFirehose>;
const mockUseMissionControlStore = useMissionControlStore as jest.MockedFunction<typeof useMissionControlStore>;

describe('useMissionControlFirehose - Never Mark Selected Session as Unread', () => {
  let mockFirehose: any;
  let mockStoreActions: any;
  let firehoseSubscriber: (event: any) => void;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock auth user
    mockAuth.mockReturnValue({
      user: { id: 'user123' },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    // Mock store actions
    mockStoreActions = {
      updateSession: jest.fn(),
      refetchPlans: jest.fn(),
      patchPlanFromToolResult: jest.fn(),
      markSessionUnread: jest.fn(),
      markSessionRead: jest.fn(),
      selectedSession: null, // Will be overridden in tests
    };
    mockUseMissionControlStore.mockReturnValue(mockStoreActions);

    // Mock firehose service
    mockFirehose = {
      subscribe: jest.fn((callback) => {
        firehoseSubscriber = callback;
        return jest.fn(); // unsubscribe function
      }),
    };
    mockGetFirehose.mockReturnValue(mockFirehose);
  });

  it('should mark session as unread when selectedSession is different', () => {
    // Set selectedSession to a different session
    mockStoreActions.selectedSession = 'chat456';

    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a firehose event for a different session
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'tool_call',
        data: { user_id: 'user123', tool_name: 'test_tool' },
      });
    });

    // Should mark the session as unread since it's not selected
    expect(mockStoreActions.markSessionUnread).toHaveBeenCalledWith('chat123');
    expect(mockStoreActions.markSessionRead).not.toHaveBeenCalled();
  });

  it('should mark session as read when selectedSession matches (tool_call event)', () => {
    // Set selectedSession to the same session that will receive the event
    mockStoreActions.selectedSession = 'chat123';

    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a firehose event for the selected session
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'tool_call',
        data: { user_id: 'user123', tool_name: 'test_tool' },
      });
    });

    // Should mark the session as read since it's currently selected
    expect(mockStoreActions.markSessionRead).toHaveBeenCalledWith('chat123');
    expect(mockStoreActions.markSessionUnread).not.toHaveBeenCalled();
  });

  it('should mark session as read when selectedSession matches (chunk event)', () => {
    // Set selectedSession to the same session that will receive the event
    mockStoreActions.selectedSession = 'chat123';

    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a chunk event for the selected session
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'chunk',
        data: { user_id: 'user123', delta: 'Hello world' },
      });
    });

    // Should mark the session as read since it's currently selected
    expect(mockStoreActions.markSessionRead).toHaveBeenCalledWith('chat123');
    expect(mockStoreActions.markSessionUnread).not.toHaveBeenCalled();
  });

  it('should mark session as read when selectedSession matches (done event)', () => {
    // Set selectedSession to the same session that will receive the event
    mockStoreActions.selectedSession = 'chat123';

    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a done event for the selected session
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'done',
        data: { user_id: 'user123' },
      });
    });

    // Should mark the session as read since it's currently selected
    expect(mockStoreActions.markSessionRead).toHaveBeenCalledWith('chat123');
    expect(mockStoreActions.markSessionUnread).not.toHaveBeenCalled();
  });

  it('should mark session as unread when selectedSession is different (done event)', () => {
    // Set selectedSession to a different session
    mockStoreActions.selectedSession = 'chat456';

    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a done event for a different session
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'done',
        data: { user_id: 'user123' },
      });
    });

    // Should mark the session as unread since it's not selected
    expect(mockStoreActions.markSessionUnread).toHaveBeenCalledWith('chat123');
    expect(mockStoreActions.markSessionRead).not.toHaveBeenCalled();
  });

  it('should handle null selectedSession correctly', () => {
    // Set selectedSession to null (no session selected)
    mockStoreActions.selectedSession = null;

    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a firehose event
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'tool_call',
        data: { user_id: 'user123', tool_name: 'test_tool' },
      });
    });

    // Should mark the session as unread since no session is selected
    expect(mockStoreActions.markSessionUnread).toHaveBeenCalledWith('chat123');
    expect(mockStoreActions.markSessionRead).not.toHaveBeenCalled();
  });

  it('should handle multiple sessions correctly', () => {
    // Set selectedSession to one specific session
    mockStoreActions.selectedSession = 'chat123';

    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate events for both selected and non-selected sessions
    act(() => {
      // Event for selected session
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'tool_call',
        data: { user_id: 'user123', tool_name: 'test_tool' },
      });

      // Event for non-selected session
      firehoseSubscriber({
        session_id: 'chat456',
        event_type: 'tool_call',
        data: { user_id: 'user123', tool_name: 'test_tool' },
      });
    });

    // Selected session should be marked as read
    expect(mockStoreActions.markSessionRead).toHaveBeenCalledWith('chat123');
    // Non-selected session should be marked as unread
    expect(mockStoreActions.markSessionUnread).toHaveBeenCalledWith('chat456');
  });
});