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

describe('useMissionControlFirehose - UI State Transition Logs', () => {
  let mockFirehose: any;
  let mockStoreActions: any;
  let firehoseSubscriber: (event: any) => void;
  let consoleSpy: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Spy on console.log
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

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

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log session moving to processing bucket', () => {
    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a tool_call event
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'tool_call',
        data: { user_id: 'user123', tool_name: 'test_tool' },
      });
    });

    // Should log the session moving to processing
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UI] Session moved to PROCESSING bucket:',
      'chat123',
      '(event: tool_call)'
    );

    // Should log the session being marked as unread (since no session is selected)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UI] Session moved to UNREAD:',
      'chat123',
      '(event: tool_call)'
    );
  });

  it('should log session moving from processing to idle on done event', () => {
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

    // Should log the session moving from processing to idle
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UI] Session moved from PROCESSING → IDLE bucket:',
      'chat123'
    );

    // Should log the session being marked as unread on completion
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UI] Session completed → moved to UNREAD:',
      'chat123'
    );
  });

  it('should log when selected session stays read', () => {
    // Set a selected session
    mockStoreActions.selectedSession = 'chat123';

    // Render the hook
    renderHook(() => useMissionControlFirehose());

    // Simulate a tool_call event for the selected session
    act(() => {
      firehoseSubscriber({
        session_id: 'chat123',
        event_type: 'tool_call',
        data: { user_id: 'user123', tool_name: 'test_tool' },
      });
    });

    // Should log that the session was kept as read since it's selected
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UI] Session kept as READ (selected):',
      'chat123',
      '(event: tool_call)'
    );
  });

  it('should log when completed session stays read if selected', () => {
    // Set a selected session
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

    // Should log that the completed session was kept as read since it's selected
    expect(consoleSpy).toHaveBeenCalledWith(
      '[UI] Session completed → kept as READ (selected):',
      'chat123'
    );
  });
});