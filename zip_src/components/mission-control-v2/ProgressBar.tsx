import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  total?: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  glowColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  total = 100,
  showPercentage = true,
  size = 'md',
  className,
  glowColor = 'rgba(16,185,129,0.7)'
}) => {
  const percentage = Math.round((progress / total) * 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2'
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn(
        'relative flex-1 overflow-hidden rounded-full',
        sizeClasses[size]
      )}>
        {/* Background with subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-white/[0.04] backdrop-blur-sm" />
        
        {/* Progress fill with multiple layers */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            duration: 0.8, 
            ease: [0.23, 1, 0.32, 1]
          }}
        >
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/40 via-emerald-400/60 to-emerald-400/80" />
          
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Leading edge glow */}
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-emerald-300/50 blur-sm" />
        </motion.div>
        
        {/* Milestone markers */}
        {[25, 50, 75].map(milestone => (
          <div
            key={milestone}
            className="absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>

      {/* Percentage display */}
      {showPercentage && (
        <span className={cn(
          'font-mono text-xs tabular-nums',
          'text-white/70',
          'min-w-[3ch]' // Ensures consistent width
        )}>
          {percentage}%
        </span>
      )}
    </div>
  );
};