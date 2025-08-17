import React, { useState, useEffect, useRef } from 'react';
import { Command, Settings, ChevronDown, Plus, Code2, FolderOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useChatUI } from '@/context/ChatUIContext';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AgentConfigTS } from '@/types/agentConfig';
import type { ChatSession, SessionMeta } from '@/types/chatTypes';

interface ChatHeaderProps {
  sessionId?: string | null;
  onNewChat?: () => void;
  onOpenAgentSelector?: () => void;
  className?: string;
  // Coding mode props
  isCodingMode?: boolean;
  onToggleCodingMode?: (active: boolean) => void;
  directoryContext?: string;
  onDirectoryContextChange?: (path: string) => void;
}

/**
 * ChatHeaderStatic - Static version without framer-motion animations
 * Used for ACS chat to avoid framer-motion dependency
 */
export function ChatHeaderStatic({
  sessionId,
  onNewChat,
  onOpenAgentSelector,
  className = '',
  isCodingMode = false,
  onToggleCodingMode,
  directoryContext = '',
  onDirectoryContextChange
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const { agentConfigs } = useAgentConfigStore();
  const chat = useChatUI();
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [sessionDuration, setSessionDuration] = useState('');
  const [showDirectoryInput, setShowDirectoryInput] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Find current session from the new hook context with safety checks
  const currentSession: ChatSession | null = sessionId ? 
    (Array.isArray(chat?.sessions) ? chat.sessions.find(s => s.id === sessionId) : null) || chat?.currentSession || null : null;

  // Find current agent config
  const currentAgentConfig: AgentConfigTS | null = currentSession?.agent_config_id ? 
    agentConfigs[currentSession.agent_config_id] || null : null;

  // Calculate session duration
  useEffect(() => {
    if (!currentSession?.createdAt) return;

    const updateDuration = () => {
      const now = Date.now();
      const start = currentSession.createdAt;
      const diffMs = now - start;
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setSessionDuration(`${hours}h ${minutes}m`);
      } else {
        setSessionDuration(`${minutes}m`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [currentSession?.createdAt]);

  // Handle directory selection
  const handleDirectorySelect = async () => {
    try {
      // This would integrate with file system APIs
      console.log('Directory selection would be implemented here');
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  // Early return if no session
  if (!currentSession || !currentAgentConfig) {
    return (
      <header className={cn("relative", className)}>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-transparent" />
        <div className="relative px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-white/60">No active session</div>
            {onNewChat && (
              <Button onClick={onNewChat} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  }

  const model = currentSession.model || currentAgentConfig?.ai_config?.model_id || 'Unknown Model';

  return (
    <header
      ref={headerRef}
      className={cn("relative", className)}
    >
      {/* Invisible backdrop for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-transparent" />
      
      <div className="relative px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Primary Information - What matters most */}
          <div className="flex items-center gap-4">
            {/* Agent Identity - Immediate recognition */}
            <button
              onClick={() => setShowCapabilities(!showCapabilities)}
              className="flex items-center gap-3 group hover:scale-[1.02] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Command className="h-5 w-5 text-white" />
              </div>
              
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-white text-lg leading-tight">
                    {currentAgentConfig.agent.name}
                  </h1>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-white/60 transition-transform",
                    showCapabilities && "rotate-180"
                  )} />
                </div>
                <p className="text-sm text-white/60 leading-tight">
                  {model} • {sessionDuration}
                </p>
              </div>
            </button>
          </div>

          {/* Secondary Actions - Available but not prominent */}
          <div className="flex items-center gap-3">
            {/* Coding Mode Toggle */}
            {onToggleCodingMode && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <Code2 className="h-4 w-4 text-white/60" />
                <span className="text-sm text-white/80">Code</span>
                <Switch
                  checked={isCodingMode}
                  onCheckedChange={onToggleCodingMode}
                  size="sm"
                />
              </div>
            )}

            {/* Directory Context */}
            {isCodingMode && (
              <div className="flex items-center gap-2">
                {showDirectoryInput ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={directoryContext}
                      onChange={(e) => onDirectoryContextChange?.(e.target.value)}
                      placeholder="/path/to/project"
                      className="w-48 h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDirectoryInput(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDirectoryInput(true)}
                    className="text-white/60 hover:text-white"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {directoryContext || 'Set Directory'}
                  </Button>
                )}
              </div>
            )}

            {/* New Chat */}
            {onNewChat && (
              <Button onClick={onNewChat} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            )}

            {/* Settings */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/settings')}
              className="text-white/60 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expandable Capabilities Section */}
        {showCapabilities && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-white/90 mb-2">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {currentAgentConfig.tool_groups?.flatMap(group => 
                    group.tools.map((tool, index) => (
                      <span
                        key={`${group.name}-${tool.name}-${index}`}
                        className="px-2 py-1 text-xs rounded-md bg-white/10 text-white/70"
                      >
                        {tool.name}
                      </span>
                    ))
                  ) || (
                    <span className="text-xs text-white/50">No tools configured</span>
                  )}
                </div>
              </div>
              
              {currentAgentConfig.agent.description && (
                <div>
                  <h3 className="text-sm font-medium text-white/90 mb-2">Description</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {currentAgentConfig.agent.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default ChatHeaderStatic;