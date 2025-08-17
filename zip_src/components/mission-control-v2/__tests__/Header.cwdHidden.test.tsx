import React from 'react';
import { render, screen } from '@testing-library/react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useDraftStore } from '@/stores/draftStore';
import Header from '../Header';

// Mock the stores
jest.mock('@/stores/missionControlStore');
jest.mock('@/stores/draftStore');

describe('Header CWD Hidden', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should not display CWD when no session is selected', () => {
    // Mock store state with no selected session
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
      selectedSession: null,
      sessions: mockSessions,
      getSelectedAgentCwd: () => null,
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // Check that no path is displayed
    const pathElement = screen.queryByText(/worktrees/);
    expect(pathElement).not.toBeInTheDocument();
    
    // Check that no middle-dot separator for CWD is displayed
    const separators = screen.getAllByText('·');
    // There should only be the drafts separator (if any drafts) or no separators
    // But not the CWD separator
    expect(separators.length).toBeLessThanOrEqual(1);
  });

  it('should not display CWD when selected session has null agent_cwd', () => {
    // Mock store state with selected session but null agent_cwd
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: null,
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => null,
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // Check that no path is displayed
    const pathElement = screen.queryByText(/worktrees/);
    expect(pathElement).not.toBeInTheDocument();
    
    // Check that no middle-dot separator for CWD is displayed
    const separators = screen.queryAllByText('·');
    expect(separators.length).toBe(0);
  });

  it('should not display CWD when selected session has undefined agent_cwd', () => {
    // Mock store state with selected session but undefined agent_cwd
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_cwd: undefined,
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'active',
      selectedSession: 'session-123',
      sessions: mockSessions,
      getSelectedAgentCwd: () => null,
      getGroupedSessions: () => ({
        processing: [],
        idle: mockSessions,
      }),
    });

    (useDraftStore as jest.Mock).mockReturnValue({
      getDraftsArray: () => [],
    });

    render(<Header />);

    // Check that no path is displayed
    const pathElement = screen.queryByText(/worktrees/);
    expect(pathElement).not.toBeInTheDocument();
    
    // Check that no middle-dot separator for CWD is displayed
    const separators = screen.queryAllByText('·');
    expect(separators.length).toBe(0);
  });

  it('should not display CWD in archived view mode', () => {
    // Mock store state with selected session but in archived mode
    const mockSessions = [
      {
        id: 'session-123',
        mission_title: 'Test Session',
        status: 'archived',
        agent_cwd: '/Users/tim/Code/orchestra/.orchestra/worktrees/abc',
      },
    ];

    (useMissionControlStore as jest.Mock).mockReturnValue({
      viewMode: 'archived',
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

    // Check that no path is displayed (CWD only shows in active view)
    const pathElement = screen.queryByText(/worktrees/);
    expect(pathElement).not.toBeInTheDocument();
  });
});