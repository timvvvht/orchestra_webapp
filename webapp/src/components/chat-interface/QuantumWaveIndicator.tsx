import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuantumWaveIndicatorProps {
  className?: string;
  agentName?: string;
  showThinkingState?: boolean;
}

// Color interpolation utility
const interpolateColor = (
  color1: [number, number, number],
  color2: [number, number, number],
  factor: number
): [number, number, number] => {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * factor),
    Math.round(color1[1] + (color2[1] - color1[1]) * factor),
    Math.round(color1[2] + (color2[2] - color1[2]) * factor),
  ];
};

const QuantumWaveIndicator: React.FC<QuantumWaveIndicatorProps> = ({
  className,
  agentName,
  showThinkingState = false,
}) => {
  // Orchestra color palette (memoized to prevent useEffect re-runs)
  const blueRGB = useMemo<[number, number, number]>(() => [0, 119, 237], []); // #0077ED
  const purpleRGB = useMemo<[number, number, number]>(() => [147, 51, 234], []); // #9333EA

  // State for animated colors
  const [currentColor, setCurrentColor] =
    useState<[number, number, number]>(blueRGB);

  // Smooth color interpolation timer
  useEffect(() => {
    const duration = 3000; // 3 seconds for full cycle
    const startTime = Date.now();

    const updateColor = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % duration) / duration;

      // Create smooth sine wave for color transition
      const factor = (Math.sin(progress * Math.PI * 2) + 1) / 2;

      const interpolated = interpolateColor(blueRGB, purpleRGB, factor);
      setCurrentColor(interpolated);
    };

    const interval = setInterval(updateColor, 16); // ~60fps

    return () => clearInterval(interval);
  }, [blueRGB, purpleRGB]);

  // Generate color strings from current RGB values
  const currentColorAlpha = (alpha: number) =>
    `rgba(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]}, ${alpha})`;

  // Container animation
  const containerVariants = {
    initial: {
      opacity: 0,
      y: 5,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -5,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("flex items-center gap-3", className)}
    >
      {/* Mystical avatar orb */}
      <div className="flex-shrink-0">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Energy field for active state */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                `0 0 0 0 ${currentColorAlpha(0.2)}`,
                `0 0 0 12px ${currentColorAlpha(0)}`,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />

          {/* The orb */}
          <div
            className={cn(
              "relative w-10 h-10 flex items-center justify-center",
              "rounded-full",
              "bg-white/[0.05] backdrop-blur-2xl",
              "border border-white/10",
              "transition-all duration-500",
              "hover:scale-110"
            )}
          >
            <div
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: currentColorAlpha(0.8),
                boxShadow: `0 0 8px ${currentColorAlpha(0.4)}`,
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Quantum wave visualization container */}
      <div className="relative w-16 h-16">
        {/* Quantum wave visualization */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={currentColorAlpha(0)} />
              <stop offset="50%" stopColor={currentColorAlpha(0.9)} />
              <stop offset="100%" stopColor={currentColorAlpha(0)} />
            </linearGradient>
          </defs>

          {/* Sine wave paths */}
          {[...Array(3)].map((_, i) => (
            <motion.path
              key={`wave-${i}`}
              d="M 0 32 Q 16 16 32 32 T 64 32"
              stroke="url(#waveGradient)"
              strokeWidth={3 - i * 0.5}
              fill="none"
              opacity={1 - i * 0.15}
              initial={{ d: "M 0 32 Q 16 16 32 32 T 64 32" }}
              animate={{
                d: [
                  "M 0 32 Q 16 16 32 32 T 64 32",
                  "M 0 32 Q 16 48 32 32 T 64 32",
                  "M 0 32 Q 16 16 32 32 T 64 32",
                ],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Interference pattern */}
          <motion.g opacity="0.6">
          {[...Array(8)].map((_, i) => (
              <motion.line
                key={`interference-${i}`}
                x1={i * 8}
                y1="0"
                x2={i * 8}
                y2="64"
                stroke={currentColorAlpha(0.15)}
                strokeWidth="0.5"
                initial={{ opacity: 0, strokeWidth: 0.5 }}
                animate={{
                  opacity: [0, 0.3, 0],
                  strokeWidth: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.g>
        </svg>

        {/* Probability cloud */}
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`cloud-${i}`}
              className="absolute"
              style={{
                left: `${20 + i * 10}%`,
                top: "50%",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${currentColorAlpha(0.7)} 0%, transparent 70%)`,
                filter: "blur(4px)",
              }}
              animate={{
                y: [0, -8, 8, 0],
                scale: [1, 1.5, 0.8, 1],
                opacity: [0.5, 0.9, 0.5],
              }}
              transition={{
                duration: 3 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          ))}
        </motion.div>

        {/* Quantum collapse effect */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="w-2 h-2"
            style={{
              background: `radial-gradient(circle, ${currentColorAlpha(1)} 0%, transparent 70%)`,
              boxShadow: `0 0 30px ${currentColorAlpha(0.6)}`,
            }}
            animate={{
              scale: [0, 2, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        </motion.div>

        {/* Field lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.circle
              key={`field-${i}`}
              cx="32"
              cy="32"
              r={10 + i * 8}
              fill="none"
              stroke={currentColorAlpha(0.3)}
              strokeWidth="1"
              strokeDasharray="2 4"
              initial={{ r: 10 + i * 8, opacity: 0.4 }}
              animate={{
                r: [10 + i * 8, 15 + i * 8, 10 + i * 8],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </svg>
      </div>

      {/* Status text */}
      {agentName && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-white/30 ml-2"
        >
          {showThinkingState
            ? `${agentName} is thinking...`
            : `${agentName} is typing...`}
        </motion.span>
      )}
    </motion.div>
  );
};

export default QuantumWaveIndicator;
