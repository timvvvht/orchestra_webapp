import React from 'react';
import { render, screen } from '@testing-library/react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useDraftStore } from '@/stores/draftStore';
import Header from '../Header';

// Mock the stores
jest.mock('@/stores/missionControlStore');
jest.mock('@/stores/draftStore');

describe('Header CWD Display', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock window.process.env.HOME for path formatting
    (global as any).window = { process: { env: { HOME: '/Users/tim' } } };
  });

  it('should display formatted CWD when session is selected', () => {
    // Mock store state with selected session
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: '/Users/tim/Code/orchestra/.orchestra/worktrees/abc',
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => '/Users/tim/Code/orchestra/.orchestra/worktrees/abc',
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // Check for the formatted path (should be shortened)
    const pathElement = screen.getByText('~/Code/…/worktrees/abc');
    expect(pathElement).toBeInTheDocument();
    expect(pathElement).toHaveClass('text-white/50');
    expect(pathElement).toHaveClass('font-mono');
  });

  it('should display tooltip with full path on hover', async () => {
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: '/Users/tim/Code/orchestra/.orchestra/worktrees/abc',
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => '/Users/tim/Code/orchestra/.orchestra/worktrees/abc',
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
    const pathElement = screen.getByText('~/Code/…/worktrees/abc');
    
    // Hover over the element (in a real test, you'd use userEvent.hover)
    // For now, just verify the element exists and has the correct attributes
    expect(pathElement).toBeInTheDocument();
    
    // The tooltip content should be present in the DOM (though hidden by default)
    // Note: Testing actual tooltip visibility requires more complex setup with userEvent
    const tooltipContent = screen.getByText('/Users/tim/Code/orchestra/.orchestra/worktrees/abc');
    expect(tooltipContent).toBeInTheDocument();
  });

  it('should display middle-dot separator when CWD is shown', () => {
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: '/Users/tim/Code/orchestra/.orchestra/worktrees/abc',
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => '/Users/tim/Code/orchestra/.orchestra/worktrees/abc',
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // Check for the middle-dot separator
    const separator = screen.getByText('·');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveClass('text-white/50');
  });
});