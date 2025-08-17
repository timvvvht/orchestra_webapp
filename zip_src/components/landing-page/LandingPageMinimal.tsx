import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AgentConfigTS, ToolDefinitionTS, ToolGroupTS } from '@/types/agentConfig';
import type { ChatSession } from '@/types/chatTypes';

// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Icons
import { 
  ArrowRight, 
  Sparkles, 
  Brain,
  CheckCircle2
} from 'lucide-react';

export function LandingPageMinimal() {
  const navigate = useNavigate();
  const { createSession, sendMessage } = useChatStore();
  const { agentConfigs } = useAgentConfigStore();
  const { settings } = useSettingsStore();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  
  // Get all available agents
  const availableAgents = useMemo(() => 
    Object.values(agentConfigs).filter(Boolean) as AgentConfigTS[],
    [agentConfigs]
  );

  // Initialize with default agent
  useEffect(() => {
    const defaultId = settings.defaultAgentId || Object.keys(agentConfigs)[0];
    if (defaultId && agentConfigs[defaultId]) {
      setSelectedAgentId(defaultId);
    }
  }, [agentConfigs, settings.defaultAgentId]);

  // Get selected agent
  const selectedAgent = selectedAgentId ? agentConfigs[selectedAgentId] : null;

  // Prepare agent template for chat session
  const prepareAgentTemplate = useCallback((config: AgentConfigTS): Partial<ChatSession> => {
    const avatar = config.agent.avatar?.startsWith('/') || config.agent.avatar?.startsWith('http')
      ? config.agent.avatar
      : (config.agent.avatar ? `/assets/avatars/${config.agent.avatar}` : '/assets/avatars/default_avatar.png');

    let template: Partial<ChatSession> = {
      name: config.agent.name || 'New Chat',
      avatar,
      specialty: config.agent.description || 'General Assistant',
      model: config.ai_config.model_id || 'gpt-4o-mini',
      tools: [],
      systemPrompt: config.agent.system_prompt || 'You are a helpful assistant.',
      temperature: config.ai_config.temperature ?? 0.7,
    };

    if (config.tool_groups && config.tool_groups.length > 0) {
      template.tools = config.tool_groups.flatMap(
        (tg: ToolGroupTS) => tg.tools.map((t: ToolDefinitionTS) => t.name)
      );
    }
    
    return template;
  }, []);

  // Handle starting a chat
  const handleStartChat = async () => {
    if (!userInput.trim() || !selectedAgentId || !selectedAgent) return;

    try {
      const agentTemplate = prepareAgentTemplate(selectedAgent);
      const sessionId = await createSession(
        selectedAgentId,
        selectedAgent.agent.name,
        agentTemplate
      );

      if (sessionId) {
        await sendMessage(userInput);
        navigate(`/chat/${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  // Handle example click
  const handleExampleClick = (example: string) => {
    setUserInput(example);
    document.getElementById('chat-input')?.focus();
  };

  // Quick example prompts based on selected agent
  const getExamplePrompts = (agent: AgentConfigTS | null): string[] => {
    if (!agent) return [];
    
    const name = agent.agent.name.toLowerCase();
    const desc = agent.agent.description?.toLowerCase() || '';
    
    if (name.includes('research') || desc.includes('research')) {
      return ['Find recent AI breakthroughs', 'Research quantum computing', 'Summarize climate studies'];
    }
    if (name.includes('code') || desc.includes('code') || desc.includes('programming')) {
      return ['Debug this React hook', 'Write a Python script', 'Optimize SQL query'];
    }
    if (name.includes('data') || desc.includes('analysis')) {
      return ['Analyze sales trends', 'Create data visualization', 'Find patterns in dataset'];
    }
    return ['Help me with a task', 'Answer my question', 'Assist with my project'];
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Minimal decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Minimal header */}
        <div className="text-center mb-8">
          <Badge className="mb-4 px-3 py-1 text-xs font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Assistants
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
              Choose Your AI Agent
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Select an expert to start your conversation
          </p>
        </div>

        {/* Main card */}
        <Card className="p-6 md:p-8 shadow-xl border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="space-y-6">
            {/* Agent Grid - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left relative ${
                    selectedAgentId === agent.id
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
                >
                  {/* Selection indicator */}
                  {selectedAgentId === agent.id && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    {agent.agent.avatar ? (
                      <img
                        src={agent.agent.avatar.startsWith('/') || agent.agent.avatar.startsWith('http')
                          ? agent.agent.avatar
                          : `/assets/avatars/${agent.agent.avatar}`}
                        alt={agent.agent.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{agent.agent.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {agent.ai_config.model_id}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {agent.agent.description}
                  </p>
                  
                  {/* Mini tool badges */}
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {agent.tool_groups?.slice(0, 2).map((group, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {group.name}
                      </Badge>
                    ))}
                    {agent.tool_groups && agent.tool_groups.length > 2 && (
                      <span className="text-[10px] text-slate-500">+{agent.tool_groups.length - 2}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Input Area - Compact */}
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  id="chat-input"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={selectedAgent ? `Ask ${selectedAgent.agent.name} anything...` : "What can I help you with?"}
                  className="w-full p-4 pr-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleStartChat();
                    }
                  }}
                />
                <div className="absolute bottom-3 right-3 text-[10px] text-slate-400">
                  ⌘ Enter
                </div>
              </div>
              
              {/* Example prompts - Minimal */}
              {selectedAgent && (
                <div className="flex flex-wrap gap-1.5">
                  {getExamplePrompts(selectedAgent).map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExampleClick(example)}
                      className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
              
              <Button
                onClick={handleStartChat}
                disabled={!userInput.trim() || !selectedAgentId}
                className="w-full py-5 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
              >
                Start Conversation
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Minimal footer text */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          Your conversations are private and secure
        </p>
      </div>
    </div>
  );
}

export default LandingPageMinimal;