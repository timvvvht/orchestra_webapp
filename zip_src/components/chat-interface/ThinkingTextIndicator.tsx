import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThinkingTextIndicatorProps {
  className?: string;
  agentName?: string;
  showThinkingState?: boolean;
}

const ThinkingTextIndicator: React.FC<ThinkingTextIndicatorProps> = ({ 
  className, 
  agentName,
  showThinkingState = false 
}) => {
  // Container animation
  const containerVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.95 
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1]
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: {
        duration: 0.3
      }
    }
  };

  const letters = ['T', 'H', 'I', 'N', 'K', 'I', 'N', 'G'];

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("relative w-64 h-12", className)}
    >
      {/* Letter container */}
      <div className="absolute inset-0 flex items-center justify-center gap-1">
        {letters.map((letter, i) => (
          <motion.div
            key={`${letter}-${i}`}
            className="relative flex items-center justify-center"
            style={{ width: '24px', height: '48px' }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 1, 1, 0.7],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut"
            }}
          >
            {/* Letter text */}
            <motion.span
              className="text-2xl font-light tracking-wide"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
                color: showThinkingState ? 'rgba(147, 51, 234, 0.9)' : 'rgba(0, 119, 237, 0.8)',
                textShadow: showThinkingState 
                  ? '0 0 20px rgba(147, 51, 234, 0.6)' 
                  : '0 0 20px rgba(0, 119, 237, 0.5)',
              }}
              initial={{ 
                opacity: 0,
                scale: 0.5,
                y: 10
              }}
              animate={{
                opacity: [0, 1, 1, 1, 0.8],
                scale: [0.5, 1.1, 1, 1, 1],
                y: [10, 0, 0, 0, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.15,
                times: [0, 0.3, 0.5, 0.8, 1],
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              {letter}
            </motion.span>

            {/* Energy glow behind letter */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: showThinkingState
                  ? 'radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(0, 119, 237, 0.15) 0%, transparent 70%)',
                filter: 'blur(8px)',
              }}
              animate={{
                scale: [0.5, 1.5, 1.2, 1.5, 0.8],
                opacity: [0, 0.6, 0.8, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeOut"
              }}
            />

            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: showThinkingState
                  ? 'linear-gradient(90deg, transparent 0%, rgba(219, 39, 119, 0.4) 50%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(0, 212, 255, 0.3) 50%, transparent 100%)',
                transform: 'translateX(-100%)',
              }}
              animate={{
                transform: ['translateX(-100%)', 'translateX(100%)'],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.15 + 1,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Connecting energy field */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: showThinkingState
            ? 'linear-gradient(90deg, transparent 0%, rgba(147, 51, 234, 0.06) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(0, 119, 237, 0.04) 50%, transparent 100%)',
          filter: 'blur(12px)'
        }}
        animate={{
          opacity: [0.3, 0.7, 1, 0.7, 0.3],
          scaleX: [0.8, 1.1, 1.3, 1.1, 0.8],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Mystical particles */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${15 + i * 12}%`,
              top: `${20 + Math.sin(i * 0.5) * 60}%`,
              background: showThinkingState ? 'rgba(219, 39, 119, 0.7)' : 'rgba(0, 212, 255, 0.5)',
              boxShadow: showThinkingState 
                ? '0 0 6px rgba(219, 39, 119, 0.5)' 
                : '0 0 6px rgba(0, 212, 255, 0.4)'
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Word completion aura */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: showThinkingState
            ? 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.08) 0%, transparent 80%)'
            : 'radial-gradient(ellipse at center, rgba(0, 119, 237, 0.06) 0%, transparent 80%)',
          filter: 'blur(16px)'
        }}
        animate={{
          opacity: [0, 0, 0.4, 0.8, 0.4, 0],
          scale: [0.9, 0.9, 1.1, 1.4, 1.1, 0.9],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          times: [0, 0.3, 0.5, 0.7, 0.9, 1],
          ease: "easeInOut"
        }}
      />

      {/* Subtle scanlines */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.02) 2px, rgba(255, 255, 255, 0.02) 4px)',
          }}
          animate={{
            transform: ['translateY(0px)', 'translateY(8px)'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    </motion.div>
  );
};

export default ThinkingTextIndicator;