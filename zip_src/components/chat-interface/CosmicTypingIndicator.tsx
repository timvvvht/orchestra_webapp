import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import './CosmicTypingIndicator.css';

interface CosmicTypingIndicatorProps {
  className?: string;
  agentName?: string;
  showThinkingState?: boolean;
}

const CosmicTypingIndicator: React.FC<CosmicTypingIndicatorProps> = ({ 
  className, 
  agentName,
  showThinkingState = false 
}) => {
  // Container animation for smooth entrance
  const containerVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.9 
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("relative w-20 h-12", className)}
    >
      {/* Sacred geometry base */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Ethereal triangular prism */}
        <svg className="absolute w-full h-full" viewBox="0 0 80 48">
          {/* Background glow */}
          <defs>
            <linearGradient id="prismGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={showThinkingState ? "rgba(147, 51, 234, 0.8)" : "rgba(0, 119, 237, 0.7)"} />
              <stop offset="50%" stopColor={showThinkingState ? "rgba(219, 39, 119, 0.6)" : "rgba(0, 212, 255, 0.5)"} />
              <stop offset="100%" stopColor={showThinkingState ? "rgba(147, 51, 234, 0.8)" : "rgba(0, 119, 237, 0.7)"} />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Morphing sacred triangles */}
          <motion.path
            d="M 40 8 L 20 40 L 60 40 Z"
            fill="none"
            stroke="url(#prismGradient)"
            strokeWidth="1.5"
            filter="url(#glow)"
            animate={{
              d: [
                "M 40 8 L 20 40 L 60 40 Z",
                "M 40 12 L 25 36 L 55 36 Z",
                "M 40 8 L 20 40 L 60 40 Z"
              ],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Inner triangle */}
          <motion.path
            d="M 40 16 L 28 32 L 52 32 Z"
            fill="none"
            stroke={showThinkingState ? "rgba(147, 51, 234, 0.5)" : "rgba(0, 119, 237, 0.4)"}
            strokeWidth="1"
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.1, 0.8],
            }}
            style={{ transformOrigin: "40px 24px" }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
          
          {/* Central dot */}
          <motion.circle
            cx="40"
            cy="24"
            r="2"
            fill={showThinkingState ? "rgba(147, 51, 234, 0.8)" : "rgba(0, 119, 237, 0.7)"}
            animate={{
              r: [2, 3, 2],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </svg>

        {/* Ethereal energy waves */}
        <div className="absolute inset-0">
          {/* Horizontal wave forms */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`wave-${i}`}
              className="absolute w-full"
              style={{
                height: '1px',
                top: `${35 + i * 8}%`,
                background: showThinkingState
                  ? `linear-gradient(90deg, transparent 0%, rgba(147, 51, 234, ${0.6 - i * 0.15}) 50%, transparent 100%)`
                  : `linear-gradient(90deg, transparent 0%, rgba(0, 119, 237, ${0.5 - i * 0.1}) 50%, transparent 100%)`,
              }}
              animate={{
                scaleX: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: [0.16, 1, 0.3, 1]
              }}
            />
          ))}

          {/* Vertical light beams */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`beam-${i}`}
              className="absolute"
              style={{
                width: '1px',
                height: '100%',
                left: `${20 + i * 15}%`,
                background: showThinkingState
                  ? `linear-gradient(180deg, transparent 0%, rgba(147, 51, 234, 0.4) 50%, transparent 100%)`
                  : `linear-gradient(180deg, transparent 0%, rgba(0, 119, 237, 0.3) 50%, transparent 100%)`,
              }}
              animate={{
                opacity: [0, 0.5, 0],
                scaleY: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 4 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Mystical mist particles */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`mist-${i}`}
              className="absolute"
              style={{
                left: `${10 + i * 10}%`,
                top: '50%',
              }}
              animate={{
                y: [0, -10, 0],
                x: [0, (i % 2 ? 5 : -5), 0],
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 5 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeInOut"
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '2px',
                  background: showThinkingState
                    ? 'linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.7), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(0, 119, 237, 0.6), transparent)',
                  filter: 'blur(3px)',
                  transform: `rotate(${i * 45}deg)`
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Quantum field lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <motion.path
            d="M 10,24 Q 40,20 70,24"
            stroke={showThinkingState ? "rgba(147, 51, 234, 0.4)" : "rgba(0, 119, 237, 0.3)"}
            strokeWidth="1"
            fill="none"
            strokeDasharray="2 4"
            animate={{
              pathLength: [0, 1],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <motion.path
            d="M 10,24 Q 40,28 70,24"
            stroke={showThinkingState ? "rgba(219, 39, 119, 0.4)" : "rgba(0, 212, 255, 0.3)"}
            strokeWidth="1"
            fill="none"
            strokeDasharray="2 4"
            animate={{
              pathLength: [0, 1],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: 3,
              ease: "linear"
            }}
          />
        </svg>

        {/* Ethereal glow overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: showThinkingState
              ? 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.2) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(0, 119, 237, 0.15) 0%, transparent 70%)',
            filter: 'blur(8px)'
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
    </motion.div>
  );
};

export default CosmicTypingIndicator;