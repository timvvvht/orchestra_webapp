import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Database, 
  Zap, 
  Clock, 
  User, 
  Settings, 
  Code,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentConfigTS } from '@/types/agentConfig';
import type { ModelDefinition } from '@/utils/modelDefinitions';

interface DebugPanelProps {
  // Session data
  sessionId: string;
  sessionName?: string;
  messageCount?: number;
  duration?: string;
  
  // Agent/Model data
  currentAgent?: AgentConfigTS;
  currentModel?: ModelDefinition;
  selectedModelId?: string | null;
  selectedAgentConfigId?: string | null;
  
  // Selection context data
  hasSelections?: boolean;
  effectiveModelId?: string | null;
  effectiveAgentConfigId?: string | null;
  
  // User data
  userId?: string;
  
  // State
  isOpen: boolean;
  onToggle: () => void;
  
  // Styling
  className?: string;
}

/**
 * DebugPanel - Comprehensive debugging information panel
 * 
 * Features:
 * - Session information
 * - Agent and model details
 * - Selection context state
 * - User information
 * - Copy-to-clipboard functionality
 * - Collapsible sections
 * - JSON data display
 */
export const DebugPanel: React.FC<DebugPanelProps> = ({
  sessionId,
  sessionName,
  messageCount,
  duration,
  currentAgent,
  currentModel,
  selectedModelId,
  selectedAgentConfigId,
  hasSelections,
  effectiveModelId,
  effectiveAgentConfigId,
  userId,
  isOpen,
  onToggle,
  className
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const formatJSON = (obj: any) => JSON.stringify(obj, null, 2);
  
  const debugSections = [
    {
      id: 'session',
      title: 'Session Info',
      icon: Database,
      data: {
        sessionId,
        sessionName,
        messageCount,
        duration,
        userId
      }
    },
    {
      id: 'agent',
      title: 'Current Agent',
      icon: Zap,
      data: currentAgent
    },
    {
      id: 'model',
      title: 'Current Model',
      icon: Settings,
      data: currentModel
    },
    {
      id: 'selections',
      title: 'Selection Context',
      icon: Code,
      data: {
        selectedModelId,
        selectedAgentConfigId,
        hasSelections,
        effectiveModelId,
        effectiveAgentConfigId
      }
    }
  ];
  
  return (
    <div className={cn("relative", className)}>
      {/* Debug Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-white/[0.04] hover:bg-white/[0.06]",
          "border border-white/[0.04] hover:border-white/[0.08]",
          "transition-all",
          isOpen && "bg-white/[0.06] border-white/[0.08]"
        )}
      >
        <Code className="w-3 h-3 text-white/40" />
        <span className="text-xs text-white/60">Debug</span>
        <ChevronDown className={cn(
          "w-3 h-3 text-white/40 transition-transform",
          isOpen && "rotate-180"
        )} />
      </motion.button>
      
      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full right-0 mt-2 w-96 z-50",
              "bg-black/95 backdrop-blur-xl border border-white/[0.08]",
              "rounded-xl shadow-2xl overflow-hidden"
            )}
          >
            <div className="p-4">
              <div className="text-sm font-medium text-white/90 mb-3">
                Debug Information
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {debugSections.map((section) => {
                  const IconComponent = section.icon;
                  const isExpanded = expandedSections.has(section.id);
                  const jsonData = formatJSON(section.data);
                  
                  return (
                    <div key={section.id} className="border border-white/[0.06] rounded-lg">
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-white/40" />
                          <span className="text-sm text-white/80">{section.title}</span>
                        </div>
                        <ChevronDown className={cn(
                          "w-3 h-3 text-white/40 transition-transform",
                          isExpanded && "rotate-180"
                        )} />
                      </button>
                      
                      {/* Section Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 pt-0 border-t border-white/[0.06]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-white/50">JSON Data</span>
                                <button
                                  onClick={() => copyToClipboard(jsonData, section.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.06] transition-colors"
                                >
                                  {copiedSection === section.id ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-white/40" />
                                  )}
                                  <span className="text-xs text-white/60">
                                    {copiedSection === section.id ? 'Copied!' : 'Copy'}
                                  </span>
                                </button>
                              </div>
                              <pre className="text-xs text-white/70 bg-white/[0.02] p-2 rounded overflow-x-auto font-mono">
                                {jsonData}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebugPanel;