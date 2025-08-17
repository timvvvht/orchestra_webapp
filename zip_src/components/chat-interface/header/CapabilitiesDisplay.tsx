import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Wrench, Code, Search, Database, Globe, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tool {
  name: string;
  description?: string;
  category?: string;
}

interface CapabilitiesDisplayProps {
  // Data
  tools: Tool[];
  agentName?: string;
  
  // Display options
  showCount?: boolean;
  expandable?: boolean;
  maxVisible?: number;
  
  // Styling
  className?: string;
}

/**
 * CapabilitiesDisplay - Shows agent tools and capabilities with progressive disclosure
 * 
 * Features:
 * - Tool count display
 * - Expandable tool list
 * - Tool categorization
 * - Icons for different tool types
 * - Progressive disclosure for large tool lists
 */
export const CapabilitiesDisplay: React.FC<CapabilitiesDisplayProps> = ({
  tools,
  agentName,
  showCount = true,
  expandable = true,
  maxVisible = 5,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get icon for tool based on name/category
  const getToolIcon = (tool: Tool) => {
    const name = tool.name.toLowerCase();
    const category = tool.category?.toLowerCase();
    
    if (name.includes('code') || name.includes('python') || name.includes('javascript')) {
      return Code;
    }
    if (name.includes('search') || name.includes('web') || name.includes('google')) {
      return Search;
    }
    if (name.includes('database') || name.includes('sql') || name.includes('query')) {
      return Database;
    }
    if (name.includes('api') || name.includes('http') || name.includes('request')) {
      return Globe;
    }
    if (name.includes('ai') || name.includes('agent') || name.includes('spawn')) {
      return Zap;
    }
    return Wrench;
  };
  
  const visibleTools = isExpanded ? tools : tools.slice(0, maxVisible);
  const hasMore = tools.length > maxVisible;
  
  if (tools.length === 0) {
    return null;
  }
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Tool Count Badge */}
      {showCount && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.04] rounded-full">
          <Wrench className="w-3 h-3 text-white/40" />
          <span className="text-xs text-white/60 font-mono">
            {tools.length} tool{tools.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      
      {/* Expandable Tool List */}
      {expandable && hasMore && (
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full",
              "bg-white/[0.04] hover:bg-white/[0.06]",
              "border border-white/[0.04] hover:border-white/[0.08]",
              "transition-all"
            )}
          >
            <span className="text-xs text-white/60">
              {isExpanded ? 'Hide' : 'Show'} tools
            </span>
            <ChevronDown className={cn(
              "w-3 h-3 text-white/40 transition-transform",
              isExpanded && "rotate-180"
            )} />
          </motion.button>
          
          {/* Tool List Dropdown */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute top-full right-0 mt-2 w-72 z-50",
                  "bg-black/95 backdrop-blur-xl border border-white/[0.08]",
                  "rounded-xl shadow-2xl overflow-hidden"
                )}
              >
                <div className="p-3">
                  <div className="text-xs text-white/50 font-medium mb-2">
                    {agentName ? `${agentName} Tools` : 'Available Tools'}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {tools.map((tool, index) => {
                      const IconComponent = getToolIcon(tool);
                      return (
                        <div
                          key={`${tool.name}-${index}`}
                          className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <IconComponent className="w-3 h-3 text-white/40 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white/80 truncate">
                              {tool.name}
                            </div>
                            {tool.description && (
                              <div className="text-xs text-white/50 mt-0.5 line-clamp-2">
                                {tool.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default CapabilitiesDisplay;