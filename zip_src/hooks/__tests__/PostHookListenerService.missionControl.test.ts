import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventBus } from '@/services/acs/eventBus';
import { useMissionControlStore } from '@/stores/missionControlStore';
import type { SSEEvent } from '@/services/acs/shared/types';

// Mock the store
vi.mock('@/stores/missionControlStore');
vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn(() => ({
    sessions: {
      getSession: vi.fn().mockResolvedValue({
        data: { agent_cwd: '/test/path' }
      })
    }
  }))
}));

const mockUseMissionControlStore = useMissionControlStore as any;

describe('PostHookListenerService Mission Control Integration', () => {
  let mockStoreActions: any;
  let postHookListenerService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock store actions
    mockStoreActions = {
      updateSession: vi.fn(),
      removeFromProcessingOrder: vi.fn(),
      markSessionUnread: vi.fn(),
      markSessionRead: vi.fn(),
      selectedSession: null,
    };

    // Mock the store getState method
    mockUseMissionControlStore.getState = vi.fn(() => mockStoreActions);

    // Import and initialize the service after mocking
    const module = await import('../PostHookListenerService');
    postHookListenerService = module.postHookListenerService;
  });

  afterEach(() => {
    // Clean up any listeners
    eventBus.off('sse');
  });

  it('should move session out of processing on completion_signal event', async () => {
    const testEvent: SSEEvent = {
      type: 'completion_signal',
      sessionId: 'test-session-123',
      data: {}
    };

    // Emit the event
    eventBus.emit('sse', testEvent);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should update session to idle state
    expect(mockStoreActions.updateSession).toHaveBeenCalledWith('test-session-123', {
      status: 'idle',
      latest_message_role: 'session_end',
      latest_message_timestamp: expect.any(String),
      last_message_at: expect.any(String)
    });

    // Should remove from processing order
    expect(mockStoreActions.removeFromProcessingOrder).toHaveBeenCalledWith('test-session-123');

    // Should mark as unread (since no session is selected)
    expect(mockStoreActions.markSessionUnread).toHaveBeenCalledWith('test-session-123');
  });

  it('should move session out of processing on agent_status:session_idle event', async () => {
    const testEvent: SSEEvent = {
      type: 'agent_status',
      sessionId: 'test-session-456',
      data: { status: 'session_idle' }
    };

    // Emit the event
    eventBus.emit('sse', testEvent);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should update session to idle state
    expect(mockStoreActions.updateSession).toHaveBeenCalledWith('test-session-456', {
      status: 'idle',
      latest_message_role: 'session_end',
      latest_message_timestamp: expect.any(String),
      last_message_at: expect.any(String)
    });

    // Should remove from processing order
    expect(mockStoreActions.removeFromProcessingOrder).toHaveBeenCalledWith('test-session-456');

    // Should mark as unread
    expect(mockStoreActions.markSessionUnread).toHaveBeenCalledWith('test-session-456');
  });

  it('should keep selected session as read when end event occurs', async () => {
    // Set a selected session
    mockStoreActions.selectedSession = 'test-session-789';

    const testEvent: SSEEvent = {
      type: 'completion_signal',
      sessionId: 'test-session-789', // Same as selected session
      data: {}
    };

    // Emit the event
    eventBus.emit('sse', testEvent);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should update session to idle state
    expect(mockStoreActions.updateSession).toHaveBeenCalledWith('test-session-789', {
      status: 'idle',
      latest_message_role: 'session_end',
      latest_message_timestamp: expect.any(String),
      last_message_at: expect.any(String)
    });

    // Should remove from processing order
    expect(mockStoreActions.removeFromProcessingOrder).toHaveBeenCalledWith('test-session-789');

    // Should mark as read (since it's the selected session)
    expect(mockStoreActions.markSessionRead).toHaveBeenCalledWith('test-session-789');
    expect(mockStoreActions.markSessionUnread).not.toHaveBeenCalled();
  });

  it('should not process non-end events', async () => {
    const testEvent: SSEEvent = {
      type: 'tool_call',
      sessionId: 'test-session-999',
      data: { tool_name: 'search_files' }
    };

    // Emit the event
    eventBus.emit('sse', testEvent);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should not update session state
    expect(mockStoreActions.updateSession).not.toHaveBeenCalled();
    expect(mockStoreActions.removeFromProcessingOrder).not.toHaveBeenCalled();
    expect(mockStoreActions.markSessionUnread).not.toHaveBeenCalled();
    expect(mockStoreActions.markSessionRead).not.toHaveBeenCalled();
  });

  it('should handle agent_status events that are not session_idle', async () => {
    const testEvent: SSEEvent = {
      type: 'agent_status',
      sessionId: 'test-session-111',
      data: { status: 'working' }
    };

    // Emit the event
    eventBus.emit('sse', testEvent);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should not update session state (not an end event)
    expect(mockStoreActions.updateSession).not.toHaveBeenCalled();
    expect(mockStoreActions.removeFromProcessingOrder).not.toHaveBeenCalled();
    expect(mockStoreActions.markSessionUnread).not.toHaveBeenCalled();
    expect(mockStoreActions.markSessionRead).not.toHaveBeenCalled();
  });
});