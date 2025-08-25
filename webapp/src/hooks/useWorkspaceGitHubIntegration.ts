import { useMemo } from "react";
import { useGitHubRepos } from "./useGitHubRepos";
import {
  useWorkspaces,
  useWorkspacesByUser,
  useRecentWorkspaces,
  useWorkspaceStore,
} from "@/stores/workspaceStore";

/**
 * Hook that provides an integrated view of GitHub repositories and their associated workspaces
 * This demonstrates how the workspace store automatically populates when GitHub repos are loaded
 */
export function useWorkspaceGitHubIntegration() {
  const {
    repos,
    loadingRepos,
    error,
    githubRequired,
    noRepos,
    currentUser,
    loadRepos,
  } = useGitHubRepos();

  const workspaces = useWorkspaces();
  const { getWorkspacesByRepo, getWorkspaceByRepoAndBranch } =
    useWorkspaceStore();

  // Get workspaces for the current user
  const userWorkspaces = useWorkspacesByUser(currentUser?.id || "");

  // Get recent workspaces
  const recentWorkspaces = useRecentWorkspaces(10);

  // Create a mapping of repos to their workspaces
  const reposWithWorkspaces = useMemo(() => {
    return repos.map((repo) => {
      const repoWorkspaces = getWorkspacesByRepo(repo.id);
      const defaultBranchWorkspace = getWorkspaceByRepoAndBranch(
        repo.id,
        repo.default_branch || "main"
      );

      return {
        ...repo,
        workspaces: repoWorkspaces,
        defaultBranchWorkspace,
        hasWorkspaces: repoWorkspaces.length > 0,
        workspaceCount: repoWorkspaces.length,
      };
    });
  }, [repos, getWorkspacesByRepo, getWorkspaceByRepoAndBranch]);

  // Get statistics
  const stats = useMemo(() => {
    const totalRepos = repos.length;
    const totalWorkspaces = Object.keys(workspaces).length;
    const reposWithWorkspacesCount = reposWithWorkspaces.filter(
      (r) => r.hasWorkspaces
    ).length;
    const reposWithoutWorkspacesCount = totalRepos - reposWithWorkspacesCount;

    return {
      totalRepos,
      totalWorkspaces,
      reposWithWorkspacesCount,
      reposWithoutWorkspacesCount,
      coverage:
        totalRepos > 0 ? (reposWithWorkspacesCount / totalRepos) * 100 : 0,
    };
  }, [repos, workspaces, reposWithWorkspaces]);

  // Check if all repos have workspaces
  const allReposHaveWorkspaces = useMemo(() => {
    return (
      repos.length > 0 &&
      repos.every((repo) => getWorkspacesByRepo(repo.id).length > 0)
    );
  }, [repos, getWorkspacesByRepo]);

  return {
    // GitHub repos data
    repos,
    loadingRepos,
    error,
    githubRequired,
    noRepos,
    currentUser,
    loadRepos,

    // Workspace data
    workspaces,
    userWorkspaces,
    recentWorkspaces,

    // Integrated data
    reposWithWorkspaces,
    allReposHaveWorkspaces,

    // Statistics
    stats,

    // Helper functions
    getWorkspacesForRepo: (repoId: number) => getWorkspacesByRepo(repoId),
    getWorkspaceForRepoAndBranch: (repoId: number, branch: string) =>
      getWorkspaceByRepoAndBranch(repoId, branch),
  };
}
