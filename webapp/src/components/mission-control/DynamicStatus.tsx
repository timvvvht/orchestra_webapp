import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusOrb } from "./StatusOrb";
import { type MissionControlAgent } from "@/stores/missionControlStore";

interface DynamicStatusProps {
  processingTasks: MissionControlAgent[];
  drafts: any[]; // From draft store
}

const DynamicStatus: React.FC<DynamicStatusProps> = ({
  processingTasks,
  drafts,
}) => {
  // Determine the primary message
  const getMessage = () => {
    // No activity
    if (processingTasks.length === 0 && drafts.length === 0) {
      return {
        text: "Ready for your next task",
        style: "text-white/60 font-light",
        showOrb: false,
      };
    }

    // Single task processing
    if (processingTasks.length === 1 && drafts.length === 0) {
      const task = processingTasks[0];
      return {
        text: `Building: ${task.mission_title}`,
        style: "text-white/90",
        showOrb: true,
        orbStatus: "processing" as const,
      };
    }

    // Multiple tasks
    if (processingTasks.length > 1) {
      return {
        text: `${processingTasks.length} tasks in progress`,
        style: "text-white/90",
        showOrb: true,
        orbStatus: "processing" as const,
      };
    }

    // Only drafts
    if (drafts.length > 0 && processingTasks.length === 0) {
      return {
        text: `${drafts.length} draft${drafts.length > 1 ? "s" : ""} in progress`,
        style: "text-amber-300/90",
        showOrb: true,
        orbStatus: "creating" as const,
      };
    }

    // Mixed state
    return {
      text: `${processingTasks.length + drafts.length} tasks active`,
      style: "text-white/90",
      showOrb: true,
      orbStatus: "processing" as const,
    };
  };

  const status = getMessage();

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        {status.showOrb && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <StatusOrb status={status.orbStatus!} size="sm" pulse />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.h1
        key={status.text}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`text-base font-medium ${status.style}`}
      >
        {status.text}
      </motion.h1>
    </div>
  );
};

export default DynamicStatus;
