import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatusOrbProps {
  status: "processing" | "idle" | "needs-review" | "error" | "creating";
  size?: "sm" | "md" | "lg";
  className?: string;
  showPulse?: boolean;
}

export const StatusOrb: React.FC<StatusOrbProps> = ({
  status,
  size = "md",
  className,
  showPulse = true,
}) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", // Increased from w-3 h-3
    lg: "w-5 h-5", // Increased from w-4 h-4
  };

  const statusConfig = {
    processing: {
      color: "bg-gradient-to-r from-blue-400 to-cyan-400",
      glow: "shadow-[0_0_30px_rgba(96,165,250,0.6)]",
      animation: "animate-pulse",
      outerRing: "ring-2 ring-blue-400/30 ring-offset-2 ring-offset-black",
    },
    idle: {
      color: "bg-gradient-to-r from-gray-400 to-gray-500",
      glow: "",
      animation: "",
      outerRing: "",
    },
    "needs-review": {
      color: "bg-gradient-to-r from-amber-400 to-orange-400",
      glow: "shadow-[0_0_30px_rgba(251,191,36,0.6)]",
      animation: "animate-pulse",
      outerRing: "ring-2 ring-amber-400/30 ring-offset-2 ring-offset-black",
    },
    error: {
      color: "bg-gradient-to-r from-red-400 to-pink-400",
      glow: "shadow-[0_0_30px_rgba(248,113,113,0.6)]",
      animation: "animate-pulse",
      outerRing: "ring-2 ring-red-400/30 ring-offset-2 ring-offset-black",
    },
    creating: {
      color: "bg-gradient-to-r from-emerald-400 to-green-400",
      glow: "shadow-[0_0_30px_rgba(52,211,153,0.6)]",
      animation: "animate-pulse",
      outerRing: "ring-2 ring-emerald-400/30 ring-offset-2 ring-offset-black",
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer glow ring for active states */}
      {showPulse && (status === "processing" || status === "creating") && (
        <motion.div
          className={cn(
            "absolute rounded-full",
            sizeClasses[size],
            config.color,
            "opacity-30"
          )}
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* The orb with gradient */}
      <div
        className={cn(
          "rounded-full transition-all duration-300",
          sizeClasses[size],
          config.color,
          config.glow,
          config.animation,
          config.outerRing
        )}
      />
    </div>
  );
};
