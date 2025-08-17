import React from 'react';
import { render, screen } from '@testing-library/react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import AgentListPanel from '@/components/mission-control-v2/AgentListPanel';
import AgentCard from '@/components/mission-control-v2/AgentCard';

// Mock the stores
jest.mock('@/stores/missionControlStore');
jest.mock('@/stores/draftStore');

const mockUseMissionControlStore = useMissionControlStore as jest.MockedFunction<typeof useMissionControlStore>;
const mockUseDraftStore = require('@/stores/draftStore').useDraftStore as jest.MockedFunction<any>;

// Mock AgentCard component to simplify testing
jest.mock('@/components/mission-control-v2/AgentCard', () => {
  return function MockAgentCard(props: any) {
    return React.createElement('div', { 
      'data-testid': 'agent-card',
      'data-agent-id': props.agent.id,
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

describe('Session Grouping Logic', () => {
  const mockSessions = [
    {
      id: 'session-1',
      mission_title: 'Unread Session 1',
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
      mission_title: 'Read Session 1',
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
      mission_title: 'Processing Session',
      status: 'working',
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
      mission_title: 'Unread Session 2',
      status: 'idle',
      last_message_at: '2025-07-31T13:00:00Z',
      created_at: '2025-07-31T06:00:00Z',
      agent_config_name: null,
      model_id: null,
      latest_message_id: null,
      latest_message_role: null,
      latest_message_content: null,
      latest_message_timestamp: null,
      agent_cwd: '/Users/tim/other-project',
      base_dir: '/Users/tim/other-project',
      archived_at: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock draft store to return no drafts
    mockUseDraftStore.mockReturnValue({
      getDraftsArray: () => [],
    });
  });

  describe('unread vs read session grouping', () => {
    it('should split idle sessions into unread and read groups', () => {
      // Setup store mock with sessions and read state
      mockUseMissionControlStore.mockReturnValue({
        viewMode: 'active',
        getGroupedSessions: () => ({
          processing: [mockSessions[2]], // session-3 is processing
          idle: [mockSessions[0], mockSessions[1], mockSessions[3]], // sessions 1, 2, 4 are idle
        }),
        collapsedGroups: {
          processing: false,
          idle: false,
          drafts: false,
        },
        selectedSession: null,
        isSessionUnread: (sessionId: string) => {
          // session-1 and session-4 are unread, session-2 is read
          return sessionId === 'session-1' || sessionId === 'session-4';
        },
      } as any);

      render(<AgentListPanel />);

      // Should have Processing group
      const processingGroup = screen.getByTestId('agent-group');
      expect(processingGroup).toHaveAttribute('data-title', 'Processing');
      expect(processingGroup).toHaveAttribute('data-count', '1');

      // Should have Unread group
      const unreadGroup = screen.getAllByTestId('agent-group')[1];
      expect(unreadGroup).toHaveAttribute('data-title', 'Unread');
      expect(unreadGroup).toHaveAttribute('data-count', '2');

      // Should have Read group
      const readGroup = screen.getAllByTestId('agent-group')[2];
      expect(readGroup).toHaveAttribute('data-title', 'Read');
      expect(readGroup).toHaveAttribute('data-count', '1');

      // Verify agent cards are in correct groups
      const agentCards = screen.getAllByTestId('agent-card');
      expect(agentCards).toHaveLength(4); // Total 4 sessions

      // Check that sessions are in the right groups based on read state
      const unreadCards = agentCards.filter(card => 
        ['session-1', 'session-4'].includes(card.getAttribute('data-agent-id') || '')
      );
      const readCards = agentCards.filter(card => 
        card.getAttribute('data-agent-id') === 'session-2'
      );
      const processingCards = agentCards.filter(card => 
        card.getAttribute('data-agent-id') === 'session-3'
      );

      expect(unreadCards).toHaveLength(2);
      expect(readCards).toHaveLength(1);
      expect(processingCards).toHaveLength(1);
    });

    it('should not show Unread group when all sessions are read', () => {
      mockUseMissionControlStore.mockReturnValue({
        viewMode: 'active',
        getGroupedSessions: () => ({
          processing: [],
          idle: [mockSessions[1]], // Only session-2 (read) is idle
        }),
        collapsedGroups: {
          processing: false,
          idle: false,
          drafts: false,
        },
        selectedSession: null,
        isSessionUnread: (sessionId: string) => false, // All sessions are read
      } as any);

      render(<AgentListPanel />);

      // Should not have Unread group
      const groups = screen.queryAllByTestId('agent-group');
      const unreadGroup = groups.find(group => group.getAttribute('data-title') === 'Unread');
      expect(unreadGroup).toBeUndefined();

      // Should have Read group
      const readGroup = groups.find(group => group.getAttribute('data-title') === 'Read');
      expect(readGroup).toBeInTheDocument();
      expect(readGroup).toHaveAttribute('data-count', '1');
    });

    it('should not show Read group when all sessions are unread', () => {
      mockUseMissionControlStore.mockReturnValue({
        viewMode: 'active',
        getGroupedSessions: () => ({
          processing: [],
          idle: [mockSessions[0], mockSessions[3]], // sessions 1 and 4 are unread
        }),
        collapsedGroups: {
          processing: false,
          idle: false,
          drafts: false,
        },
        selectedSession: null,
        isSessionUnread: (sessionId: string) => true, // All sessions are unread
      } as any);

      render(<AgentListPanel />);

      // Should have Unread group
      const groups = screen.getAllByTestId('agent-group');
      const unreadGroup = groups.find(group => group.getAttribute('data-title') === 'Unread');
      expect(unreadGroup).toBeInTheDocument();
      expect(unreadGroup).toHaveAttribute('data-count', '2');

      // Should not have Read group
      const readGroup = groups.find(group => group.getAttribute('data-title') === 'Read');
      expect(readGroup).toBeUndefined();
    });
  });

  describe('empty states', () => {
    it('should show empty state when no sessions exist', () => {
      mockUseMissionControlStore.mockReturnValue({
        viewMode: 'active',
        getGroupedSessions: () => ({
          processing: [],
          idle: [],
        }),
        collapsedGroups: {
          processing: false,
          idle: false,
          drafts: false,
        },
        selectedSession: null,
        isSessionUnread: (sessionId: string) => true,
      } as any);

      render(<AgentListPanel />);

      // Should show empty state message
      expect(screen.getByText(/The void awaits your command/)).toBeInTheDocument();
      expect(screen.getByText(/Summon an agent to begin your journey/)).toBeInTheDocument();

      // Should not have any session groups
      const groups = screen.queryAllByTestId('agent-group');
      expect(groups).toHaveLength(0);
    });

    it('should show empty state when only processing sessions exist and view is archived', () => {
      mockUseMissionControlStore.mockReturnValue({
        viewMode: 'archived',
        getGroupedSessions: () => ({
          processing: [mockSessions[2]], // Only processing session
          idle: [],
        }),
        collapsedGroups: {
          processing: false,
          idle: false,
          drafts: false,
        },
        selectedSession: null,
        isSessionUnread: (sessionId: string) => true,
      } as any);

      render(<AgentListPanel />);

      // Should show archive empty state
      expect(screen.getByText(/The archive awaits/)).toBeInTheDocument();
      expect(screen.getByText(/Archived sessions will materialize here/)).toBeInTheDocument();
    });
  });

  describe('archived view', () => {
    it('should show all sessions in archived view regardless of read state', () => {
      mockUseMissionControlStore.mockReturnValue({
        viewMode: 'archived',
        getGroupedSessions: () => ({
          processing: [mockSessions[2]], // session-3 is processing
          idle: [mockSessions[0], mockSessions[1], mockSessions[3]], // sessions 1, 2, 4 are idle
        }),
        collapsedGroups: {
          processing: false,
          idle: false,
          drafts: false,
        },
        selectedSession: null,
        isSessionUnread: (sessionId: string) => {
          return sessionId === 'session-1' || sessionId === 'session-4'; // sessions 1 and 4 are unread
        },
      } as any);

      render(<AgentListPanel />);

      // Should show archived sessions group with all sessions
      const archivedGroup = screen.getByTestId('agent-group');
      expect(archivedGroup).toHaveAttribute('data-title', 'Archived Sessions');
      expect(archivedGroup).toHaveAttribute('data-count', '4'); // All 4 sessions

      // Should not show Unread/Read groups in archived view
      const groups = screen.getAllByTestId('agent-group');
      expect(groups).toHaveLength(1); // Only archived group
    });
  });

  describe('with drafts', () => {
    it('should show drafts section alongside unread/read groups', () => {
      // Mock draft store to return drafts
      mockUseDraftStore.mockReturnValue({
        getDraftsArray: () => [
          { id: 'draft-1', content: 'Test draft 1' },
          { id: 'draft-2', content: 'Test draft 2' },
        ],
      });

      mockUseMissionControlStore.mockReturnValue({
        viewMode: 'active',
        getGroupedSessions: () => ({
          processing: [],
          idle: [mockSessions[0]], // session-1 is unread
        }),
        collapsedGroups: {
          processing: false,
          idle: false,
          drafts: false,
        },
        selectedSession: null,
        isSessionUnread: (sessionId: string) => true, // session-1 is unread
      } as any);

      render(<AgentListPanel />);

      // Should show drafts group
      const groups = screen.getAllByTestId('agent-group');
      const draftsGroup = groups.find(group => group.getAttribute('data-title') === 'Drafts');
      expect(draftsGroup).toBeInTheDocument();
      expect(draftsGroup).toHaveAttribute('data-count', '2');

      // Should also show unread group
      const unreadGroup = groups.find(group => group.getAttribute('data-title') === 'Unread');
      expect(unreadGroup).toBeInTheDocument();
      expect(unreadGroup).toHaveAttribute('data-count', '1');
    });
  });
});