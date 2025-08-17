import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AgentConfigTS } from '@/types/agentTypes';
import type { ChatSession } from '@/types/chatTypes';
import type { UseACSChatUIReturn } from '@/hooks/acs-chat';

// UI Components
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Icons
import { 
  Search,
  Brain,
  X,
  ArrowRight,
  MessageSquare,
  Zap,
  Heart,
  Star,
  TrendingUp,
  Users,
  Code,
  Palette,
  Calculator,
  Globe,
  BookOpen,
  Briefcase
} from 'lucide-react';

// Framer Motion for smooth animations
import { motion, AnimatePresence } from 'framer-motion';

interface NewChatModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateChat?: (name?: string, agentConfigId?: string) => Promise<void>;
  chat?: UseACSChatUIReturn; // Optional ACS chat instance
}

// Map skills to icons for visual interest
const skillIcons: Record<string, React.ElementType> = {
  'coding': Code,
  'design': Palette,
  'math': Calculator,
  'research': Globe,
  'writing': BookOpen,
  'business': Briefcase,
  'general': MessageSquare,
};

// Agent card component with fixed dimensions
const AgentCard = ({ 
  agent, 
  isSelected, 
  onClick,
  isPopular = false 
}: { 
  agent: AgentConfigTS;
  isSelected: boolean;
  onClick: () => void;
  isPopular?: boolean;
}) => {
  // Get primary skill icon
  const primarySkill = agent.agent.metadata?.skills?.[0]?.toLowerCase() || 'general';
  const IconComponent = Object.entries(skillIcons).find(([key]) => 
    primarySkill.includes(key)
  )?.[1] || MessageSquare;

  return (
    <motion.button
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative w-full h-[120px] p-4 rounded-2xl border transition-all duration-200",
        "flex items-center gap-4 text-left overflow-hidden",
        isSelected 
          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-white/30 shadow-lg" 
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
      )}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-200 text-[10px] px-2 py-0.5">
            <TrendingUp className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}

      {/* Avatar with skill icon overlay */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5">
          {agent.agent.avatar ? (
            <img
              src={agent.agent.avatar.startsWith('/') || agent.agent.avatar.startsWith('http')
                ? agent.agent.avatar
                : `/assets/avatars/${agent.agent.avatar}`}
              alt={agent.agent.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
          )}
        </div>
        
        {/* Skill icon badge */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-lg border border-white/20 flex items-center justify-center">
          <IconComponent className="w-3.5 h-3.5 text-white/80" />
        </div>
      </div>

      {/* Content - Fixed height container */}
      <div className="flex-1 min-w-0 h-full flex flex-col justify-center">
        <h3 className="font-medium text-white text-base mb-1 truncate">
          {agent.agent.name}
        </h3>
        <p className="text-sm text-white/60 line-clamp-2 leading-tight">
          {agent.agent.description}
        </p>
        
        {/* Agent skills display */}
        {agent.agent.metadata?.skills && agent.agent.metadata.skills.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {agent.agent.metadata.skills.slice(0, 2).map((skill, index) => (
              <span key={index} className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>


    </motion.button>
  );
};

export function NewChatModal({ isVisible, onClose, onCreateChat, chat }: NewChatModalProps) {
  const navigate = useNavigate();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showAllAgents, setShowAllAgents] = useState(false);
  
  // Get all agents from ACS (use provided chat instance or fallback to default)
  const allAgents = useMemo(() => {
    if (chat?.agentConfigs && chat.agentConfigs.length > 0) {
      return chat.agentConfigs;
    }
    
    // Fallback for debug mode or when no configs are loaded
    return [{
      id: 'general',
      name: 'General Assistant',
      description: 'A helpful AI assistant for general tasks',
      agent: {
        name: 'General Assistant',
        description: 'A helpful AI assistant for general tasks',
        model: 'gpt-4',
        tools: [],
        systemPrompt: 'You are a helpful AI assistant.',
        metadata: {
          skills: ['general', 'conversation']
        }
      },
      ai_config: {
        model: 'gpt-4',
        model_id: 'gpt-4',
        provider_name: 'openai',
        temperature: 0.7,
        max_tokens: 2000
      },
      tool_groups: [],
      userId: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
      publisher: 'System',
      publisherId: 'system'
    }];
  }, [chat?.agentConfigs]);

  // Sort agents alphabetically since we don't have usage data
  const sortedAgents = useMemo(() => {
    return [...allAgents].sort((a, b) => {
      return a.agent.name.localeCompare(b.agent.name);
    });
  }, [allAgents]);

  // Get recommended agents (top 6)
  const recommendedAgents = sortedAgents.slice(0, 6);

  // Initialize with most popular agent
  useEffect(() => {
    if (isVisible && sortedAgents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(sortedAgents[0].id);
    }
  }, [sortedAgents, isVisible, selectedAgentId]);

  // Filter agents based on search
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return sortedAgents;
    
    const query = searchQuery.toLowerCase();
    return sortedAgents.filter(agent => 
      agent.agent.name.toLowerCase().includes(query) ||
      agent.agent.description.toLowerCase().includes(query) ||
      agent.agent.metadata?.skills?.some(skill => skill.toLowerCase().includes(query))
    );
  }, [sortedAgents, searchQuery]);

  // Get selected agent from ACS agent configs
  const selectedAgent = selectedAgentId ? allAgents.find(agent => agent.id === selectedAgentId) : null;

  // Handle starting conversation with ACS
  const handleStartChat = async () => {
    if (!selectedAgent || isCreating || chat?.isLoading) return;

    setIsCreating(true);
    try {
      if (onCreateChat) {
        // Use the provided onCreateChat callback
        await onCreateChat(undefined, selectedAgent.id);
      } else if (chat) {
        // Fallback to direct chat instance usage
        const sessionId = await chat.createSession(undefined, selectedAgent.id);

        if (sessionId) {
          // Navigate to the new session
          await chat.navigateToSession(sessionId);
          
          // Send initial message if provided
          if (userInput.trim()) {
            await chat.sendMessage(userInput.trim());
          }
          
          toast.success('New chat created successfully');
        } else {
          toast.error('Failed to create new chat session');
        }
      } else {
        toast.error('No chat system available');
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isVisible) {
      setUserInput('');
      setSearchQuery('');
      setShowAllAgents(false);
    }
  }, [isVisible]);

  return (
    <Dialog open={isVisible} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 bg-black/95 border-white/10 overflow-hidden">
        <div className="flex h-full">
          {/* Left Panel - Agent Selection */}
          <div className="w-[55%] border-r border-white/10 flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-light text-white">Choose Your AI Assistant</h2>
                  <p className="text-sm text-white/60 mt-1">Select who you'd like to chat with</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
              
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, skills, or specialty..."
                  className="w-full pl-11 pr-4 py-2.5 bg-white/5 border-white/10 rounded-xl text-white placeholder-white/40 focus:bg-white/10 focus:border-white/20 text-sm"
                />
              </div>
            </div>

            {/* Agent List */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {searchQuery ? (
                  // Search results
                  <div className="space-y-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-4">
                      {filteredAgents.length} results
                    </p>
                    <AnimatePresence mode="popLayout">
                      {filteredAgents.map((agent) => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          isSelected={selectedAgentId === agent.id}
                          onClick={() => setSelectedAgentId(agent.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  // Default view - Recommended + All
                  <>
                    {/* Recommended section */}
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Heart className="w-4 h-4 text-pink-400" />
                        <p className="text-xs text-white/60 uppercase tracking-wider">
                          Recommended for you
                        </p>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {recommendedAgents.map((agent, idx) => (
                            <AgentCard
                              key={agent.id}
                              agent={agent}
                              isSelected={selectedAgentId === agent.id}
                              onClick={() => setSelectedAgentId(agent.id)}
                              isPopular={idx < 3}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Show all toggle */}
                    {sortedAgents.length > 6 && (
                      <div className="text-center py-4">
                        <Button
                          variant="ghost"
                          onClick={() => setShowAllAgents(!showAllAgents)}
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          {showAllAgents ? 'Show Less' : `Show All ${sortedAgents.length} Agents`}
                        </Button>
                      </div>
                    )}

                    {/* All agents */}
                    {showAllAgents && (
                      <div className="mt-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="w-4 h-4 text-blue-400" />
                          <p className="text-xs text-white/60 uppercase tracking-wider">
                            All assistants
                          </p>
                        </div>
                        <div className="space-y-3">
                          <AnimatePresence mode="popLayout">
                            {sortedAgents.slice(6).map((agent) => (
                              <AgentCard
                                key={agent.id}
                                agent={agent}
                                isSelected={selectedAgentId === agent.id}
                                onClick={() => setSelectedAgentId(agent.id)}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Selected Agent Details */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-white/[0.02] to-transparent">
            {selectedAgent ? (
              <div className="flex-1 flex flex-col">
                  {/* Agent header - Fixed height */}
                  <div className="px-8 py-6 border-b border-white/10">
                    <div className="flex items-start gap-5">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 flex-shrink-0">
                        {selectedAgent.agent.avatar ? (
                          <img
                            src={selectedAgent.agent.avatar.startsWith('/') || selectedAgent.agent.avatar.startsWith('http')
                              ? selectedAgent.agent.avatar
                              : `/assets/avatars/${selectedAgent.agent.avatar}`}
                            alt={selectedAgent.agent.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <Brain className="w-10 h-10 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-2xl font-light text-white mb-1">
                          {selectedAgent.agent.name}
                        </h3>
                        <p className="text-white/80 leading-relaxed">
                          {selectedAgent.agent.description}
                        </p>
                        
                        {/* Model badge */}
                        <div className="mt-3">
                          <Badge className="bg-white/10 text-white/70 border-0 text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            {selectedAgent.ai_config.model_id}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills section - Fixed height */}
                  {selectedAgent.agent.metadata?.skills && selectedAgent.agent.metadata.skills.length > 0 && (
                    <div className="px-8 py-4 border-b border-white/10 bg-white/[0.02]">
                      <p className="text-xs text-white/60 uppercase tracking-wider mb-3">
                        Specializes in
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.agent.metadata.skills.map((skill, idx) => {
                          const skillKey = skill.toLowerCase();
                          const IconComponent = Object.entries(skillIcons).find(([key]) => 
                            skillKey.includes(key)
                          )?.[1] || MessageSquare;
                          
                          return (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-white/10 text-white/80 border-0 px-3 py-1.5 flex items-center gap-1.5"
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                              {skill}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Message input - Flexible height */}
                  <div className="flex-1 p-8 flex flex-col">
                    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
                      <label className="text-sm text-white/60 mb-3">
                        How can {selectedAgent.agent.name} help you today?
                      </label>
                      <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={`Ask about ${selectedAgent.agent.metadata?.skills?.[0] || 'anything'}...`}
                        className="flex-1 w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 resize-none focus:bg-white/10 focus:border-white/20 min-h-[120px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.metaKey) {
                            handleStartChat();
                          }
                        }}
                      />
                      
                      <div className="mt-6 flex items-center justify-between">
                        <p className="text-xs text-white/40">
                          Press ⌘+Enter to start
                        </p>
                        
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={onClose}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleStartChat}
                            disabled={!selectedAgent || isCreating}
                            className="bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed px-6"
                          >
                            {isCreating ? (
                              <span className="flex items-center gap-2">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-4 h-4 rounded-full border-2 border-black border-t-transparent"
                                />
                                Starting...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                Start Chat
                                <ArrowRight className="w-4 h-4" />
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            ) : (
              // Empty state
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">Select an assistant to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewChatModal;