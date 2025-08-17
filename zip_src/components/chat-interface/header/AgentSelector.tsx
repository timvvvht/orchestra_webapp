import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentConfigTS } from '@/types/agentConfig';

interface AgentSelectorProps {
  // Data
  currentAgentConfigId: string | null;
  agentConfigsArray: AgentConfigTS[];
  isLoading: boolean;
  
  // Display
  displayName: string;
  
  // State
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  
  // Actions
  onAgentSelect: (agent: AgentConfigTS) => void;
  
  // Styling
  className?: string;
}

/**
 * AgentSelector - Dropdown component for selecting AI agent configurations
 * 
 * Features:
 * - Displays current agent with loading states
 * - Dropdown with available agents
 * - Visual indicators for selected agent
 * - Smooth animations
 * - Click outside to close
 */
export const AgentSelector: React.FC<AgentSelectorProps> = ({
  currentAgentConfigId,
  agentConfigsArray,
  isLoading,
  displayName,
  isOpen,
  onToggle,
  onClose,
  onAgentSelect,
  className
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);
  
  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Agent Selector Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-white/[0.06] hover:bg-white/[0.1]",
          "border border-white/[0.08] hover:border-white/[0.12]",
          "transition-all group",
          isOpen && "bg-white/[0.1] border-white/[0.15]"
        )}
      >
        <div className={cn(
          "w-2 h-2 rounded-full",
          isLoading ? "bg-white/40 animate-spin" : "bg-[#007AFF] animate-pulse"
        )} />
        <span className="text-[13px] font-medium text-white/90 truncate max-w-[120px]">
          {displayName}
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 text-white/40 group-hover:text-white/60 transition-all",
          isOpen && "rotate-180 text-white/60"
        )} />
      </motion.button>

      {/* Agent Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-0 mt-2 w-64 z-50",
              "bg-black/95 backdrop-blur-xl border border-white/[0.08]",
              "rounded-xl shadow-2xl overflow-hidden"
            )}
          >
            <div className="p-2">
              <div className="text-xs text-white/50 px-3 py-2 font-medium">
                Available Agents
              </div>
              <div className="max-h-64 overflow-y-auto">
                {isLoading ? (
                  <div className="px-3 py-2 text-sm text-white/50">
                    Loading agents...
                  </div>
                ) : agentConfigsArray.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-white/50">
                    No agents available
                  </div>
                ) : (
                  agentConfigsArray.map((agent) => (
                    <motion.button
                      key={agent.id}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      onClick={() => onAgentSelect(agent)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
                        "text-left transition-colors",
                        currentAgentConfigId === agent.id && "bg-white/[0.08]"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        currentAgentConfigId === agent.id ? "bg-[#007AFF]" : "bg-white/20"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white/90 truncate">
                          {agent.name}
                        </div>
                        <div className="text-xs text-white/50 truncate">
                          {agent.description || `${agent.ai_config?.model_id || 'AI'} • ${agent.ai_config?.provider_name || 'Assistant'}`}
                        </div>
                      </div>
                      {currentAgentConfigId === agent.id && (
                        <Check className="w-3 h-3 text-[#007AFF]" />
                      )}
                    </motion.button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentSelector;