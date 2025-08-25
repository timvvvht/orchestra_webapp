import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { User } from "@supabase/supabase-js";

export type RepoItem = {
  id: number;
  full_name: string;
  default_branch?: string;
};

export function useGitHubRepos() {
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [githubRequired, setGithubRequired] = useState<boolean>(false);
  const [noRepos, setNoRepos] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const { createWorkspace } = useWorkspaceStore();

  const DEFAULT_ACS = (
    import.meta.env?.VITE_ACS_BASE_URL || "http://localhost:8001"
  ).replace(/\/$/, "");

  const api = useMemo(
    () => acsGithubApi({ baseUrl: DEFAULT_ACS }),
    [DEFAULT_ACS]
  );

  // Get current user from Supabase
  const getCurrentUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Failed to get current user:", error);
      return null;
    }
  }, []);

  // Create workspaces for repositories
  const createWorkspacesForRepos = useCallback(
    async (repositories: any[], userId: string) => {
      if (!userId) return;

      try {
        for (const repo of repositories) {
          const repoId = repo.repo_id;
          const repoFullName = repo.repo_full_name;
          const defaultBranch = repo.default_branch || "main"; // Fallback to 'main' if not provided

          // Create workspace for the default branch
          await createWorkspace({
            userId,
            repoId,
            repoFullName,
            branch: defaultBranch,
            name: `${repoFullName}/${defaultBranch}`,
            description: `Default workspace for ${repoFullName} on ${defaultBranch} branch`,
            metadata: {
              source: "github",
              defaultBranch,
              repoPrivate: repo.private || false,
            },
          });
        }
      } catch (error) {
        console.error("Failed to create workspaces for repositories:", error);
        // Don't throw error here as it shouldn't break the main repo loading
      }
    },
    [createWorkspace]
  );

  const loadRepos = useCallback(async () => {
    setError(null);
    setLoadingRepos(true);
    setGithubRequired(false);
    setNoRepos(false);

    try {
      // Get current user first
      const user = await getCurrentUser();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const auth = session?.access_token
        ? `Bearer ${session.access_token}`
        : undefined;
      const res = await api.listRepos(auth);

      if (!res.ok) {
        setRepos([]);
        setGithubRequired(true);
        setNoRepos(false);
        setError(
          res.data?.detail ||
            "GitHub connection required. Please connect your account."
        );
      } else {
        const repositories = res.data.repositories || [];
        const mapped = repositories.map((r: any) => ({
          id: r.repo_id,
          full_name: r.repo_full_name,
          default_branch: r.default_branch,
        }));

        setRepos(mapped);

        // Create workspaces for the repositories if we have a user
        if (user?.id && repositories.length > 0) {
          await createWorkspacesForRepos(repositories, user.id);
        }

        if (mapped.length === 0) {
          setGithubRequired(true);
          setNoRepos(true);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch repositories");
    } finally {
      setLoadingRepos(false);
    }
  }, [api, getCurrentUser, createWorkspacesForRepos]);

  const connectGitHub = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const auth = session?.access_token
        ? `Bearer ${session.access_token}`
        : undefined;
      const res = await api.installUrl(auth);
      if (!res.ok) {
        setError(res.data?.detail || "Failed to get GitHub install URL");
        return;
      }
      window.open(res.data.install_url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(e?.message || "Failed to start GitHub install");
    }
  }, [api]);

  // Listen for auth state changes to update current user
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setCurrentUser(session.user);
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get initial user
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  return {
    repos,
    loadingRepos,
    error,
    githubRequired,
    noRepos,
    loadRepos,
    connectGitHub,
    currentUser,
  };
}
