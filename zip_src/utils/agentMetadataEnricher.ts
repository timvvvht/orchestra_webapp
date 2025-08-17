import type { AgentConfigTS, AgentMetadataTS } from '@/types/agentTypes';

// Mock metadata enrichment for demonstration
// In production, this would come from the backend
export const enrichAgentMetadata = (agent: AgentConfigTS): AgentConfigTS => {
  // If agent already has rich metadata, return as is
  if (agent.agent.metadata && agent.agent.metadata.capabilities && agent.agent.metadata.capabilities.length > 0) {
    return agent;
  }

  // Generate metadata based on agent name and description
  const name = agent.agent.name.toLowerCase();
  const description = agent.agent.description.toLowerCase();
  
  let metadata: AgentMetadataTS = {
    tags: [],
    skills: [],
    capabilities: [],
    tips: [],
    usage: {
      total_tokens: Math.floor(Math.random() * 1000000) + 100000,
      total_invocations: Math.floor(Math.random() * 10000) + 1000,
      average_response_time_ms: Math.floor(Math.random() * 500) + 100
    },
    version_history: [
      {
        version: agent.version,
        changes: "Initial release",
        updated_at: agent.updated_at
      }
    ]
  };

  // Categorize based on keywords
  if (name.includes('research') || description.includes('research') || description.includes('analyze')) {
    metadata.tags = ['research', 'analysis'];
    metadata.skills = [
      'Data Analysis',
      'Research Synthesis',
      'Fact Checking',
      'Source Citation'
    ];
    metadata.capabilities = [
      'Analyze complex datasets and identify patterns',
      'Synthesize information from multiple sources',
      'Generate comprehensive research reports',
      'Provide evidence-based recommendations'
    ];
    metadata.tips = [
      'Be specific about your research question for best results',
      'Ask for sources and citations when needed',
      'Request different analysis perspectives'
    ];
  } else if (name.includes('code') || name.includes('dev') || description.includes('programming')) {
    metadata.tags = ['development', 'coding'];
    metadata.skills = [
      'Code Generation',
      'Debugging',
      'Code Review',
      'Architecture Design'
    ];
    metadata.capabilities = [
      'Write clean, efficient code in multiple languages',
      'Debug complex issues and suggest fixes',
      'Review code for best practices and security',
      'Design scalable system architectures'
    ];
    metadata.tips = [
      'Provide context about your tech stack',
      'Share error messages for better debugging help',
      'Ask for explanations to learn as you code'
    ];
  } else if (name.includes('write') || name.includes('content') || description.includes('writing')) {
    metadata.tags = ['writing', 'creative'];
    metadata.skills = [
      'Creative Writing',
      'Content Strategy',
      'Editing & Proofreading',
      'SEO Optimization'
    ];
    metadata.capabilities = [
      'Create engaging content in various styles and tones',
      'Edit and improve existing text',
      'Generate SEO-friendly content',
      'Develop content strategies and calendars'
    ];
    metadata.tips = [
      'Specify your target audience and tone',
      'Provide examples of your preferred style',
      'Ask for multiple variations to choose from'
    ];
  } else if (name.includes('assist') || name.includes('help') || description.includes('productivity')) {
    metadata.tags = ['productivity', 'assistant'];
    metadata.skills = [
      'Task Management',
      'Scheduling',
      'Email Drafting',
      'Meeting Preparation'
    ];
    metadata.capabilities = [
      'Organize and prioritize your daily tasks',
      'Draft professional emails and documents',
      'Prepare meeting agendas and summaries',
      'Provide productivity tips and workflows'
    ];
    metadata.tips = [
      'Share your goals for personalized advice',
      'Use specific examples for better assistance',
      'Ask for step-by-step guidance when needed'
    ];
  } else {
    // Default metadata
    metadata.tags = ['general', 'assistant'];
    metadata.skills = [
      'General Knowledge',
      'Problem Solving',
      'Communication',
      'Learning Support'
    ];
    metadata.capabilities = [
      'Answer questions across various domains',
      'Help solve complex problems step by step',
      'Explain concepts in simple terms',
      'Provide learning resources and guidance'
    ];
    metadata.tips = [
      'Be clear and specific in your questions',
      'Ask follow-up questions to dive deeper',
      'Request examples for better understanding'
    ];
  }

  return {
    ...agent,
    agent: {
      ...agent.agent,
      metadata
    }
  };
};