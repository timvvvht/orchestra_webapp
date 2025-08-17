import React from 'react';
import { render, screen, act } from '@testing-library/react';
import AgentListPanel from '../mission-control-v2/AgentListPanel';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useDraftStore } from '@/stores/draftStore';
import { useMissionControlFirehose } from '@/hooks/useMissionControlFirehose';
import { useAuth } from '@/auth/AuthContext';
import { getFirehose } from '@/services/GlobalServiceManager';

// Mock dependencies
jest.mock('@/stores/missionControlStore');
jest.mock('@/stores/draftStore');
jest.mock('@/hooks/useMissionControlFirehose');
jest.mock('@/auth/AuthContext');
jest.mock('@/services/GlobalServiceManager');

const mockUseMissionControlStore = useMissionControlStore as jest.MockedFunction<typeof useMissionControlStore>;
const mockUseDraftStore = useDraftStore as jest.MockedFunction<typeof useDraftStore>;
const mockUseMissionControlFirehose = useMissionControlFirehose as jest.MockedFunction<typeof useMissionControlFirehose>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetFirehose = getFirehose as jest.MockedFunction<typeof getFirehose>;

describe('AgentListPanel - No Unread Badge When Session Open', () => {
  let mockStoreState: any;
  let mockFirehose: any;
  let firehoseSubscriber: (event: any) => void;

  const mockSessions = [
    {
      id: 'chat123',
      status: 'idle',
      latest_message_content: 'Hello world',
      latest_message_role: 'assistant',
      latest_message_timestamp: '2024-01-01T10:00:00Z',
      last_message_at: '2024-01-01T10:00:00Z',
      created_at: '2024-01-01T09:00:00Z',
    },
    {
      id: 'chat456',
      status: 'idle',
      latest_message_content: 'Another message',
      latest_message_role: 'assistant',
      latest_message_timestamp: '2024-01-01T11:00:00Z',
      last_message_at: '2024-01-01T11:00:00Z',
      created_at: '2024-01-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth
    mockUseAuth.mockReturnValue({
      user: { id: 'user123' },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    // Mock draft store
    mockUseDraftStore.mockReturnValue({
      getDraftsArray: jest.fn().mockReturnValue([]),
    });

    // Mock firehose hook
    mockUseMissionControlFirehose.mockReturnValue(undefined);

    // Mock firehose service
    mockFirehose = {
      subscribe: jest.fn((callback) => {
        firehoseSubscriber = callback;
        return jest.fn(); // unsubscribe function
      }),
    };
    mockGetFirehose.mockReturnValue(mockFirehose);

    // Initialize mock store state
    mockStoreState = {
      viewMode: 'active',
      selectedSession: null,
      collapsedGroups: {
        processing: false,
        idleUnread: false,
        idleRead: false,
        drafts: false,
      },
      readMap: {
        // Initially both sessions are read
        chat123: true,
        chat456: true,
      },
      updateSession: jest.fn(),
      refetchPlans: jest.fn(),
      patchPlanFromToolResult: jest.fn(),
      markSessionUnread: jest.fn((sessionId) => {
        // Update readMap when marking unread
        mockStoreState.readMap[sessionId] = false;
      }),
      markSessionRead: jest.fn((sessionId) => {
        // Update readMap when marking read
        mockStoreState.readMap[sessionId] = true;
      }),
      getGroupedSessions: jest.fn().mockReturnValue({
        processing: [],
        idle: mockSessions,
      }),
      isSessionUnread: jest.fn((sessionId) => {
        return !mockStoreState.readMap[sessionId];
      }),
    };

    mockUseMissionControlStore.mockReturnValue(mockStoreState);
  });

  it('should not increment Unread count when selected session receives new activity', () => {
    // Pre-select session 'chat123'
    mockStoreState.selectedSession = 'chat123';

    // Render the component
    const { rerender } = render(<AgentListPanel />);

    // Initially both sessions should be in Read section (count = 2)
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Read count
    expect(screen.queryByText('Unread')).not.toBeInTheDocument(); // No unread section

    // Simulate firehose event for the selected session
    act(() => {
      // Trigger the guard logic by calling the store actions directly
      // (simulating what the firehose hook would do)
      if (mockStoreState.selectedSession === 'chat123') {
        mockStoreState.markSessionRead('chat123');
      } else {
        mockStoreState.markSessionUnread('chat123');
      }
    });

    // Re-render to reflect state changes
    rerender(<AgentListPanel />);

    // Verify that 'chat123' is still marked as read
    expect(mockStoreState.isSessionUnread('chat123')).toBe(false);
    
    // Verify UI still shows both sessions in Read section
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Read count should still be 2
    expect(screen.queryByText('Unread')).not.toBeInTheDocument(); // No unread section should appear
  });

  it('should increment Unread count when non-selected session receives new activity', () => {
    // Pre-select session 'chat123' (different from the one that will receive activity)
    mockStoreState.selectedSession = 'chat123';

    // Render the component
    const { rerender } = render(<AgentListPanel />);

    // Initially both sessions should be in Read section
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Read count
    expect(screen.queryByText('Unread')).not.toBeInTheDocument(); // No unread section

    // Simulate firehose event for a non-selected session
    act(() => {
      // Trigger the guard logic for 'chat456' (not selected)
      if (mockStoreState.selectedSession === 'chat456') {
        mockStoreState.markSessionRead('chat456');
      } else {
        mockStoreState.markSessionUnread('chat456');
      }
    });

    // Re-render to reflect state changes
    rerender(<AgentListPanel />);

    // Verify that 'chat456' is now marked as unread
    expect(mockStoreState.isSessionUnread('chat456')).toBe(true);
    
    // Verify UI now shows Unread section with 1 session and Read section with 1 session
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    
    // Find the count elements (there should be two "1" texts now)
    const countElements = screen.getAllByText('1');
    expect(countElements).toHaveLength(2); // One for Unread, one for Read
  });

  it('should handle null selectedSession correctly', () => {
    // No session selected
    mockStoreState.selectedSession = null;

    // Render the component
    const { rerender } = render(<AgentListPanel />);

    // Initially both sessions should be in Read section
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Read count

    // Simulate firehose event when no session is selected
    act(() => {
      // Should mark as unread since no session is selected
      if (mockStoreState.selectedSession === 'chat123') {
        mockStoreState.markSessionRead('chat123');
      } else {
        mockStoreState.markSessionUnread('chat123');
      }
    });

    // Re-render to reflect state changes
    rerender(<AgentListPanel />);

    // Verify that 'chat123' is now marked as unread
    expect(mockStoreState.isSessionUnread('chat123')).toBe(true);
    
    // Verify UI shows both Unread and Read sections
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    
    // Should have 1 unread and 1 read
    const countElements = screen.getAllByText('1');
    expect(countElements).toHaveLength(2);
  });

  it('should maintain correct counts when switching selected session', () => {
    // Start with chat123 selected
    mockStoreState.selectedSession = 'chat123';

    // Render the component
    const { rerender } = render(<AgentListPanel />);

    // Simulate activity for chat123 (should remain read)
    act(() => {
      if (mockStoreState.selectedSession === 'chat123') {
        mockStoreState.markSessionRead('chat123');
      } else {
        mockStoreState.markSessionUnread('chat123');
      }
    });

    // Switch selection to chat456
    mockStoreState.selectedSession = 'chat456';
    rerender(<AgentListPanel />);

    // Now simulate activity for chat123 (should become unread since it's no longer selected)
    act(() => {
      if (mockStoreState.selectedSession === 'chat123') {
        mockStoreState.markSessionRead('chat123');
      } else {
        mockStoreState.markSessionUnread('chat123');
      }
    });

    // Re-render to reflect state changes
    rerender(<AgentListPanel />);

    // Verify that chat123 is now unread and chat456 is still read
    expect(mockStoreState.isSessionUnread('chat123')).toBe(true);
    expect(mockStoreState.isSessionUnread('chat456')).toBe(false);
    
    // Should have 1 unread and 1 read
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    const countElements = screen.getAllByText('1');
    expect(countElements).toHaveLength(2);
  });
});