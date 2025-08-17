import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NeuralFlowIndicatorProps {
  className?: string;
  agentName?: string;
  showThinkingState?: boolean;
}

const NeuralFlowIndicator: React.FC<NeuralFlowIndicatorProps> = ({ 
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
        duration: 0.7,
        ease: [0.19, 1, 0.22, 1]
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: {
        duration: 0.4
      }
    }
  };

  // Neural node positions
  const nodes = [
    { x: 10, y: 24 },
    { x: 30, y: 12 },
    { x: 30, y: 36 },
    { x: 50, y: 24 },
    { x: 70, y: 12 },
    { x: 70, y: 36 },
    { x: 90, y: 24 },
  ];

  // Connection paths
  const connections = [
    [0, 1], [0, 2], [1, 3], [2, 3],
    [3, 4], [3, 5], [4, 6], [5, 6]
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("relative w-24 h-12", className)}
    >
      {/* Neural network visualization */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 48">
        {/* Synaptic connections */}
        {connections.map(([start, end], i) => (
          <motion.line
            key={`connection-${i}`}
            x1={nodes[start].x}
            y1={nodes[start].y}
            x2={nodes[end].x}
            y2={nodes[end].y}
            stroke={showThinkingState ? "rgba(147, 51, 234, 0.2)" : "rgba(0, 119, 237, 0.15)"}
            strokeWidth="0.5"
            animate={{
              opacity: [0.1, 0.5, 0.1],
              strokeWidth: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Signal flow animation */}
        {connections.map(([start, end], i) => (
          <motion.circle
            key={`signal-${i}`}
            r="2"
            fill={showThinkingState ? "rgba(219, 39, 119, 0.8)" : "rgba(0, 212, 255, 0.6)"}
            filter="blur(1px)"
            initial={{
              cx: nodes[start].x,
              cy: nodes[start].y,
              opacity: 0
            }}
            animate={{
              cx: [nodes[start].x, nodes[end].x],
              cy: [nodes[start].y, nodes[end].y],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Neural nodes */}
        {nodes.map((node, i) => (
          <g key={`node-${i}`}>
            {/* Node glow */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="6"
              fill={showThinkingState 
                ? "radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)" 
                : "radial-gradient(circle, rgba(0, 119, 237, 0.2) 0%, transparent 70%)"}
              filter="blur(4px)"
              animate={{
                r: [6, 8, 6],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
            
            {/* Node core */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="3"
              fill="none"
              stroke={showThinkingState ? "rgba(147, 51, 234, 0.6)" : "rgba(0, 119, 237, 0.5)"}
              strokeWidth="1"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
            
            {/* Activation pulse */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="1"
              fill={showThinkingState ? "rgba(147, 51, 234, 0.9)" : "rgba(0, 119, 237, 0.8)"}
              animate={{
                r: [1, 2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          </g>
        ))}
      </svg>

      {/* Background neural field */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: showThinkingState
            ? 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.05) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(0, 119, 237, 0.04) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Thought particles */}
      <div className="absolute inset-0">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`thought-${i}`}
            className="absolute w-[2px] h-[2px] rounded-full"
            style={{
              left: `${25 + i * 16}%`,
              top: '50%',
              background: showThinkingState 
                ? 'rgba(147, 51, 234, 0.6)' 
                : 'rgba(0, 119, 237, 0.4)',
              boxShadow: showThinkingState
                ? '0 0 6px rgba(147, 51, 234, 0.4)'
                : '0 0 6px rgba(0, 119, 237, 0.3)'
            }}
            animate={{
              y: [0, -6, 6, 0],
              x: [0, 3, -3, 0],
              scale: [0, 1.5, 1, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: [0.16, 1, 0.3, 1]
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default NeuralFlowIndicator;