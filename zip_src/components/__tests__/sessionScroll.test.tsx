import React from 'react';
import { render } from '@testing-library/react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import AgentListPanel from '@/components/mission-control-v2/AgentListPanel';

// Mock the stores
jest.mock('@/stores/missionControlStore');
jest.mock('@/stores/draftStore');

const mockUseMissionControlStore = useMissionControlStore as jest.MockedFunction<typeof useMissionControlStore>;
const mockUseDraftStore = jest.fn() as jest.MockedFunction<any>;

// Mock AgentCard component
jest.mock('@/components/mission-control-v2/AgentCard', () => {
  return function MockAgentCard(props: any) {
    return React.createElement('div', { 
      'data-testid': 'agent-card',
      'data-session-id': props.agent.id,
      'data-group': props.group 
    }, `Agent: ${props.agent.mission_title}`);
  };
});

// Mock AgentGroup component
jest.mock('@/components/mission-control-v2/AgentGroup', () => {
  return function MockAgentGroup(props: any) {
    return React.createElement('div', { 
      'data-testid': 'agent-group',
      'data-title': props.title,
      'data-count': props.count 
    }, [
      React.createElement('h3', { key: 'title' }, `${props.title} (${props.count})`),
      ...props.children
    ]);
  };
});

// Mock CwdFilterDropdown component
jest.mock('@/components/mission-control-v2/CwdFilterDropdown', () => {
  return function MockCwdFilterDropdown() {
    return React.createElement('div', { 'data-testid': 'cwd-filter-dropdown' }, 'Filter Dropdown');
  };
});

describe('Session Scroll to Selected', () => {
  const mockSessions = [
    {
      id: 'session-1',
      mission_title: 'First Session',
      status: 'idle',
      last_message_at: '2025-07-31T10:00:00Z',
      created_at: '2025-07-31T09:00:00Z',
      agent_config_name: null,
      model_id: null,
      latest_message_id: null,
      latest_message_role: null,
      latest_message_content: null,
      latest_message_timestamp: null,
      agent_cwd: '/Users/tim/project',
      base_dir: '/Users/tim/project',
      archived_at: null,
    },
    {
      id: 'session-2',
      mission_title: 'Second Session',
      status: 'idle',
      last_message_at: '2025-07-31T11:00:00Z',
      created_at: '2025-07-31T08:00:00Z',
      agent_config_name: null,
      model_id: null,
      latest_message_id: null,
      latest_message_role: null,
      latest_message_content: null,
      latest_message_timestamp: null,
      agent_cwd: '/Users/tim/project',
      base_dir: '/Users/tim/project',
      archived_at: null,
    },
    {
      id: 'session-3',
      mission_title: 'Third Session (Deep in List)',
      status: 'idle',
      last_message_at: '2025-07-31T12:00:00Z',
      created_at: '2025-07-31T07:00:00Z',
      agent_config_name: null,
      model_id: null,
      latest_message_id: null,
      latest_message_role: null,
      latest_message_content: null,
      latest_message_timestamp: null,
      agent_cwd: '/Users/tim/project',
      base_dir: '/Users/tim/project',
      archived_at: null,
    },
    {
      id: 'session-4',
      mission_title: 'Fourth Session (Very Deep)',
      status: 'idle',
      last_message_at: '2025-07-31T13:00:00Z',
      created_at: '2025-07-31T06:00:00Z',
      agent_config_name: null,
      model_id: null,
      latest_message_id: null,
      latest_message_role: null,
      latest_message_content: null,
      latest_message_timestamp: null,
      agent_cwd: '/Users/tim/project',
      base_dir: '/Users/tim/project',
      archived_at: null,
    },
  ];

  let scrollIntoViewSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock scrollIntoView
    scrollIntoViewSpy = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: scrollIntoViewSpy,
      writable: true,
    });

    // Mock draft store to return no drafts
    mockUseDraftStore.mockReturnValue({
      getDraftsArray: () => [],
    });
  });

  afterEach(() => {
    // Clean up the mock
    jest.restoreAllMocks();
  });

  it('should call scrollIntoView when selectedSession changes', () => {
    // Initial state - no selected session
    const mockStore = {
      viewMode: 'active',
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
      collapsedGroups: {
        processing: false,
        idle: false,
        drafts: false,
      },
      selectedSession: null,
      isSessionUnread: () => true,
    };

    mockUseMissionControlStore.mockReturnValue(mockStore as any);

    // Render the component
    const { rerender } = render(<AgentListPanel />);

    // Verify scrollIntoView was not called initially
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    // Update store to select a session deep in the list
    const updatedMockStore = {
      ...mockStore,
      selectedSession: 'session-4', // Select the last session
    };

    mockUseMissionControlStore.mockReturnValue(updatedMockStore as any);

    // Rerender the component with updated store
    rerender(<AgentListPanel />);

    // Verify scrollIntoView was called with correct parameters
    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest'
    });
  });

  it('should not call scrollIntoView when selectedSession is null', () => {
    const mockStore = {
      viewMode: 'active',
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
      collapsedGroups: {
        processing: false,
        idle: false,
        drafts: false,
      },
      selectedSession: null,
      isSessionUnread: () => true,
    };

    mockUseMissionControlStore.mockReturnValue(mockStore as any);

    render(<AgentListPanel />);

    // Verify scrollIntoView was not called
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it('should call scrollIntoView when selectedSession changes to a different session', () => {
    // Start with session-2 selected
    const mockStore = {
      viewMode: 'active',
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
      collapsedGroups: {
        processing: false,
        idle: false,
        drafts: false,
      },
      selectedSession: 'session-2',
      isSessionUnread: () => true,
    };

    mockUseMissionControlStore.mockReturnValue(mockStore as any);

    const { rerender } = render(<AgentListPanel />);

    // Clear any previous calls (though there shouldn't be any on initial render)
    scrollIntoViewSpy.mockClear();

    // Change to session-3
    const updatedMockStore = {
      ...mockStore,
      selectedSession: 'session-3',
    };

    mockUseMissionControlStore.mockReturnValue(updatedMockStore as any);

    rerender(<AgentListPanel />);

    // Verify scrollIntoView was called
    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest'
    });
  });

  it('should not call scrollIntoView when selectedSession does not change', () => {
    const mockStore = {
      viewMode: 'active',
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
      collapsedGroups: {
        processing: false,
        idle: false,
        drafts: false,
      },
      selectedSession: 'session-1',
      isSessionUnread: () => true,
    };

    mockUseMissionControlStore.mockReturnValue(mockStore as any);

    const { rerender } = render(<AgentListPanel />);

    // Clear any previous calls
    scrollIntoViewSpy.mockClear();

    // Rerender with the same selectedSession
    rerender(<AgentListPanel />);

    // Verify scrollIntoView was not called again
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it('should handle case where session element is not found', () => {
    const mockStore = {
      viewMode: 'active',
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
      collapsedGroups: {
        processing: false,
        idle: false,
        drafts: false,
      },
      selectedSession: 'non-existent-session', // Session that doesn't exist
      isSessionUnread: () => true,
    };

    mockUseMissionControlStore.mockReturnValue(mockStore as any);

    render(<AgentListPanel />);

    // Verify scrollIntoView was not called when element is not found
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it('should handle case where scrollIntoView is not available', () => {
    // Temporarily remove scrollIntoView
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    delete (HTMLElement.prototype as any).scrollIntoView;

    const mockStore = {
      viewMode: 'active',
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
      collapsedGroups: {
        processing: false,
        idle: false,
        drafts: false,
      },
      selectedSession: 'session-1',
      isSessionUnread: () => true,
    };

    mockUseMissionControlStore.mockReturnValue(mockStore as any);

    // Should not throw an error
    expect(() => {
      render(<AgentListPanel />);
    }).not.toThrow();

    // Restore scrollIntoView
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('should work with processing sessions as well', () => {
    const processingSession = {
      ...mockSessions[0],
      status: 'working',
    };

    const mockStore = {
      viewMode: 'active',
      getGroupedSessions: () => ({
        processing: [processingSession],
        idle: mockSessions.slice(1),
      }),
      collapsedGroups: {
        processing: false,
        idle: false,
        drafts: false,
      },
      selectedSession: null,
      isSessionUnread: () => true,
    };

    mockUseMissionControlStore.mockReturnValue(mockStore as any);

    const { rerender } = render(<AgentListPanel />);

    scrollIntoViewSpy.mockClear();

    // Select the processing session
    const updatedMockStore = {
      ...mockStore,
      selectedSession: 'session-1',
    };

    mockUseMissionControlStore.mockReturnValue(updatedMockStore as any);

    rerender(<AgentListPanel />);

    // Verify scrollIntoView was called for processing session
    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest'
    });
  });
});