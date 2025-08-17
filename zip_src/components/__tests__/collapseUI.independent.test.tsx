import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import AgentListPanel from '@/components/mission-control-v2/AgentListPanel';
import AgentCard from '@/components/mission-control-v2/AgentCard';
import AgentGroup from '@/components/mission-control-v2/AgentGroup';
import DraftCard from '@/components/mission-control-v2/DraftCard';
import CwdFilterDropdown from '@/components/mission-control-v2/CwdFilterDropdown';

// Mock the stores and components
jest.mock('@/stores/missionControlStore', () => ({
  useMissionControlStore: jest.fn(),
}));

jest.mock('@/stores/draftStore', () => ({
  useDraftStore: jest.fn(),
}));

jest.mock('@/components/mission-control-v2/AgentCard', () => {
  return jest.fn(() => <div data-testid="agent-card">Mock Agent Card</div>);
});

jest.mock('@/components/mission-control-v2/AgentGroup', () => {
  return jest.fn(({ title, count, isCollapsed, children, onClick }) => (
    <div data-testid={`agent-group-${title.toLowerCase()}`}>
      <button 
        data-testid={`collapse-toggle-${title.toLowerCase()}`}
        onClick={onClick}
      >
        {title} ({count}) {isCollapsed ? '[Collapsed]' : '[Expanded]'}
      </button>
      {!isCollapsed && <div data-testid="group-content">{children}</div>}
    </div>
  ));
});

jest.mock('@/components/mission-control-v2/DraftCard', () => {
  return jest.fn(() => <div data-testid="draft-card">Mock Draft Card</div>);
});

jest.mock('@/components/mission-control-v2/CwdFilterDropdown', () => {
  return jest.fn(() => <div data-testid="cwd-filter">Mock CWD Filter</div>);
});

describe('Collapse UI Independence', () => {
  const mockToggleGroupCollapsed = jest.fn();
  const mockSetSelectedSession = jest.fn();

  const mockStoreState = {
    viewMode: 'active' as const,
    collapsedGroups: {
      processing: false,
      idleUnread: false,
      idleRead: false,
      drafts: false,
    },
    selectedSession: null,
    getGroupedSessions: () => ({
      processing: [],
      idle: [
        { id: 'session1', status: 'idle', mission_title: 'Unread Session' },
        { id: 'session2', status: 'idle', mission_title: 'Read Session' },
      ],
    }),
    isSessionUnread: jest.fn((id: string) => id === 'session1'),
    toggleGroupCollapsed: mockToggleGroupCollapsed,
    setSelectedSession: mockSetSelectedSession,
  };

  const mockDraftStoreState = {
    getDraftsArray: () => [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useMissionControlStore as jest.Mock).mockReturnValue(mockStoreState);
    (useDraftStore as jest.Mock).mockReturnValue(mockDraftStoreState);
  });

  describe('Independent collapse behavior', () => {
    it('should render both Unread and Read sections when expanded', () => {
      render(<AgentListPanel />);

      // Both sections should be visible
      expect(screen.getByTestId('agent-group-unread')).toBeInTheDocument();
      expect(screen.getByTestId('agent-group-read')).toBeInTheDocument();

      // Both should show as expanded initially
      expect(screen.getByTestId('collapse-toggle-unread')).toHaveTextContent('Unread (1) [Expanded]');
      expect(screen.getByTestId('collapse-toggle-read')).toHaveTextContent('Read (1) [Expanded]');
    });

    it('should call toggleGroupCollapsed with correct key when Unread header is clicked', async () => {
      render(<AgentListPanel />);

      const unreadToggle = screen.getByTestId('collapse-toggle-unread');
      fireEvent.click(unreadToggle);

      expect(mockToggleGroupCollapsed).toHaveBeenCalledWith('idleUnread');
      expect(mockToggleGroupCollapsed).toHaveBeenCalledTimes(1);
    });

    it('should call toggleGroupCollapsed with correct key when Read header is clicked', async () => {
      render(<AgentListPanel />);

      const readToggle = screen.getByTestId('collapse-toggle-read');
      fireEvent.click(readToggle);

      expect(mockToggleGroupCollapsed).toHaveBeenCalledWith('idleRead');
      expect(mockToggleGroupCollapsed).toHaveBeenCalledTimes(1);
    });

    it('should show Unread section as collapsed when idleUnread is true', () => {
      const collapsedState = {
        ...mockStoreState,
        collapsedGroups: {
          ...mockStoreState.collapsedGroups,
          idleUnread: true,
        },
      };

      (useMissionControlStore as jest.Mock).mockReturnValue(collapsedState);

      render(<AgentListPanel />);

      expect(screen.getByTestId('collapse-toggle-unread')).toHaveTextContent('Unread (1) [Collapsed]');
      expect(screen.getByTestId('collapse-toggle-read')).toHaveTextContent('Read (1) [Expanded]');
      
      // Unread content should not be visible
      expect(screen.queryByTestId('group-content')).not.toBeInTheDocument();
    });

    it('should show Read section as collapsed when idleRead is true', () => {
      const collapsedState = {
        ...mockStoreState,
        collapsedGroups: {
          ...mockStoreState.collapsedGroups,
          idleRead: true,
        },
      };

      (useMissionControlStore as jest.Mock).mockReturnValue(collapsedState);

      render(<AgentListPanel />);

      expect(screen.getByTestId('collapse-toggle-unread')).toHaveTextContent('Unread (1) [Expanded]');
      expect(screen.getByTestId('collapse-toggle-read')).toHaveTextContent('Read (1) [Collapsed]');
      
      // Read content should not be visible
      expect(screen.queryByTestId('group-content')).not.toBeInTheDocument();
    });

    it('should show both sections as collapsed when both idleUnread and idleRead are true', () => {
      const collapsedState = {
        ...mockStoreState,
        collapsedGroups: {
          ...mockStoreState.collapsedGroups,
          idleUnread: true,
          idleRead: true,
        },
      };

      (useMissionControlStore as jest.Mock).mockReturnValue(collapsedState);

      render(<AgentListPanel />);

      expect(screen.getByTestId('collapse-toggle-unread')).toHaveTextContent('Unread (1) [Collapsed]');
      expect(screen.getByTestId('collapse-toggle-read')).toHaveTextContent('Read (1) [Collapsed]');
      
      // No content should be visible
      expect(screen.queryByTestId('group-content')).not.toBeInTheDocument();
    });

    it('should handle sessions with mixed read/unread states correctly', () => {
      const mixedState = {
        ...mockStoreState,
        getGroupedSessions: () => ({
          processing: [],
          idle: [
            { id: 'session1', status: 'idle', mission_title: 'First Unread' },
            { id: 'session2', status: 'idle', mission_title: 'Second Unread' },
            { id: 'session3', status: 'idle', mission_title: 'First Read' },
            { id: 'session4', status: 'idle', mission_title: 'Second Read' },
          ],
        }),
        isSessionUnread: jest.fn((id: string) => 
          ['session1', 'session2'].includes(id)
        ),
      };

      (useMissionControlStore as jest.Mock).mockReturnValue(mixedState);

      render(<AgentListPanel />);

      // Should show correct counts
      expect(screen.getByTestId('collapse-toggle-unread')).toHaveTextContent('Unread (2) [Expanded]');
      expect(screen.getByTestId('collapse-toggle-read')).toHaveTextContent('Read (2) [Expanded]');
    });

    it('should not render sections when there are no sessions', () => {
      const emptyState = {
        ...mockStoreState,
        getGroupedSessions: () => ({
          processing: [],
          idle: [],
        }),
      };

      (useMissionControlStore as jest.Mock).mockReturnValue(emptyState);

      render(<AgentListPanel />);

      // Sections should not be rendered
      expect(screen.queryByTestId('agent-group-unread')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agent-group-read')).not.toBeInTheDocument();
    });

    it('should only render Unread section when there are no read sessions', () => {
      const unreadOnlyState = {
        ...mockStoreState,
        getGroupedSessions: () => ({
          processing: [],
          idle: [
            { id: 'session1', status: 'idle', mission_title: 'Unread Session' },
          ],
        }),
        isSessionUnread: jest.fn(() => true),
      };

      (useMissionControlStore as jest.Mock).mockReturnValue(unreadOnlyState);

      render(<AgentListPanel />);

      expect(screen.getByTestId('agent-group-unread')).toBeInTheDocument();
      expect(screen.queryByTestId('agent-group-read')).not.toBeInTheDocument();
    });

    it('should only render Read section when there are no unread sessions', () => {
      const readOnlyState = {
        ...mockStoreState,
        getGroupedSessions: () => ({
          processing: [],
          idle: [
            { id: 'session1', status: 'idle', mission_title: 'Read Session' },
          ],
        }),
        isSessionUnread: jest.fn(() => false),
      };

      (useMissionControlStore as jest.Mock).mockReturnValue(readOnlyState);

      render(<AgentListPanel />);

      expect(screen.queryByTestId('agent-group-unread')).not.toBeInTheDocument();
      expect(screen.getByTestId('agent-group-read')).toBeInTheDocument();
    });
  });

  describe('Integration with other sections', () => {
    it('should not affect Processing section when Unread/Read sections are toggled', () => {
      const withProcessingState = {
        ...mockStoreState,
        getGroupedSessions: () => ({
          processing: [
            { id: 'session1', status: 'processing', mission_title: 'Processing Session' },
          ],
          idle: [
            { id: 'session2', status: 'idle', mission_title: 'Unread Session' },
          ],
        }),
        isSessionUnread: jest.fn(() => true),
      };

      (useMissionControlStore as jest.Mock).mockReturnValue(withProcessingState);

      render(<AgentListPanel />);

      // Processing section should be visible and expanded
      expect(screen.getByTestId('agent-group-processing')).toBeInTheDocument();
      expect(screen.getByTestId('collapse-toggle-processing')).toHaveTextContent('Processing (1) [Expanded]');

      // Toggle Unread section
      fireEvent.click(screen.getByTestId('collapse-toggle-unread'));

      // Processing section should remain unchanged
      expect(screen.getByTestId('collapse-toggle-processing')).toHaveTextContent('Processing (1) [Expanded]');
    });

    it('should not affect Drafts section when Unread/Read sections are toggled', () => {
      const withDraftsState = {
        ...mockStoreState,
      };

      (useDraftStore as jest.Mock).mockReturnValue({
        getDraftsArray: () => [
          { id: 'draft1', title: 'Test Draft' },
        ],
      });

      (useMissionControlStore as jest.Mock).mockReturnValue(withDraftsState);

      render(<AgentListPanel />);

      // Drafts section should be visible and expanded
      expect(screen.getByTestId('agent-group-drafts')).toBeInTheDocument();
      expect(screen.getByTestId('collapse-toggle-drafts')).toHaveTextContent('Drafts (1) [Expanded]');

      // Toggle Unread section
      fireEvent.click(screen.getByTestId('collapse-toggle-unread'));

      // Drafts section should remain unchanged
      expect(screen.getByTestId('collapse-toggle-drafts')).toHaveTextContent('Drafts (1) [Expanded]');
    });
  });
});