import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AgentConfigTS, ToolDefinitionTS, ToolGroupTS } from '@/types/agentConfig';
import type { ChatSession } from '@/types/chatTypes';

// Icons
import { Sparkles, Search, ArrowRight, Command, ChevronDown } from 'lucide-react';

// Alternative embedded design
export function LandingPageInfiniteAlt() {
  const navigate = useNavigate();
  const { createSession, sendMessage } = useChatStore();
  const { agentConfigs } = useAgentConfigStore();
  const { settings } = useSettingsStore();
  
  const [userInput, setUserInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentConfigTS | null>(null);
  const [showAgentBrowser, setShowAgentBrowser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  
  // Get all agents as array
  const allAgents = useMemo(() => 
    Object.values(agentConfigs).filter(Boolean) as AgentConfigTS[],
    [agentConfigs]
  );

  // Initialize with default agent
  useEffect(() => {
    const defaultId = settings.defaultAgentId || Object.keys(agentConfigs)[0];
    if (defaultId && agentConfigs[defaultId]) {
      setSelectedAgent(agentConfigs[defaultId] as AgentConfigTS);
    }
  }, [agentConfigs, settings.defaultAgentId]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Prepare agent template
  const prepareAgentTemplate = useCallback((config: AgentConfigTS): Partial<ChatSession> => {
    const avatar = config.agent.avatar?.startsWith('/') || config.agent.avatar?.startsWith('http')
      ? config.agent.avatar
      : (config.agent.avatar ? `/assets/avatars/${config.agent.avatar}` : '/assets/avatars/default_avatar.png');

    return {
      name: config.agent.name || 'Assistant',
      avatar,
      specialty: config.agent.description || 'General Assistant',
      model: config.ai_config.model_id || 'gpt-4o-mini',
      tools: config.tool_groups?.flatMap(
        (tg: ToolGroupTS) => tg.tools.map((t: ToolDefinitionTS) => t.name)
      ) || [],
      systemPrompt: config.agent.system_prompt || 'You are a helpful assistant.',
      temperature: config.ai_config.temperature ?? 0.7,
    };
  }, []);

  // Handle starting conversation
  const handleStart = async () => {
    if (!userInput.trim() || !selectedAgent) return;

    try {
      const agentTemplate = prepareAgentTemplate(selectedAgent);
      const sessionId = await createSession(
        selectedAgent.id,
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

  // Handle agent selection from browser
  const handleAgentSelect = (agent: AgentConfigTS) => {
    setSelectedAgent(agent);
    setShowAgentBrowser(false);
    inputRef.current?.focus();
  };

  // Filter agents for search
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return allAgents;
    
    const query = searchQuery.toLowerCase();
    return allAgents.filter(agent => 
      agent.agent.name.toLowerCase().includes(query) ||
      agent.agent.description.toLowerCase().includes(query)
    );
  }, [allAgents, searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Subtle animated background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 30s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 35s ease-in-out infinite reverse' }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-3xl">
          {/* Minimal branding */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-sm mb-6">
              <Sparkles className="w-8 h-8 text-white/60" />
            </div>
            <h1 className="text-5xl md:text-6xl font-extralight tracking-tight mb-2">
              How can I help?
            </h1>
            <p className="text-white/40 font-light">
              Start a conversation with your AI assistant
            </p>
          </div>

          {/* Alternative Embedded Design - Like a messaging app */}
          <div className={`bg-white/5 backdrop-blur-md rounded-3xl border transition-all duration-500 ${
            isInputFocused ? 'border-white/30 shadow-2xl shadow-white/5' : 'border-white/10'
          }`}>
            {/* The Input Area with inline agent selector */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Agent Avatar - Always visible */}
                {selectedAgent && (
                  <button
                    onClick={() => setShowAgentBrowser(true)}
                    className="flex-shrink-0 group relative"
                  >
                    <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-white/20 group-hover:ring-white/30 transition-all">
                      {selectedAgent.agent.avatar ? (
                        <img
                          src={selectedAgent.agent.avatar.startsWith('/') || selectedAgent.agent.avatar.startsWith('http')
                            ? selectedAgent.agent.avatar
                            : `/assets/avatars/${selectedAgent.agent.avatar}`}
                          alt={selectedAgent.agent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500" />
                      )}
                    </div>
                    {/* Change indicator */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                      <ChevronDown className="w-3 h-3 text-white/60" />
                    </div>
                  </button>
                )}
                
                {/* Input field */}
                <div className="flex-1">
                  {selectedAgent && (
                    <div className="mb-2">
                      <span className="text-sm text-white/40">Chatting with</span>
                      <span className="text-sm text-white/60 ml-1">{selectedAgent.agent.name}</span>
                    </div>
                  )}
                  <textarea
                    ref={inputRef}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="Type your message..."
                    className="w-full bg-transparent text-xl font-light placeholder-white/30 resize-none focus:outline-none"
                    style={{
                      lineHeight: '1.6',
                      minHeight: '60px',
                      maxHeight: '200px',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        e.preventDefault();
                        handleStart();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Action bar */}
            <div className="px-6 pb-6 flex items-center justify-between">
              <button
                onClick={() => setShowAgentBrowser(true)}
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                Change assistant
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40">
                  <Command className="inline w-3 h-3" /> + Enter
                </span>
                <button
                  onClick={handleStart}
                  disabled={!userInput.trim()}
                  className="px-6 py-2.5 bg-white text-black rounded-xl font-medium hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-8 flex items-center justify-center">
            <button
              onClick={() => setShowAgentBrowser(true)}
              className="text-sm text-white/40 hover:text-white/60 transition-colors font-light"
            >
              Browse all {allAgents.length} experts →
            </button>
          </div>
        </div>
      </div>

      {/* Agent Browser Modal - Same as before */}
      {showAgentBrowser && (
        <div 
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={() => setShowAgentBrowser(false)}
        >
          {/* ... same modal code as before ... */}
        </div>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}

export default LandingPageInfiniteAlt;