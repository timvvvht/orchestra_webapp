/**
 * Mission Control Section Component
 * Collapsible section with header and animated content
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MCSectionHeader } from './MCSectionHeader';

interface MCSectionProps {
  name: string;
  title: string;
  count: number;
  icon: LucideIcon;
  isCollapsed: boolean;
  onToggle: () => void;
  color?: 'yellow' | 'blue' | 'green';
  children: React.ReactNode;
  className?: string;
}

export const MCSection: React.FC<MCSectionProps> = ({
  name,
  title,
  count,
  icon,
  isCollapsed,
  onToggle,
  color = 'blue',
  children,
  className = ''
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      <MCSectionHeader
        title={title}
        count={count}
        icon={icon}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
        color={color}
      />
      
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            id={`section-${name}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              duration: 0.3, 
              ease: 'easeInOut',
              opacity: { duration: 0.2 }
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-6 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};