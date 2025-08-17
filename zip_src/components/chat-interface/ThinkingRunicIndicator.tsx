import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThinkingRunicIndicatorProps {
  className?: string;
  agentName?: string;
  showThinkingState?: boolean;
}

const ThinkingRunicIndicator: React.FC<ThinkingRunicIndicatorProps> = ({ 
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

  // Letter paths - simple block-style outlines
  const letterPaths = [
    "M 5 5 L 15 5 M 10 5 L 10 25", // T
    "M 5 5 L 5 25 M 15 5 L 15 25 M 5 15 L 15 15", // H
    "M 10 5 L 10 25", // I
    "M 5 5 L 5 25 M 5 5 L 15 5 M 5 15 L 12 15 M 5 25 L 15 25", // N
    "M 5 5 L 5 25 M 15 5 L 15 25 M 5 15 L 15 15 M 5 25 L 15 25", // K
    "M 10 5 L 10 25", // I
    "M 5 5 L 5 25 M 5 5 L 15 5 M 5 15 L 12 15 M 5 25 L 15 25", // N
    "M 5 5 L 5 25 M 5 5 L 15 5 M 5 15 L 12 15 M 5 20 L 15 25" // G
  ];

  const letters = ['T', 'H', 'I', 'N', 'K', 'I', 'N', 'G'];

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("relative w-64 h-8", className)}
    >
      {/* Letter container */}
      <div className="absolute inset-0 flex items-center justify-center gap-1">
        {letters.map((letter, i) => (
          <motion.div
            key={`${letter}-${i}`}
            className="relative w-6 h-8"
            animate={{
              opacity: [0.2, 1, 0.8, 1, 0.2],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut"
            }}
          >
            {/* Letter glyph */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 20 30">
              <motion.path
                d={letterPaths[i]}
                stroke={showThinkingState ? "rgba(147, 51, 234, 0.7)" : "rgba(0, 119, 237, 0.6)"}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{
                  pathLength: [0, 1, 1, 1, 0],
                  opacity: [0, 1, 1, 1, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  delay: i * 0.25,
                  times: [0, 0.2, 0.4, 0.8, 1],
                  ease: "easeInOut"
                }}
              />
              
              {/* Glow effect */}
              <motion.path
                d={letterPaths[i]}
                stroke={showThinkingState ? "rgba(147, 51, 234, 0.4)" : "rgba(0, 119, 237, 0.3)"}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="blur(3px)"
                animate={{
                  pathLength: [0, 1, 1, 1, 0],
                  opacity: [0, 0.6, 0.8, 0.6, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  delay: i * 0.25,
                  times: [0, 0.2, 0.4, 0.8, 1],
                  ease: "easeInOut"
                }}
              />
            </svg>

            {/* Energy pulse around each letter */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: showThinkingState
                  ? 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(0, 119, 237, 0.1) 0%, transparent 70%)',
              }}
              animate={{
                scale: [0.5, 1.5, 1.2, 1.5, 0.5],
                opacity: [0, 0.5, 0.7, 0.5, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "easeOut"
              }}
            />

            {/* Letter label for accessibility */}
            <span className="sr-only">{letter}</span>
          </motion.div>
        ))}
      </div>

      {/* Connecting energy field */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: showThinkingState
            ? 'linear-gradient(90deg, transparent 0%, rgba(147, 51, 234, 0.08) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(0, 119, 237, 0.06) 50%, transparent 100%)',
          filter: 'blur(8px)'
        }}
        animate={{
          opacity: [0.3, 0.6, 0.8, 0.6, 0.3],
          scaleX: [0.8, 1.1, 1.2, 1.1, 0.8],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Mystical particles */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${10 + i * 10}%`,
              top: `${30 + Math.sin(i) * 40}%`,
              background: showThinkingState ? 'rgba(219, 39, 119, 0.6)' : 'rgba(0, 212, 255, 0.4)',
              boxShadow: showThinkingState 
                ? '0 0 4px rgba(219, 39, 119, 0.4)' 
                : '0 0 4px rgba(0, 212, 255, 0.3)'
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Word completion glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: showThinkingState
            ? 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.1) 0%, transparent 80%)'
            : 'radial-gradient(ellipse at center, rgba(0, 119, 237, 0.08) 0%, transparent 80%)',
          filter: 'blur(12px)'
        }}
        animate={{
          opacity: [0, 0, 0.5, 1, 0.5, 0],
          scale: [0.9, 0.9, 1.1, 1.3, 1.1, 0.9],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          times: [0, 0.4, 0.6, 0.8, 0.9, 1],
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
};

export default ThinkingRunicIndicator;