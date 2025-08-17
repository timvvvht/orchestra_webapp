import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RunicPulseIndicatorProps {
  className?: string;
  agentName?: string;
  showThinkingState?: boolean;
}

const RunicPulseIndicator: React.FC<RunicPulseIndicatorProps> = ({ 
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

  // Generate runic-like symbols
  const runicSymbols = [
    "M 10 5 L 10 25 M 10 10 L 15 15 M 10 20 L 15 15", // ᚠ-like
    "M 5 10 L 15 10 M 5 20 L 15 20 M 10 5 L 10 25", // ᚻ-like
    "M 5 5 L 15 25 M 15 5 L 5 25", // ᚷ-like
    "M 10 5 L 10 25 M 5 10 L 15 10", // ᛏ-like
    "M 5 5 L 5 25 L 15 15 L 5 5", // ᚱ-like
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("relative w-24 h-8", className)}
    >
      {/* Runic symbol container */}
      <div className="absolute inset-0 flex items-center justify-center gap-2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="relative w-6 h-8"
            animate={{
              opacity: [0.2, 1, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          >
            {/* Runic glyph */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 20 30">
              <motion.path
                d={runicSymbols[i % runicSymbols.length]}
                stroke={showThinkingState ? "rgba(147, 51, 234, 0.6)" : "rgba(0, 119, 237, 0.5)"}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                animate={{
                  pathLength: [0, 1, 1, 0],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  times: [0, 0.3, 0.7, 1],
                  ease: "easeInOut"
                }}
              />
              
              {/* Glow effect */}
              <motion.path
                d={runicSymbols[i % runicSymbols.length]}
                stroke={showThinkingState ? "rgba(147, 51, 234, 0.3)" : "rgba(0, 119, 237, 0.2)"}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                filter="blur(3px)"
                animate={{
                  pathLength: [0, 1, 1, 0],
                  opacity: [0, 0.5, 0.5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  times: [0, 0.3, 0.7, 1],
                  ease: "easeInOut"
                }}
              />
            </svg>

            {/* Energy pulse */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: showThinkingState
                  ? 'radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(0, 119, 237, 0.15) 0%, transparent 70%)',
              }}
              animate={{
                scale: [0.5, 1.5, 0.5],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeOut"
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
            ? 'linear-gradient(90deg, transparent 0%, rgba(147, 51, 234, 0.1) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(0, 119, 237, 0.08) 50%, transparent 100%)',
          filter: 'blur(8px)'
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scaleX: [0.8, 1.1, 0.8],
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
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: showThinkingState ? 'rgba(219, 39, 119, 0.6)' : 'rgba(0, 212, 255, 0.4)',
              boxShadow: showThinkingState 
                ? '0 0 4px rgba(219, 39, 119, 0.4)' 
                : '0 0 4px rgba(0, 212, 255, 0.3)'
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default RunicPulseIndicator;