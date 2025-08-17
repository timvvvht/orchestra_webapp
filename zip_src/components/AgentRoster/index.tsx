import React, { useState } from 'react';
import AgentCard from '../AgentCard';

interface AgentType {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  status: 'active' | 'idle' | 'paused';
  model?: string;
  abilities?: string[];
  description?: string;
  usage?: {
    tokens: number;
    cost: number;
  };
}

interface AgentRosterProps {
  agents: AgentType[];
  onAgentClick: (agent: AgentType) => void;
}

export const AgentRoster: React.FC<AgentRosterProps> = ({ 
  agents = [],
  onAgentClick 
}) => {
  const fallbackAgents: AgentType[] = [
    { 
      id: '1', 
      name: 'Crawler', 
      role: 'Research', 
      avatarColor: 'from-purple-500 to-indigo-600', 
      status: 'active',
      model: 'gpt-4o-mini',
      description: 'Specialized in finding and retrieving relevant information from various sources.',
      abilities: ['web_search', 'pdf_reader', 'markdown_writer', 'file_browser'],
      usage: {
        tokens: 14234,
        cost: 0.12
      }
    },
    { 
      id: '2', 
      name: 'Summarizer', 
      role: 'Content', 
      avatarColor: 'from-blue-500 to-cyan-600', 
      status: 'active',
      model: 'claude-3-haiku',
      description: 'Creates concise summaries from complex documents and research materials.',
      abilities: ['read_pdf', 'write_markdown', 'diff_documents'],
      usage: {
        tokens: 8750,
        cost: 0.09
      }
    },
    { 
      id: '3', 
      name: 'Critic', 
      role: 'Review', 
      avatarColor: 'from-pink-500 to-rose-600', 
      status: 'idle',
      model: 'gpt-4o',
      description: 'Analyzes outputs for accuracy, completeness, and logical consistency.',
      abilities: ['review_content', 'provide_feedback', 'suggest_improvements'],
      usage: {
        tokens: 5324,
        cost: 0.18
      }
    },
  ];

  const displayAgents = agents.length > 0 ? agents : fallbackAgents;

  const mapAgentStatus = (status: 'active' | 'idle' | 'paused'): 'idle' | 'thinking' | 'tool' | 'error' => {
    switch(status) {
      case 'active': return 'thinking';
      case 'idle': return 'idle';
      case 'paused': return 'tool';
      default: return 'idle';
    }
  };

  const calculateActivityPct = (tokens: number): number => {
    const budget = 25000;
    return Math.min(100, Math.max(0, (tokens / budget) * 100));
  };

  return (
    <div className="flex flex-wrap gap-4 px-6 py-4 border-b border-border/10 overflow-visible">
      {displayAgents.map((agent) => (
        <AgentCard
          key={agent.id}
          id={agent.id}
          name={agent.name}
          role={agent.role}
          avatar={agent.name.charAt(0)}
          status={mapAgentStatus(agent.status)}
          activityPct={agent.usage ? calculateActivityPct(agent.usage.tokens) : 0}
          cost={agent.usage?.cost}
          onClick={() => onAgentClick(agent)}
        />
      ))}
      
      <div 
        className="flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-105"
        aria-label="Add new agent (⌘ N)"
        onClick={() => console.log('Add new agent')}
      >
        <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-muted-foreground">
          +
        </div>
        <span className="text-xs font-medium text-muted-foreground">Add Agent</span>
      </div>
    </div>
  );
};

export default AgentRoster;