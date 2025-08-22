import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";

export type RepoItem = { 
  id: number; 
  full_name: string; 
};

export function useGitHubRepos() {
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [githubRequired, setGithubRequired] = useState<boolean>(false);
  const [noRepos, setNoRepos] = useState<boolean>(false);

  const DEFAULT_ACS = (
    import.meta.env?.VITE_ACS_BASE_URL || "http://localhost:8001"
  ).replace(/\/$/, "");
  
  const api = useMemo(() => acsGithubApi({ baseUrl: DEFAULT_ACS }), [DEFAULT_ACS]);

  const loadRepos = useCallback(async () => {
    setError(null);
    setLoadingRepos(true);
    setGithubRequired(false);
    setNoRepos(false);
    
    try {
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
        const mapped = (res.data.repositories || []).map((r: any) => ({
          id: r.repo_id,
          full_name: r.repo_full_name,
        }));
        setRepos(mapped);
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
  }, [api]);

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
  };
}