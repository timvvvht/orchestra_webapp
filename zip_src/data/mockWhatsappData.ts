
import { ChatMessage } from "@/components/chat/types";
import TauriResourceTest from "@/components/TauriResourceTest";

// Export the TauriResourceTest component for temporary diagnostic use
export { TauriResourceTest };

const now = Date.now();
const minute = 60 * 1000;

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  avatarType?: 'emoji' | 'resource'; // Indicates if avatar is an emoji or a resource path
  specialty: string;
  model: string;
  tools: string[];
  lastMessage: string;
  lastActivity: Date;
  unreadCount: number;
}

export const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Research Assistant',
    avatar: 'assets/robots/robot1.png',
    avatarType: 'resource',
    specialty: 'Academic Research & Data Analysis',
    model: 'GPT-4',
    tools: ['web_search', 'pdf_reader', 'data_analysis', 'citation_generator'],
    lastMessage: 'I found some relevant papers for your research.',
    lastActivity: new Date(now - 5 * minute),
    unreadCount: 2
  },
  {
    id: '2',
    name: 'Code Helper',
    avatar: 'assets/robots/robot5.png',
    avatarType: 'resource',
    specialty: 'Software Development',
    model: 'GPT-4',
    tools: ['code_analyzer', 'debugger', 'git_helper', 'docs_search'],
    lastMessage: 'Here\'s the refactored version of your code.',
    lastActivity: new Date(now - 30 * minute),
    unreadCount: 0
  },
  {
    id: '3',
    name: 'Data Analyst',
    avatar: 'assets/robots/robot9.png',
    avatarType: 'resource',
    specialty: 'Data Analysis & Visualization',
    model: 'GPT-4',
    tools: ['data_analysis', 'chart_generator', 'sql_helper', 'excel_tools'],
    lastMessage: 'The analysis of your dataset is complete.',
    lastActivity: new Date(now - 60 * minute),
    unreadCount: 5
  },
  // Fallback emoji avatar example for backward compatibility
  {
    id: '4',
    name: 'Emoji Avatar Example',
    avatar: '🤖',
    avatarType: 'emoji',
    specialty: 'Testing Emoji Avatars',
    model: 'GPT-4',
    tools: ['test_tool'],
    lastMessage: 'This agent uses an emoji avatar for testing.',
    lastActivity: new Date(now - 120 * minute),
    unreadCount: 0
  }
];

export const mockMessages: Record<string, ChatMessage[]> = {
  '1': [
    {
      id: '1-1',
      role: 'user',
      content: 'Can you help me find research papers about AI in healthcare?',
      createdAt: now - 60 * minute,
    },
    {
      id: '1-2',
      role: 'agent',
      content: "I'll search for recent papers on AI applications in healthcare.",
      createdAt: now - 58 * minute,
      toolCall: {
        id: 'search-1',
        name: 'web_search',
        arguments: JSON.stringify({ query: 'recent AI healthcare papers 2024' })
      }
    },
    {
      id: '1-3',
      role: 'agent',
      content: 'I found some relevant papers for your research. Would you like me to analyze them?',
      createdAt: now - 5 * minute,
    }
  ],
  '2': [
    {
      id: '2-1',
      role: 'user',
      content: 'Could you help me optimize this React component?',
      createdAt: now - 45 * minute,
    },
    {
      id: '2-2',
      role: 'agent',
      content: "Here's the refactored version of your code.",
      createdAt: now - 30 * minute,
    }
  ],
  '3': [
    {
      id: '3-1',
      role: 'user',
      content: 'I need help analyzing this dataset.',
      createdAt: now - 120 * minute,
    },
    {
      id: '3-2',
      role: 'agent',
      content: 'The analysis of your dataset is complete. Here are the key findings:',
      createdAt: now - 60 * minute,
    }
  ]
};
