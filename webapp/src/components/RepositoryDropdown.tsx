import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Github, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGitHubRepos, type RepoItem } from "@/hooks/useGitHubRepos";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useMissionControlStore } from "@/stores/missionControlStore";
import { useAuth } from "@/auth/AuthContext";

export interface RepositoryDropdownProps {
  onRepoSelect: (repo: RepoItem | null) => void;
  selectedRepo?: RepoItem | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showConnectButton?: boolean;
}

export const RepositoryDropdown: React.FC<RepositoryDropdownProps> = ({
  onRepoSelect,
  selectedRepo,
  placeholder = "Select a repository",
  className,
  disabled = false,
  showConnectButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { repos, loadingRepos, error, githubRequired } = useGitHubRepos();
  const { user } = useAuth();

  // Workspace store integration
  const {
    createWorkspace,
    getWorkspaceByRepoAndBranch,
    setActiveWorkspace,
    activeWorkspaceId,
    getActiveWorkspace,
  } = useWorkspaceStore();

  // Mission control store integration for filtering
  const { setWorkspaceFilter, workspaceFilter } = useMissionControlStore();

  // Get current active workspace info for display
  const currentWorkspace = useWorkspaceStore((state) =>
    workspaceFilter ? state.getWorkspace(workspaceFilter) : null
  );

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

  // Sync workspace filter when selectedRepo changes
  useEffect(() => {
    if (selectedRepo && user?.id && !workspaceFilter) {
      // Try to find existing workspace for this repository
      const existingWorkspace = getWorkspaceByRepoAndBranch(
        selectedRepo.id,
        "main"
      );
      if (existingWorkspace) {
        setWorkspaceFilter(existingWorkspace.id);
      }
    }
  }, [
    selectedRepo,
    user?.id,
    workspaceFilter,
    getWorkspaceByRepoAndBranch,
    setWorkspaceFilter,
  ]);

  const handleRepoSelect = async (repo: RepoItem | null) => {
    if (repo && !repo?.id) return;

    if (repo) {
      setActiveWorkspace(repo.id.toString());
    }
    setIsOpen(false);
  };

  const handleConnectGitHub = () => {
    navigate("/github-connect");
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
          selectedRepo ? "text-white/90" : "text-white/60"
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
          ) : getActiveWorkspace() ? (
            <span className="text-sm text-white/60">
              {getActiveWorkspace()?.repoFullName}
            </span>
          ) : (
            <span className="text-sm text-white/60">{placeholder}</span>
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
                  {/* Clear Filter Option - Only show when filter is active */}
                  {currentWorkspace && (
                    <>
                      <button
                        onClick={() => {
                          setWorkspaceFilter(null);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          "hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none",
                          "hover:border-white/20 focus:border-white/20",
                          "text-white/80 hover:text-white/90 border border-transparent",
                          "bg-red-500/10 hover:bg-red-500/20 border-red-500/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs">🔄</span>
                          <span className="font-medium">Show All Sessions</span>
                        </div>
                      </button>

                      {/* Divider */}
                      <div className="border-t border-white/10 my-1"></div>
                    </>
                  )}

                  {/* Clear Selection Option - Only show when a repo is selected */}
                  {selectedRepo && (
                    <>
                      <button
                        onClick={() => {
                          handleRepoSelect(null);
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

                  {repos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleRepoSelect(repo)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150",
                        "hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none",
                        "hover:border-white/20 focus:border-white/20",
                        selectedRepo?.id === repo.id
                          ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 border border-blue-500/20"
                          : "text-white/80 hover:text-white/90 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Github className="h-4 w-4 text-white/50" />
                        <span className="font-medium">{repo.full_name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>,
          document.body
        )}
    </div>
  );
};

export default RepositoryDropdown;
