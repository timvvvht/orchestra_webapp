import React, { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  RepositoryDropdown,
  type RepoItem,
} from "@/components/RepositoryDropdown";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuth } from "@/auth/AuthContext";

const RepositoryFilterDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { workspace_id } = useParams<{ workspace_id?: string }>();
  const { user } = useAuth();
  const { createWorkspace, getWorkspaceByRepoAndBranch } = useWorkspaceStore();
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);

  // Handle repository selection
  const handleRepoSelect = useCallback(
    async (repo: RepoItem) => {
      if (!user?.id) return;

      try {
        // Create or get existing workspace for this repo/branch combination
        const workspace = await createWorkspace({
          userId: user.id,
          repoId: repo.id,
          repoFullName: repo.full_name,
          branch: "main", // Default to main branch, could be made configurable
          name: `${repo.full_name}/main`,
          description: `Workspace for ${repo.full_name} repository`,
        });

        // Navigate to the workspace-specific mission control
        navigate(`/mission-control/${workspace.id}`);
        setSelectedRepo(repo);
      } catch (error) {
        console.error("Failed to create workspace:", error);
      }
    },
    [user?.id, createWorkspace, navigate]
  );

  // Get current workspace info if we're on a workspace route
  const currentWorkspace = workspace_id
    ? useWorkspaceStore.getState().getWorkspace(workspace_id)
    : null;

  // If we have a current workspace, show the repo info
  if (currentWorkspace) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-sm font-light text-white/70">
          <div className="relative w-4 h-4 rounded bg-white/10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-sm bg-white/60" />
          </div>
          <span className="text-xs">{currentWorkspace.repoFullName}/main</span>
        </div>
        <button
          onClick={() => navigate("/mission-control")}
          className="text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          (change)
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <RepositoryDropdown
        onRepoSelect={handleRepoSelect}
        selectedRepo={selectedRepo}
        placeholder="Select repository"
        className="w-64 bg-white/5 border-white/10 text-white/90 placeholder:text-white/50"
        showConnectButton={true}
      />
    </div>
  );
};

export default RepositoryFilterDropdown;
