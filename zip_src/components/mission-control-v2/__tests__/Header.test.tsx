import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../Header';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useDraftStore } from '@/stores/draftStore';

// Mock the stores
jest.mock('@/stores/missionControlStore');
jest.mock('@/stores/draftStore');

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('Header Component', () => {
  const mockSetSelectedSession = jest.fn();
  const mockSetShowNewDraftModal = jest.fn();
  const mockSetInitialDraftCodePath = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default store values
    (useMissionControlStore as unknown as jest.Mock).mockReturnValue({
      selectedSession: null,
      setSelectedSession: mockSetSelectedSession,
      setShowNewDraftModal: mockSetShowNewDraftModal,
      setInitialDraftCodePath: mockSetInitialDraftCodePath,
      getGroupedSessions: () => ({
        processing: [],
        idle: []
      }),
      sessions: [],
      lastCheckpointSaved: null,
      isAutoSaving: false
    });

    (useDraftStore as unknown as jest.Mock).mockReturnValue({
      getDraftsArray: () => []
    });
  });

  it('renders with "Ready for your next task" when no tasks are active', () => {
    render(<Header />);
    expect(screen.getByText('Ready for your next task')).toBeInTheDocument();
  });

  it('shows single task title when one task is processing', () => {
    (useMissionControlStore as unknown as jest.Mock).mockReturnValue({
      selectedSession: null,
      setSelectedSession: mockSetSelectedSession,
      setShowNewDraftModal: mockSetShowNewDraftModal,
      setInitialDraftCodePath: mockSetInitialDraftCodePath,
      getGroupedSessions: () => ({
        processing: [
          { id: '1', mission_title: 'Fix authentication bug', status: 'working' }
        ],
        idle: []
      }),
      sessions: [],
      lastCheckpointSaved: null,
      isAutoSaving: false
    });

    render(<Header />);
    expect(screen.getByText('Building: Fix authentication bug')).toBeInTheDocument();
  });

  it('shows task count when multiple tasks are processing', () => {
    (useMissionControlStore as unknown as jest.Mock).mockReturnValue({
      selectedSession: null,
      setSelectedSession: mockSetSelectedSession,
      setShowNewDraftModal: mockSetShowNewDraftModal,
      setInitialDraftCodePath: mockSetInitialDraftCodePath,
      getGroupedSessions: () => ({
        processing: [
          { id: '1', mission_title: 'Task 1', status: 'working' },
          { id: '2', mission_title: 'Task 2', status: 'working' },
          { id: '3', mission_title: 'Task 3', status: 'working' }
        ],
        idle: []
      }),
      sessions: [],
      lastCheckpointSaved: null,
      isAutoSaving: false
    });

    render(<Header />);
    expect(screen.getByText('3 tasks in progress')).toBeInTheDocument();
  });

  it('shows draft count when only drafts exist', () => {
    (useDraftStore as unknown as jest.Mock).mockReturnValue({
      getDraftsArray: () => [
        { id: 'd1', title: 'Draft 1' },
        { id: 'd2', title: 'Draft 2' }
      ]
    });

    render(<Header />);
    expect(screen.getByText('2 drafts in progress')).toBeInTheDocument();
  });

  it('always shows New Task button', () => {
    render(<Header />);
    const newTaskButton = screen.getByText('New Task');
    expect(newTaskButton).toBeInTheDocument();
  });

  it('shows close button when session is selected', () => {
    (useMissionControlStore as unknown as jest.Mock).mockReturnValue({
      selectedSession: 'session-123',
      setSelectedSession: mockSetSelectedSession,
      setShowNewDraftModal: mockSetShowNewDraftModal,
      setInitialDraftCodePath: mockSetInitialDraftCodePath,
      getGroupedSessions: () => ({
        processing: [],
        idle: []
      }),
      sessions: [],
      lastCheckpointSaved: null,
      isAutoSaving: false
    });

    render(<Header />);
    const closeButton = screen.getByTitle('Close split view (Esc)');
    expect(closeButton).toBeInTheDocument();
  });

  it('shows ambient indicators when tasks are active', () => {
    (useMissionControlStore as unknown as jest.Mock).mockReturnValue({
      selectedSession: null,
      setSelectedSession: mockSetSelectedSession,
      setShowNewDraftModal: mockSetShowNewDraftModal,
      setInitialDraftCodePath: mockSetInitialDraftCodePath,
      getGroupedSessions: () => ({
        processing: [
          { id: '1', mission_title: 'Task 1', status: 'working' }
        ],
        idle: []
      }),
      sessions: [
        { id: '1', mission_title: 'Task 1', status: 'working' }
      ],
      lastCheckpointSaved: null,
      isAutoSaving: false
    });

    render(<Header />);
    expect(screen.getByText('Isolated')).toBeInTheDocument();
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});