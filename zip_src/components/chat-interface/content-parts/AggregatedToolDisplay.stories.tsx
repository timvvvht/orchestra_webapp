import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AggregatedToolDisplay from './AggregatedToolDisplay';
import { RichContentPart } from '@/types/chatTypes';

const meta: Meta<typeof AggregatedToolDisplay> = {
  title: 'Chat/AggregatedToolDisplay',
  component: AggregatedToolDisplay,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0a' },
        { name: 'light', value: '#ffffff' }
      ]
    }
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', padding: '20px' }}>
        <Story />
      </div>
    )
  ]
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create tool content
const createToolContent = (tools: Array<{
  name: string;
  input: any;
  result?: string;
  isError?: boolean;
}>): RichContentPart[] => {
  const content: RichContentPart[] = [];
  
  tools.forEach((tool, index) => {
    content.push({
      type: 'tool_use',
      id: `tool_${index}`,
      name: tool.name,
      input: tool.input
    });
    
    if (tool.result !== undefined) {
      content.push({
        type: 'tool_result',
        tool_use_id: `tool_${index}`,
        content: tool.result,
        is_error: tool.isError || false
      });
    }
  });
  
  return content;
};

export const SingleToolCompleted: Story = {
  args: {
    content: createToolContent([
      {
        name: 'search_web',
        input: { query: 'React best practices' },
        result: 'Found 10 relevant articles about React best practices...'
      }
    ]),
    isStreaming: false
  }
};

export const MultipleToolsCompleted: Story = {
  args: {
    content: createToolContent([
      {
        name: 'search_web',
        input: { query: 'TypeScript tutorials' },
        result: 'Found 15 tutorials...'
      },
      {
        name: 'analyze_code',
        input: { file: 'App.tsx' },
        result: 'Code analysis complete. No issues found.'
      },
      {
        name: 'generate_summary',
        input: { text: 'Long text...' },
        result: 'Summary: This is a concise summary of the text.'
      }
    ]),
    isStreaming: false
  }
};

export const StreamingInProgress: Story = {
  args: {
    content: createToolContent([
      {
        name: 'search_web',
        input: { query: 'AI news' },
        result: 'Found latest AI developments...'
      },
      {
        name: 'analyze_sentiment',
        input: { text: 'Sample text' },
        result: 'Sentiment: Positive (0.85)'
      },
      {
        name: 'fetch_data',
        input: { endpoint: '/api/data' }
        // No result yet - still in progress
      }
    ]),
    isStreaming: true
  }
};

export const WithErrors: Story = {
  args: {
    content: createToolContent([
      {
        name: 'search_web',
        input: { query: 'test' },
        result: 'Search completed successfully'
      },
      {
        name: 'api_call',
        input: { endpoint: '/api/broken' },
        result: 'Error: 500 Internal Server Error',
        isError: true
      },
      {
        name: 'parse_json',
        input: { data: 'invalid json' },
        result: 'Error: Unexpected token in JSON',
        isError: true
      },
      {
        name: 'calculate',
        input: { expression: '2+2' },
        result: '4'
      }
    ]),
    isStreaming: false
  }
};

export const ManyTools: Story = {
  args: {
    content: createToolContent([
      { name: 'tool_1', input: {}, result: 'Result 1' },
      { name: 'tool_2', input: {}, result: 'Result 2' },
      { name: 'tool_3', input: {}, result: 'Result 3' },
      { name: 'tool_4', input: {}, result: 'Result 4' },
      { name: 'tool_5', input: {}, result: 'Result 5' },
      { name: 'tool_6', input: {}, result: 'Result 6' },
      { name: 'tool_7', input: {}, result: 'Result 7' },
      { name: 'tool_8', input: {}, result: 'Result 8' },
      { name: 'tool_9', input: {}, result: 'Result 9' },
      { name: 'tool_10', input: {}, result: 'Result 10' }
    ]),
    isStreaming: false
  }
};

export const EmptyState: Story = {
  args: {
    content: [],
    isStreaming: false
  }
};