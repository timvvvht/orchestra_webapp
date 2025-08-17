import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useMissionControlStore, CollapsedGroups } from '@/stores/missionControlStore';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusOrb } from './StatusOrb';

interface AgentGroupProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  isCollapsed: boolean;
  groupKey: keyof CollapsedGroups;
  children: React.ReactNode;
}

const AgentGroup: React.FC<AgentGroupProps> = ({
  title,
  count,
  icon,
  isCollapsed,
  groupKey,
  children
}) => {
  const { toggleGroupCollapsed } = useMissionControlStore();

  // Get status orb type based on group
  const getGroupOrbStatus = () => {
    if (title === 'Processing') return 'processing';
    if (title === 'Drafts') return 'creating';
    return 'idle';
  };

  return (
    <div className="mb-6">
      {/* Group Header */}
      <div className="px-6 py-2">
        <button
          onClick={() => toggleGroupCollapsed(groupKey)}
          className="group flex items-center gap-2.5 w-full text-left hover:bg-white/[0.02] rounded-lg px-3 py-2 -mx-3 transition-all duration-200"
        >
          {/* Collapse/Expand Icon */}
          <ChevronDown 
            className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`} 
          />
          
          {/* Status Orb or Custom Icon */}
          {icon || <StatusOrb status={getGroupOrbStatus()} size="sm" />}
          
          {/* Title with enhanced typography */}
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">
            {title}
          </h3>
          
          {/* Count with better styling */}
          <span className="text-xs font-mono tabular-nums text-white/40 ml-1">
            {count}
          </span>
          
          {/* Subtle divider line that extends */}
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent ml-3" />
        </button>
      </div>

      {/* Group Content with animation */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentGroup;