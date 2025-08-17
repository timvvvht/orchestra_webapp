import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useChatStore } from '@/stores/chatStore';
import { useNavigate } from 'react-router-dom';
import type { AgentConfigTS } from '@/types/agentConfig';

interface AgentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgentId?: string;
}

/**
 * AgentSelectorModal - Quick agent switching interface
 * 
 * Design Philosophy:
 * - Fast agent switching without leaving chat context
 * - Visual preview of agent capabilities
 * - Keyboard navigation support
 */
export function AgentSelectorModal({
  isOpen,
  onClose,
  currentAgentId
}: AgentSelectorModalProps) {
  const navigate = useNavigate();
  const { agentConfigs } = useAgentConfigStore();
  const { createSession } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Convert agent configs object to array for easier manipulation
  const agents = Object.values(agentConfigs);

  // Filter agents based on search
  const filteredAgents = agents.filter(agent => {
    const query = searchQuery.toLowerCase();
    return (
      agent.agent.name.toLowerCase().includes(query) ||
      agent.agent.description?.toLowerCase().includes(query) ||
      agent.tool_groups?.some(tg => 
        tg.tools.some(tool => tool.name.toLowerCase().includes(query))
      )
    );
  });

  // Handle agent selection
  const handleSelectAgent = async (agentConfig: AgentConfigTS) => {
    if (isCreatingSession) return;

    setSelectedAgentId(agentConfig.id);
    setIsCreatingSession(true);

    try {
      const sessionId = await createSession(
        agentConfig.id,
        agentConfig.agent.name || 'New Chat',
        {
          name: agentConfig.agent.name || 'New Chat',
          avatar: agentConfig.agent.avatar || '/assets/avatars/default_avatar.png',
          specialty: agentConfig.agent.description || 'General Assistant',
          model: agentConfig.ai_config.model_id || 'gpt-4o-mini',
          tools: agentConfig.tool_groups?.flatMap(tg => tg.tools.map(t => t.name)) || [],
          systemPrompt: agentConfig.agent.system_prompt || 'You are a helpful assistant.',
          temperature: agentConfig.ai_config.temperature ?? 0.7,
        }
      );

      if (sessionId) {
        navigate(`/chat/${sessionId}`);
        onClose();
      }
    } catch (error) {
      console.error("Error creating session:", error);
      // Could add toast notification here
    } finally {
      setIsCreatingSession(false);
      setSelectedAgentId(null);
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-x-4 top-[10%] max-w-2xl mx-auto z-50"
          >
            <div className="bg-black/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 py-4 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white">Select an Agent</h2>
                <p className="text-sm text-white/60 mt-1">Choose an AI assistant for your new conversation</p>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </motion.button>
              </div>

              {/* Search */}
              <div className="px-6 py-4 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search agents or capabilities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#007AFF]/50 focus:bg-white/10 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Agent List */}
              <div className="max-h-[400px] overflow-y-auto">
                {filteredAgents.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-white/40">No agents found matching "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {filteredAgents.map((agent) => {
                      const isSelected = selectedAgentId === agent.id;
                      const isCurrent = currentAgentId === agent.id;
                      const tools = agent.tool_groups?.flatMap(tg => tg.tools.map(t => t.name)) || [];

                      return (
                        <motion.button
                          key={agent.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectAgent(agent)}
                          disabled={isCreatingSession}
                          className={cn(
                            "w-full p-4 rounded-xl text-left transition-all",
                            "hover:bg-white/10",
                            isSelected && "bg-[#007AFF]/20 border-[#007AFF]/50",
                            isCurrent && "bg-white/5 border-white/20",
                            "border border-transparent",
                            isCreatingSession && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Agent Avatar */}
                            <div className="relative flex-shrink-0">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                "bg-gradient-to-br from-[#007AFF] to-[#5856D6]"
                              )}>
                                <Sparkles className="w-5 h-5 text-white" />
                              </div>
                              {isCurrent && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Agent Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white truncate">
                                {agent.agent.name}
                              </h3>
                              <p className="text-sm text-white/60 line-clamp-2 mt-0.5">
                                {agent.agent.description || 'General purpose AI assistant'}
                              </p>
                              
                              {/* Tools/Capabilities */}
                              {tools.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {tools.slice(0, 3).map((tool, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/60"
                                    >
                                      {tool}
                                    </span>
                                  ))}
                                  {tools.length > 3 && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/60">
                                      +{tools.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Model Badge */}
                            <div className="flex-shrink-0">
                              <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                                {agent.ai_config.model_id}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/40">
                    {agents.length} agents available
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/agent-configs')}
                    className="text-xs text-[#007AFF] hover:text-[#0051D5] transition-colors"
                  >
                    Manage Agents →
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AgentSelectorModal;