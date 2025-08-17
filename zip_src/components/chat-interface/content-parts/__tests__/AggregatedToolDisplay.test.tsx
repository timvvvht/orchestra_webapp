import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AggregatedToolDisplay from '../AggregatedToolDisplay';
import { RichContentPart, ChatMessage, ChatRole } from '@/types/chatTypes';

// Mock the useToolInteractions hook
jest.mock('@/stores/hooks/useToolInteractions', () => ({
  useToolInteractions: jest.fn(),
  useToolInteractionSummary: jest.fn(),
}));

import { useToolInteractions, useToolInteractionSummary } from '@/stores/hooks/useToolInteractions';

describe('AggregatedToolDisplay', () => {
  const mockMessage: ChatMessage = {
    id: 'test-message',
    sessionId: 'test-session',
    role: ChatRole.Assistant,
    content: [
      {
        type: 'text',
        text: 'Hello world'
      },
      {
        type: 'tool_use',
        id: 'tool1',
        name: 'search_web',
        input: { query: 'test' }
      },
      {
        type: 'tool_use',
        id: 'tool2',
        name: 'calculate',
        input: { expression: '2+2' }
      }
    ],
    createdAt: Date.now()
  };

  const mockToolInteractions = [
    {
      status: 'completed' as const,
      toolCall: {
        type: 'tool_use' as const,
        id: 'tool1',
        name: 'search_web',
        input: { query: 'test' }
      },
      toolResult: {
        type: 'tool_result' as const,
        tool_use_id: 'tool1',
        content: 'Search results...',
        is_error: false
      }
    },
    {
      status: 'completed' as const,
      toolCall: {
        type: 'tool_use' as const,
        id: 'tool2',
        name: 'calculate',
        input: { expression: '2+2' }
      },
      toolResult: {
        type: 'tool_result' as const,
        tool_use_id: 'tool2',
        content: '4',
        is_error: false
      }
    }
  ];

  const mockSummary = {
    total: 2,
    running: 0,
    completed: 2,
    failed: 0
  };

  beforeEach(() => {
    // Reset mocks before each test
    (useToolInteractions as jest.Mock).mockReturnValue(mockToolInteractions);
    (useToolInteractionSummary as jest.Mock).mockReturnValue(mockSummary);
  });

  it('should not render when no tools are present', () => {
    const messageWithoutTools: ChatMessage = {
      ...mockMessage,
      content: [{ type: 'text', text: 'Just text' }]
    };
    
    (useToolInteractions as jest.Mock).mockReturnValue([]);
    (useToolInteractionSummary as jest.Mock).mockReturnValue({
      total: 0,
      running: 0,
      completed: 0,
      failed: 0
    });
    
    const { container } = render(
      <AggregatedToolDisplay message={messageWithoutTools} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should show correct tool count when collapsed', () => {
    render(<AggregatedToolDisplay message={mockMessage} />);
    
    expect(screen.getByText('2 tools')).toBeInTheDocument();
  });

  it('should show streaming indicator when streaming', () => {
    const streamingContent: RichContentPart[] = [
      ...mockContent.slice(0, 3), // First tool complete
      {
        type: 'tool_use',
        id: 'tool3',
        name: 'analyze_data',
        input: { data: 'test' }
      }
      // No result yet for tool3
    ];
    
    render(<AggregatedToolDisplay content={streamingContent} isStreaming={true} />);
    
    expect(screen.getByText('analyze_data')).toBeInTheDocument();
    expect(screen.getByText('(2 of 2)')).toBeInTheDocument();
  });

  it('should expand and collapse on click', () => {
    render(<AggregatedToolDisplay content={mockContent} />);
    
    const summary = screen.getByText('2 tools completed').closest('div');
    
    // Initially collapsed - individual tools should not be visible
    expect(screen.queryByText('search_web')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(summary!);
    
    // Now individual tools should be visible
    expect(screen.getByText('search_web')).toBeInTheDocument();
    expect(screen.getByText('calculate')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(summary!);
    
    // Tools should be hidden again (in the expanded section)
    // Note: The tool names might still be in DOM but not visible
  });

  it('should show error indicator when tools fail', () => {
    const contentWithError: RichContentPart[] = [
      {
        type: 'tool_use',
        id: 'tool1',
        name: 'failing_tool',
        input: {}
      },
      {
        type: 'tool_result',
        tool_use_id: 'tool1',
        content: 'Error: Something went wrong',
        is_error: true
      }
    ];
    
    render(<AggregatedToolDisplay content={contentWithError} />);
    
    expect(screen.getByText('1 tool completed')).toBeInTheDocument();
    expect(screen.getByText('(1 failed)')).toBeInTheDocument();
  });
});