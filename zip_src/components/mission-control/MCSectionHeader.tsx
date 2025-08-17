/**
 * Mission Control Section Header Component
 * Collapsible header with icon, title, count, and chevron
 */

import React from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MCSectionHeaderProps {
  title: string;
  count: number;
  icon: LucideIcon;
  isCollapsed: boolean;
  onToggle: () => void;
  color?: 'yellow' | 'blue' | 'green';
}

export const MCSectionHeader: React.FC<MCSectionHeaderProps> = ({
  title,
  count,
  icon: Icon,
  isCollapsed,
  onToggle,
  color = 'blue'
}) => {
  const colorStyles = {
    yellow: {
      icon: 'text-yellow-500/40',
      hover: 'hover:bg-yellow-500/5 hover:border-yellow-500/10'
    },
    blue: {
      icon: 'text-blue-500/40', 
      hover: 'hover:bg-blue-500/5 hover:border-blue-500/10'
    },
    green: {
      icon: 'text-emerald-500/40',
      hover: 'hover:bg-emerald-500/5 hover:border-emerald-500/10'
    }
  };

  const styles = colorStyles[color];

  return (
    <button
      onClick={onToggle}
      className={`
        w-full px-6 py-3 flex items-center justify-between
        text-left transition-all duration-200
        bg-white/[0.02] border border-white/[0.06]
        ${styles.hover}
        rounded-lg mb-2
        group
      `}
      role="button"
      aria-expanded={!isCollapsed}
      aria-controls={`section-${title.toLowerCase()}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${styles.icon} transition-colors duration-200`} />
        <h3 className="text-sm font-medium text-white/70 group-hover:text-white/80 transition-colors duration-200">
          {title}
        </h3>
        <span className="text-xs text-white/40 bg-white/[0.08] px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      
      <motion.div
        animate={{ rotate: isCollapsed ? -90 : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors duration-200" />
      </motion.div>
    </button>
  );
};