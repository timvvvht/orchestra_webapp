/**
 * UI Integration tests for conversation forking components
 * 
 * Tests the React components and their integration with the store
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForkDialog from '@/components/chat-interface/ForkDialog';
import ForkNavigation from '@/components/chat-interface/ForkNavigation';
import ForksList from '@/components/chat-interface/ForksList';
import { useChatStore } from '@/stores/chatStore';
import type { ConversationAncestry, ForkInfo } from '@/types/chatTypes';

// Mock the chat store
vi.mock('@/stores/chatStore');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ForkDialog Component', () => {
  const mockOnFork = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render fork dialog when open', () => {
    render(
      <ForkDialog
        open={true}
        onClose={mockOnClose}
        onFork={mockOnFork}
        initialName="Test Fork"
      />
    );

    expect(screen.getByText('Fork Conversation')).toBeInTheDocument();
    expect(screen.getByText('Create a new branch of this conversation from the selected message.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Fork')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <ForkDialog
        open={false}
        onClose={mockOnClose}
        onFork={mockOnFork}
      />
    );

    expect(screen.queryByText('Fork Conversation')).not.toBeInTheDocument();
  });

  it('should call onFork with correct parameters when submitted', async () => {
    render(
      <ForkDialog
        open={true}
        onClose={mockOnClose}
        onFork={mockOnFork}
        initialName="Test Fork"
      />
    );

    // Fill in the display title
    const displayTitleInput = screen.getByPlaceholderText(/Optional descriptive title/);
    fireEvent.change(displayTitleInput, { target: { value: 'Alternative Approach' } });

    // Click create fork button
    const createButton = screen.getByText('Create Fork');
    fireEvent.click(createButton);

    expect(mockOnFork).toHaveBeenCalledWith('Test Fork', 'Alternative Approach');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle Enter key submission', async () => {
    render(
      <ForkDialog
        open={true}
        onClose={mockOnClose}
        onFork={mockOnFork}
        initialName="Test Fork"
      />
    );

    const nameInput = screen.getByDisplayValue('Test Fork');
    fireEvent.keyDown(nameInput, { key: 'Enter' });

    expect(mockOnFork).toHaveBeenCalledWith('Test Fork', '');
  });
});

describe('ForkNavigation Component', () => {
  const mockGetForkAncestry = vi.fn();
  const mockChats = {
    'session-123': {
      id: 'session-123',
      name: 'Current Session',
      parentSessionId: 'parent-session-456',
      displayTitle: 'Current Fork'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the store
    (useChatStore as any).mockReturnValue({
      getForkAncestry: mockGetForkAncestry,
      chats: mockChats
    });
  });

  it('should not render for non-forked sessions', () => {
    const nonForkedChats = {
      'session-123': {
        id: 'session-123',
        name: 'Root Session',
        parentSessionId: null
      }
    };

    (useChatStore as any).mockReturnValue({
      getForkAncestry: mockGetForkAncestry,
      chats: nonForkedChats
    });

    render(
      <TestWrapper>
        <ForkNavigation sessionId="session-123" />
      </TestWrapper>
    );

    expect(screen.queryByText('Forked from:')).not.toBeInTheDocument();
  });

  it('should render ancestry breadcrumbs for forked sessions', async () => {
    const mockAncestry: ConversationAncestry[] = [
      { id: 'root-session', name: 'Root Session', depthLevel: 2 },
      { id: 'parent-session-456', name: 'Parent Session', depthLevel: 1 },
      { id: 'session-123', name: 'Current Session', depthLevel: 0 }
    ];

    mockGetForkAncestry.mockResolvedValue(mockAncestry);

    render(
      <TestWrapper>
        <ForkNavigation sessionId="session-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Forked from:')).toBeInTheDocument();
    });

    // Should show ancestry breadcrumbs
    expect(screen.getByText('Root Session')).toBeInTheDocument();
    expect(screen.getByText('Parent Session')).toBeInTheDocument();
    expect(screen.getByText('Current Fork')).toBeInTheDocument(); // Display title
  });

  it('should navigate to ancestor session when clicked', async () => {
    const mockAncestry: ConversationAncestry[] = [
      { id: 'root-session', name: 'Root Session', depthLevel: 1 },
      { id: 'session-123', name: 'Current Session', depthLevel: 0 }
    ];

    mockGetForkAncestry.mockResolvedValue(mockAncestry);

    render(
      <TestWrapper>
        <ForkNavigation sessionId="session-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Root Session')).toBeInTheDocument();
    });

    // Click on root session
    fireEvent.click(screen.getByText('Root Session'));

    expect(mockNavigate).toHaveBeenCalledWith('/workbench/root-session');
  });
});

describe('ForksList Component', () => {
  const mockGetConversationForks = vi.fn();
  const mockOnCreateFork = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useChatStore as any).mockReturnValue({
      getConversationForks: mockGetConversationForks
    });
  });

  it('should render empty state when no forks exist', async () => {
    mockGetConversationForks.mockResolvedValue([]);

    render(
      <TestWrapper>
        <ForksList sessionId="session-123" onCreateFork={mockOnCreateFork} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No forks yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Create alternative conversation paths by forking from any message in this conversation.')).toBeInTheDocument();
    expect(screen.getByText('Create First Fork')).toBeInTheDocument();
  });

  it('should render list of forks', async () => {
    const mockForks: ForkInfo[] = [
      {
        id: 'fork-1',
        name: 'Fork 1',
        displayTitle: 'Alternative Approach A',
        createdAt: Date.now() - 3600000, // 1 hour ago
        forkMessageId: 'message-123'
      },
      {
        id: 'fork-2',
        name: 'Fork 2',
        displayTitle: 'Alternative Approach B',
        createdAt: Date.now() - 7200000, // 2 hours ago
        forkMessageId: 'message-456'
      }
    ];

    mockGetConversationForks.mockResolvedValue(mockForks);

    render(
      <TestWrapper>
        <ForksList sessionId="session-123" onCreateFork={mockOnCreateFork} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Conversation Forks')).toBeInTheDocument();
    });

    expect(screen.getByText('Fork 1')).toBeInTheDocument();
    expect(screen.getByText('Alternative Approach A')).toBeInTheDocument();
    expect(screen.getByText('Fork 2')).toBeInTheDocument();
    expect(screen.getByText('Alternative Approach B')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument(); // Fork count
  });

  it('should navigate to fork when clicked', async () => {
    const mockForks: ForkInfo[] = [
      {
        id: 'fork-1',
        name: 'Fork 1',
        displayTitle: 'Alternative Approach A',
        createdAt: Date.now(),
        forkMessageId: 'message-123'
      }
    ];

    mockGetConversationForks.mockResolvedValue(mockForks);

    render(
      <TestWrapper>
        <ForksList sessionId="session-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Fork 1')).toBeInTheDocument();
    });

    // Click on the fork
    fireEvent.click(screen.getByText('Fork 1').closest('button')!);

    expect(mockNavigate).toHaveBeenCalledWith('/workbench/fork-1');
  });

  it('should call onCreateFork when new fork button is clicked', async () => {
    mockGetConversationForks.mockResolvedValue([]);

    render(
      <TestWrapper>
        <ForksList sessionId="session-123" onCreateFork={mockOnCreateFork} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create First Fork')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create First Fork'));

    expect(mockOnCreateFork).toHaveBeenCalled();
  });
});

describe('Fork UI Integration', () => {
  it('should integrate fork components with main chat interface', () => {
    // This test would verify that the fork components are properly
    // integrated into the main chat interface and work together
    
    // For now, just verify the components can be imported and rendered
    expect(ForkDialog).toBeDefined();
    expect(ForkNavigation).toBeDefined();
    expect(ForksList).toBeDefined();
  });
});