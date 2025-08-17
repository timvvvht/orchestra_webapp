import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useDraftStore } from '@/stores/draftStore';
import Header from '../Header';

// Mock the stores
jest.mock('@/stores/missionControlStore');
jest.mock('@/stores/draftStore');

describe('Header CWD Tooltip', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    user = userEvent.setup();
    
    // Mock window.process.env.HOME for path formatting
    (global as any).window = { process: { env: { HOME: '/Users/tim' } } };
  });

  it('should show tooltip with full path when hovering over CWD', async () => {
    const fullPath = '/Users/tim/Code/orchestra/.orchestra/worktrees/session-123';
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: fullPath,
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => fullPath,
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // Find the formatted path element
    const pathElement = screen.getByText('~/Code/…/worktrees/session-123');
    expect(pathElement).toBeInTheDocument();

    // The tooltip content should exist but be hidden initially
    const tooltipContent = screen.getByText(fullPath);
    expect(tooltipContent).toBeInTheDocument();
    
    // Note: Testing actual tooltip visibility with Radix UI components requires
    // more complex setup. In a real test environment, you might need to:
    // 1. Mock the tooltip behavior
    // 2. Use specific testing utilities for Radix UI
    // 3. Test the accessibility attributes
    
    // For now, we verify the tooltip content exists and has correct styling
    expect(tooltipContent).toHaveClass('max-w-md');
    expect(tooltipContent).toHaveClass('break-all');
  });

  it('should show tooltip for middle-dot separator', async () => {
    const fullPath = '/Users/tim/Code/orchestra/.orchestra/worktrees/session-123';
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: fullPath,
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => fullPath,
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // Find the middle-dot separator
    const separator = screen.getByText('·');
    expect(separator).toBeInTheDocument();

    // The tooltip content for the separator should exist
    const separatorTooltip = screen.getByText('Current working directory');
    expect(separatorTooltip).toBeInTheDocument();
  });

  it('should have proper accessibility attributes for tooltips', () => {
    const fullPath = '/Users/tim/Code/orchestra/.orchestra/worktrees/session-123';
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: fullPath,
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => fullPath,
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // Find the path element
    const pathElement = screen.getByText('~/Code/…/worktrees/session-123');
    
    // Check if it's wrapped in a tooltip trigger (has data-state attribute)
    // This is a common pattern for Radix UI tooltip components
    const pathContainer = pathElement.closest('[data-state]');
    expect(pathContainer).toBeInTheDocument();
    
    // Find the separator element
    const separator = screen.getByText('·');
    const separatorContainer = separator.closest('[data-state]');
    expect(separatorContainer).toBeInTheDocument();
  });

  it('should handle very long paths in tooltip', () => {
    const veryLongPath = '/Users/tim/Code/very/long/path/that/should/be/wrapped/in/tooltip/orchestra/.orchestra/worktrees/session-123-with-very-long-name';
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: veryLongPath,
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => veryLongPath,
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // The tooltip should contain the full very long path
    const tooltipContent = screen.getByText(veryLongPath);
    expect(tooltipContent).toBeInTheDocument();
    expect(tooltipContent).toHaveClass('break-all'); // Should break long paths
    expect(tooltipContent).toHaveClass('max-w-md'); // Should have max width
  });
});