import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Github,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGitHubRepos, type RepoItem } from "@/hooks/useGitHubRepos";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuth } from "@/auth/AuthContext";

export interface WorkspaceDropdownProps {
  onWorkspaceSelect: (workspace: any | null) => void;
  selectedWorkspace?: any | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showConnectButton?: boolean;
}

export const WorkspaceDropdown: React.FC<WorkspaceDropdownProps> = ({
  onWorkspaceSelect,
  selectedWorkspace,
  placeholder = "Select a workspace",
  className,
  disabled = false,
  showConnectButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { repos, loadingRepos, error, githubRequired, connectGitHub } =
    useGitHubRepos();
  const { user } = useAuth();

  // Workspace store integration
  const {
    getWorkspacesByRepo,
    getActiveWorkspace,
    setActiveWorkspace,
    activeWorkspaceId,
  } = useWorkspaceStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleWorkspaceSelect = async (repo: RepoItem | null) => {
    if (repo && !repo?.id) return;

    if (repo) {
      // Find existing workspace for this repository
      const existingWorkspaces = getWorkspacesByRepo(repo.id);
      if (existingWorkspaces.length > 0) {
        // Use the first available workspace (usually main branch)
        const workspace = existingWorkspaces[0];
        setActiveWorkspace(workspace.id);
        onWorkspaceSelect(workspace);
      } else {
        // If no workspace exists, just select the repo
        onWorkspaceSelect({ ...repo, type: "repo" });
      }
    } else {
      onWorkspaceSelect(null);
    }
    setIsOpen(false);
  };

  const handleConnectGitHub = () => {
    connectGitHub();
    setIsOpen(false);
  };

  // Calculate dropdown position for portal
  const getDropdownPosition = () => {
    if (!dropdownRef.current) return { top: 0, left: 0, width: 0 };

    const rect = dropdownRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8, // 8px gap
      left: rect.left,
      width: rect.width,
    };
  };

  // Get display text for selected item
  const getDisplayText = () => {
    if (loadingRepos) return "Loading repositories...";

    if (selectedWorkspace) {
      if (selectedWorkspace.type === "repo") {
        return selectedWorkspace.full_name;
      }
      return (
        selectedWorkspace.name ||
        `${selectedWorkspace.repoFullName}/${selectedWorkspace.branch}`
      );
    }

    return placeholder;
  };

  if (error && githubRequired) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 backdrop-blur-xl">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            GitHub connection required
          </span>
        </div>
        {showConnectButton && (
          <button
            onClick={handleConnectGitHub}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium hover:scale-105 active:scale-100"
          >
            <Github className="h-4 w-4" />
            Connect GitHub
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loadingRepos}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left",
          "bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl",
          "hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/[0.03] disabled:hover:border-white/10",
          selectedWorkspace ? "text-white/90" : "text-white/60"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {loadingRepos ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
              <span className="text-sm text-white/70">
                Loading repositories...
              </span>
            </>
          ) : (
            <>
              <FolderOpen className="h-4 w-4 text-white/50" />
              <span className="text-sm text-white/70 truncate">
                {getDisplayText()}
              </span>
            </>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-white/40 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu - Rendered via Portal */}
      {isOpen &&
        createPortal(
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[99999] bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-hidden"
            style={{
              top: getDropdownPosition().top,
              left: getDropdownPosition().left,
              width: getDropdownPosition().width,
            }}
          >
            <div className="p-2">
              {loadingRepos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                  <span className="ml-3 text-sm text-white/60">
                    Loading repositories...
                  </span>
                </div>
              ) : repos.length === 0 ? (
                <div className="text-center py-8">
                  <Github className="h-8 w-8 text-white/30 mx-auto mb-3" />
                  <p className="text-sm text-white/60 mb-4">
                    No repositories found
                  </p>
                  {showConnectButton && (
                    <button
                      onClick={handleConnectGitHub}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium hover:scale-105 active:scale-100"
                    >
                      <Github className="h-4 w-4" />
                      Connect GitHub
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Clear Selection Option - Only show when a workspace is selected */}
                  {selectedWorkspace && (
                    <>
                      <button
                        onClick={() => {
                          handleWorkspaceSelect(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          "hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none",
                          "hover:border-white/20 focus:border-white/20",
                          "text-white/60 hover:text-white/80 border border-transparent",
                          "bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs">❌</span>
                          <span className="font-medium">Clear Selection</span>
                        </div>
                      </button>

                      {/* Divider */}
                      <div className="border-t border-white/10 my-1"></div>
                    </>
                  )}

                  {repos.map((repo) => {
                    const existingWorkspaces = getWorkspacesByRepo(repo.id);
                    const hasWorkspaces = existingWorkspaces.length > 0;

                    return (
                      <button
                        key={repo.id}
                        onClick={() => handleWorkspaceSelect(repo)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          "hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none",
                          "hover:border-white/20 focus:border-white/20",
                          selectedWorkspace?.id === repo.id ||
                            (selectedWorkspace?.repoId === repo.id &&
                              selectedWorkspace?.type === "repo")
                            ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 border border-blue-500/20"
                            : "text-white/80 hover:text-white/90 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Github className="h-4 w-4 text-white/50" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">
                              {repo.full_name}
                            </span>
                            {hasWorkspaces && (
                              <span className="text-xs text-white/50">
                                {existingWorkspaces.length} workspace
                                {existingWorkspaces.length !== 1 ? "s" : ""}{" "}
                                available
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>,
          document.body
        )}
    </div>
  );
};

export default WorkspaceDropdown;
