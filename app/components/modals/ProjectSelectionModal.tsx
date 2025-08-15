/**
 * Project Selection Modal - Choose between new or existing project
 * Orchestra Design System - Mystical Minimalism
 */

import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  X,
  FolderPlus,
  FolderOpen,
  ArrowRight,
  Sparkles,
  GitBranch,
  Save,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "cn-utility";
import { isTauri } from "@/utils/environment";
import { recentProjectsManager } from "@/utils/projectStorage";

interface ProjectSelectionModalProps {
  onClose: () => void;
  onProjectSelected: (path: string) => void;
}

export const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  onClose,
  onProjectSelected,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<"new" | "existing" | null>(
    null
  );
  const recentProjects = recentProjectsManager.get();

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleNewProject = async () => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        // First, pick parent directory
        const parentDir = await open({
          directory: true,
          multiple: false,
          title: "Choose where to create your new project",
        });

        if (parentDir && typeof parentDir === "string") {
          // Then prompt for project name
          const projectName = window.prompt("Enter project name:");
          if (projectName?.trim()) {
            const newProjectPath = `${parentDir}/${projectName.trim()}`;
            // TODO: Actually create the directory
            onProjectSelected(newProjectPath);
            handleClose();
          }
        }
      } catch (e) {
        console.warn("Folder creation failed:", e);
      }
    } else {
      const projectName = window.prompt("Enter new project name:");
      if (projectName?.trim()) {
        const parentPath =
          window.prompt("Enter parent directory path:") ||
          "/Users/default/projects";
        const newProjectPath = `${parentPath}/${projectName.trim()}`;
        onProjectSelected(newProjectPath);
        handleClose();
      }
    }
  };

  const handleExistingProject = async () => {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const folder = await open({
          directory: true,
          multiple: false,
          title: "Select your project folder",
        });

        if (folder && typeof folder === "string") {
          onProjectSelected(folder);
          handleClose();
        }
      } catch (e) {
        console.warn("Folder picker failed:", e);
      }
    } else {
      const path = window.prompt("Enter project path:");
      if (path?.trim()) {
        onProjectSelected(path.trim());
        handleClose();
      }
    }
  };

  const handleRecentProject = (path: string) => {
    onProjectSelected(path);
    handleClose();
  };

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 bg-black/80 backdrop-blur-md transition-opacity duration-200",
          isClosing && "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            "relative w-full max-w-2xl",
            "bg-black/90 backdrop-blur-2xl",
            "rounded-3xl shadow-2xl",
            "border border-white/20",
            "overflow-hidden"
          )}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

          {/* Animated orbs */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-float-reverse" />

          {/* Content */}
          <div className="relative z-10 p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-3xl font-extralight text-white tracking-tight mb-2">
                  Choose Your Workspace
                </h2>
                <p className="text-base text-white/60">
                  Start fresh or continue with an existing project
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <X className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
              </button>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* New Project */}
              <motion.button
                onClick={handleNewProject}
                onMouseEnter={() => setHoveredOption("new")}
                onMouseLeave={() => setHoveredOption(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-6 text-left",
                  "bg-white/[0.03] hover:bg-white/[0.06]",
                  "border border-white/10 hover:border-white/20",
                  "rounded-2xl transition-all duration-300",
                  "group"
                )}
              >
                {/* Glow effect on hover */}
                <AnimatePresence>
                  {hoveredOption === "new" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                    <FolderPlus className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white/90 mb-2">
                    Start New Project
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Create a fresh workspace for your new idea
                  </p>
                  <div className="mt-4 flex items-center text-xs text-blue-400/60">
                    <span>Create directory</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </motion.button>

              {/* Existing Project */}
              <motion.button
                onClick={handleExistingProject}
                onMouseEnter={() => setHoveredOption("existing")}
                onMouseLeave={() => setHoveredOption(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-6 text-left",
                  "bg-white/[0.03] hover:bg-white/[0.06]",
                  "border border-white/10 hover:border-white/20",
                  "rounded-2xl transition-all duration-300",
                  "group"
                )}
              >
                {/* Glow effect on hover */}
                <AnimatePresence>
                  {hoveredOption === "existing" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                    <FolderOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white/90 mb-2">
                    Load Existing Project
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Continue working on your current codebase
                  </p>
                  <div className="mt-4 flex items-center text-xs text-purple-400/60">
                    <span>Browse folders</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </motion.button>
            </div>

            {/* Recent Projects */}
            {recentProjects.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/50 mb-3">
                  Recent Projects
                </h3>
                <div className="space-y-2">
                  {recentProjects.slice(0, 3).map((project) => (
                    <button
                      key={project.path}
                      onClick={() => handleRecentProject(project.path)}
                      className={cn(
                        "w-full p-3 text-left",
                        "bg-white/[0.02] hover:bg-white/[0.04]",
                        "border border-white/5 hover:border-white/10",
                        "rounded-xl transition-all duration-200",
                        "group"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FolderOpen className="w-4 h-4 text-white/30" />
                          <div>
                            <div className="text-sm text-white/80">
                              {project.name}
                            </div>
                            <div className="text-xs text-white/40 font-mono">
                              {project.path}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Features reminder */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-center gap-6 text-xs text-white/40">
                <div className="flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3" />
                  <span>Isolated worktrees</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Save className="w-3 h-3" />
                  <span>Auto-checkpoint</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  <span>Safe rollback</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(0.9); }
          66% { transform: translate(20px, -30px) scale(1.1); }
        }
      `}</style>
    </>,
    document.body
  );
};
