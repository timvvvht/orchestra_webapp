import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";

type RepoItem = { id: number; full_name: string };

export default function StartChat() {
  const navigate = useNavigate();

  // ACS client
  const DEFAULT_ACS = (import.meta.env?.VITE_ACS_BASE_URL || "http://localhost:8001").replace(/\/$/, "");
  const [acsBase] = useState(DEFAULT_ACS);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);

  // UI state
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<number | "">("");
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>("");
  const [branch, setBranch] = useState<string>("main");
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [githubRequired, setGithubRequired] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  // Load repos for the authenticated user
  const loadRepos = useCallback(async () => {
    setError(null);
    setLoadingRepos(true);
    setGithubRequired(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
      const res = await api.listRepos(auth);
      if (!res.ok) {
        setRepos([]);
        setGithubRequired(true);
        setError(res.data?.detail || "No GitHub repositories found. Please connect GitHub.");
      } else {
        const mapped = (res.data.repositories || []).map((r: any) => ({
          id: r.repo_id,
          full_name: r.repo_full_name,
        }));
        setRepos(mapped);
        if (mapped.length === 0) {
          setGithubRequired(true);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch repositories");
    } finally {
      setLoadingRepos(false);
    }
  }, [api]);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // Trigger GitHub App install
  const onConnectGitHub = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
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

  // Submit: Navigate to Mission Control with provisioning payload in location.state
  const onSubmit = useCallback(() => {
    setError(null);

    if (!prompt.trim()) {
      setError("Please enter what you want to work on.");
      return;
    }
    if (!selectedRepoId || !selectedRepoFullName) {
      setError("Please select a repository.");
      return;
    }
    if (!branch.trim()) {
      setError("Please set a branch name.");
      return;
    }

    setBusy(true);
    // Navigate to Mission Control and show overlay that provisions + polls
    navigate("/mission-control", {
      replace: false,
      state: {
        provision: {
          repo_id: selectedRepoId,
          repo_full_name: selectedRepoFullName,
          branch: branch.trim(),
          initial_prompt: prompt.trim(),
          acs_base: acsBase
        }
      }
    });
  }, [prompt, selectedRepoId, selectedRepoFullName, branch, acsBase, navigate]);

  return (
    <main className="min-h-screen relative orchestra-page bg-black">
      {/* Background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-[float_30s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-[float_35s_ease-in-out_infinite_reverse]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-start justify-center pt-24 px-6">
        <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl content-narrow w-full p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <div className="text-center">
              <h1 className="text-display text-white/90">Start a new mission</h1>
              <p className="text-body text-white/70 mt-2">Select a repository and branch, then describe what you want to do.</p>
            </div>

            {/* GitHub connect state */}
            {githubRequired && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 text-amber-200 p-3 text-sm">
                GitHub connection required. Install the Orchestra GitHub App to proceed.
                <button
                  onClick={onConnectGitHub}
                  className="ml-3 underline underline-offset-2 hover:text-amber-100"
                >
                  Connect GitHub
                </button>
                <button
                  onClick={loadRepos}
                  className="ml-3 text-amber-200/80 hover:text-amber-100 underline underline-offset-2"
                >
                  Refresh
                </button>
              </div>
            )}

            {/* Repo + Branch */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-white/50 text-xs">Repository</label>
                <select
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                  value={selectedRepoId === "" ? "" : String(selectedRepoId)}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedRepoId(id);
                    const r = repos.find(x => x.id === id);
                    setSelectedRepoFullName(r?.full_name || "");
                  }}
                  disabled={loadingRepos || repos.length === 0}
                >
                  <option value="" disabled>
                    {loadingRepos ? "Loading repositories…" : repos.length ? "Select repository…" : "No repositories available"}
                  </option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs">Branch</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label className="text-white/50 text-xs">What should the agent do?</label>
              <textarea
                className="w-full mt-1 px-4 py-3 rounded-xl bg-white/[0.06] text-white/90 border border-white/10 min-h-[120px]"
                placeholder="Describe a feature, bug, or task…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex items-center justify-center">
              <button
                onClick={onSubmit}
                disabled={busy || githubRequired || !selectedRepoId || !prompt.trim()}
                className="group relative px-6 py-3 bg-white text-black rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-100 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">
                  {busy ? "Starting…" : "Start"}
                </span>
              </button>
            </div>

            <div className="text-center text-xs text-white/40">
              You can change branches later. Branch listing will be added soon.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}