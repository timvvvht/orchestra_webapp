import React, { useState } from 'react';
import { ChevronDown, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AgentSelectionModal } from './AgentSelectionModal';
import type { AgentConfigTS } from '@/types/agentConfig';

interface AgentSelectorButtonProps {
  currentAgentId?: string;
  onAgentSelect: (agent: AgentConfigTS) => void;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

/**
 * AgentSelectorButton - A clean button that opens the agent selection modal
 * 
 * Features:
 * - Shows current agent with avatar and name
 * - Clean, minimal design that doesn't clutter the UI
 * - Opens beautiful modal for agent selection
 * - Multiple variants for different contexts
 */
export function AgentSelectorButton({
  currentAgentId,
  onAgentSelect,
  variant = 'default',
  className = ''
}: AgentSelectorButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { agentConfigs } = useAgentConfigStore();
  const { settings } = useSettingsStore();

  // Get current agent or default
  const defaultAgentId = settings.defaultAgentId || 'fac79f2c-b312-4ea9-a88a-751ae2be9169';
  const displayAgentId = currentAgentId || defaultAgentId;
  const currentAgent = agentConfigs[displayAgentId];

  // Helper function to get agent avatar
  const getAgentAvatar = (config: AgentConfigTS): string => {
    if (!config?.agent.avatar) return '/assets/avatars/default_avatar.png';
    
    if (config.agent.avatar.startsWith('/') || config.agent.avatar.startsWith('http')) {
      return config.agent.avatar;
    }
    
    return `/assets/avatars/${config.agent.avatar}`;
  };

  // Handle agent selection from modal
  const handleAgentSelect = (agent: AgentConfigTS) => {
    onAgentSelect(agent);
    setIsModalOpen(false);
  };

  // Render variants
  if (variant === 'minimal') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className={`h-8 w-8 p-0 ${className}`}
        >
          {currentAgent?.agent.avatar ? (
            <img
              src={getAgentAvatar(currentAgent)}
              alt={currentAgent.agent.name}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </Button>
        
        <AgentSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAgentSelect={handleAgentSelect}
          currentAgentId={currentAgentId}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className={`h-10 px-3 gap-2 bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 ${className}`}
        >
          {currentAgent?.agent.avatar ? (
            <img
              src={getAgentAvatar(currentAgent)}
              alt={currentAgent.agent.name}
              className="w-6 h-6 rounded-lg object-cover border border-slate-200/60 dark:border-slate-700/60"
            />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
              <Bot className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            </div>
          )}
          <span className="font-medium text-sm truncate max-w-24 text-slate-900 dark:text-slate-100">
            {currentAgent?.agent.name || 'Select Agent'}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
        </Button>
        
        <AgentSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAgentSelect={handleAgentSelect}
          currentAgentId={currentAgentId}
        />
      </>
    );
  }

  // Default variant
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsModalOpen(true)}
        className={`h-auto p-4 gap-3 min-w-64 justify-start bg-gradient-to-r from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-slate-500/5 dark:hover:shadow-slate-900/20 transition-all duration-300 ${className}`}
      >
        <div className="flex items-center gap-3 flex-1">
          {currentAgent?.agent.avatar ? (
            <img
              src={getAgentAvatar(currentAgent)}
              alt={currentAgent.agent.name}
              className="w-9 h-9 rounded-xl object-cover border-2 border-slate-200/60 dark:border-slate-700/60 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          )}
          <div className="text-left flex-1 min-w-0">
            <div className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">
              {currentAgent?.agent.name || 'Select Agent'}
            </div>
            {currentAgent && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentAgent.ai_config.model_id}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
        </div>
      </Button>
      
      <AgentSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAgentSelect={handleAgentSelect}
        currentAgentId={currentAgentId}
      />
    </>
  );
}

export default AgentSelectorButton;