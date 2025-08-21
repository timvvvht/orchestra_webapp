import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";
import { useAuth } from "@/auth/AuthContext";
import { useMissionControlStore } from "@/stores/missionControlStore";
import { toast } from "sonner";
import * as taskOrchestration from "@/utils/taskOrchestration";
// import { startBackgroundSessionOps } from "@/workers/sessionBackgroundWorker";
import { AUTO_MODE_PRESETS } from "@/utils";
import { recentProjectsManager } from "@/utils/projectStorage";
import { getDefaultACSClient } from "@/services/acs";
import { sendChatMessage } from "@/utils/sendChatMessage";
import { createSessionFast } from "@/hooks/useCreateSessionFast";

type RepoItem = { id: number; full_name: string };

export default function StartChat() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();

  // ACS client
  const DEFAULT_ACS = (
    import.meta.env?.VITE_ACS_BASE_URL || "http://localhost:8001"
  ).replace(/\/$/, "");
  const [acsBase] = useState(DEFAULT_ACS);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);

  // UI state
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(true); // Start with true to prevent flash
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<number | "">("");
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>("");
  const [branch, setBranch] = useState<string>("main");
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [githubRequired, setGithubRequired] = useState<boolean>(false);
  const [noRepos, setNoRepos] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string>("");

  const [sending, setSending] = useState<boolean>(false);

  // Query params → preselect repo/branch when coming from /workspaces
  const paramRepoId = useMemo(() => {
    const v = searchParams.get("repoId");
    const n = v ? Number(v) : undefined;
    return Number.isFinite(n as number) ? (n as number) : undefined;
  }, [searchParams]);
  const paramBranch = useMemo(
    () => searchParams.get("branch") || undefined,
    [searchParams]
  );

  // Derived state for progressive disclosure
  const showSetup = !githubRequired && !loadingRepos && repos.length > 0;

  // Load repos for the authenticated user
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

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // Preselect branch from URL param (do not override user edits)
  useEffect(() => {
    if (paramBranch && branch === "main") {
      setBranch(paramBranch);
    }
  }, [paramBranch]);

  // Preselect repo id and full_name after repos load
  useEffect(() => {
    if (paramRepoId && repos.length > 0 && selectedRepoId === "") {
      const r = repos.find((x) => x.id === paramRepoId);
      if (r) {
        setSelectedRepoId(paramRepoId);
        setSelectedRepoFullName(r.full_name);
      }
    }
  }, [paramRepoId, repos, selectedRepoId]);

  // Trigger GitHub App install
  const onConnectGitHub = useCallback(async () => {
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

  // new on submit - uses startSessioNFast
  const onSubmit = useCallback(async () => {
    if (!selectedRepoId || !selectedRepoId || !branch.trim()) {
      return setError("Select repo and branch.");
    }

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return setError("enter a prompt to start.");
    }

    try {
      setInfo("Creating session...");
      setBusy(true);
      setSending(true);
      const cs = await createSessionFast({
        sessionName: `Task: ${trimmedPrompt.slice(0, 60)}`,
        agentConfigId: "general",
      });

      if (!cs.success || !cs.sessionId) {
        return setError(cs?.error || "Failed to create session");
      }

      setChatSessionId(cs.sessionId);

      const acs = getDefaultACSClient();
      try {
        await acs.streaming.connect(cs.sessionId);
      } catch (e: any) {
        console.warn("SSE Connect Failed (non-fatal)", e);
      }

      setInfo("Provisioning + starting via /acs/converse/web...");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id || "unknown";

      const sessionData = {
        id: cs.sessionId,
        mission_title: `Task: ${trimmedPrompt.slice(0, 60)}`,
        status: "processing",
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        agent_config_name: "general",
        model_id: null,
        latest_message_id: null,
        latest_message_role: null,
        latest_message_content: null,
        latest_message_timestamp: new Date().toISOString(),
        agent_cwd: "/workspace", // Backend will handle repo-specific workspace
        base_dir: "/workspace",
        archived_at: null,
        backgroundProcessing: true,
      };

      console.log("[StartChat] Calling sendChatMessage with:", {
        sessionId: cs.sessionId,
        message: trimmedPrompt,
        userId: uid,
        agentConfigName: "general",
        autoMode: true,
        modelAutoMode: true,
        repoContextWeb: {
          repo_id: selectedRepoId,
          repo_full_name: selectedRepoFullName,
          branch: branch.trim(),
        },
      });

      // optimistic UI
      navigate("/mission-control", { replace: false });
      const store = useMissionControlStore.getState();
      const sessions = store.activeSessions;
      store.setSessions([sessionData, ...sessions]);

      await sendChatMessage({
        sessionId: cs.sessionId,
        message: trimmedPrompt,
        endpoint: "web",
        userId: uid,
        agentConfigName: "general",
        acsClient: acs,
        autoMode: true,
        modelAutoMode: true,
        repoContextWeb: {
          repo_id: selectedRepoId,
          repo_full_name: selectedRepoFullName,
          branch: branch.trim(),
        },
      });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSending(false);
      setBusy(false);
    }
  }, [selectedRepoId, selectedRepoFullName, branch, prompt]);

  // Submit: Create session immediately and navigate to Mission Control (aligned with NewTaskModal)
  /*
  const onSubmit = useCallback(async () => {
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
    if (!auth.user?.id) {
      setError("Please sign in to start a mission.");
      return;
    }

    setBusy(true);

    try {
      // Create title from prompt (same logic as NewTaskModal)
      const MAX_TITLE_LENGTH = 60;
      const truncatedContent =
        prompt.length > MAX_TITLE_LENGTH
          ? prompt.slice(0, MAX_TITLE_LENGTH).trimEnd() + "…"
          : prompt;
      const title = `Mission: ${truncatedContent}`;

      // Create session immediately (backend will handle provisioning automatically)
      const sessionId = await taskOrchestration.createTaskSession(
        title,
        "general" // Use general agent config
      );

      // Create session data for the store (aligned with NewTaskModal)
      const sessionData = {
        id: sessionId,
        mission_title: title,
        status: "processing",
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        agent_config_name: "general",
        model_id: null,
        latest_message_id: null,
        latest_message_role: null,
        latest_message_content: null,
        latest_message_timestamp: new Date().toISOString(),
        agent_cwd: "/workspace", // Backend will handle repo-specific workspace
        base_dir: "/workspace",
        archived_at: null,
        backgroundProcessing: true,
      };

      // Insert session into Mission Control store
      const store = useMissionControlStore.getState();
      const currentSessions = store.sessions;
      store.setSessions([sessionData, ...currentSessions]);

      // Show success and navigate to Mission Control
      toast.success("Mission started", {
        description: "Orchestra is preparing your workspace...",
      });

      // Add to recent projects (derive name from repo)
      try {
        const name =
          selectedRepoFullName.split("/").pop() || selectedRepoFullName;
        recentProjectsManager.add({
          name,
          path: `/workspace/${name}`, // Backend will set up proper workspace path
          lastAccessed: Date.now(),
        });
      } catch (error: any) {
        console.error(
          `[StartChat] Failed to add to recent projects:`,
          error.message
        );
      }

      // Navigate to Mission Control (no provision state needed)
      navigate("/mission-control", { replace: false });

      // Minimal web-first path: provision + start via /acs/converse/web
      try {
        const acs = getDefaultACSClient();
        await sendChatMessage({
          sessionId,
          message: prompt.trim(),
          userId: auth.user.id,
          agentConfigName: "general",
          acsClient: acs,
          autoMode: true,
          modelAutoMode: true,
          roleModelOverrides: AUTO_MODE_PRESETS.best,
          repoContextWeb: {
            repo_id: selectedRepoId,
            repo_full_name: selectedRepoFullName,
            branch: branch.trim(),
          },
        });
      } catch (err: any) {
        console.error(
          "[StartChat] /acs/converse/web failed via sendChatMessage:",
          err
        );
        toast.error("Workspace provisioning failed", {
          description: err?.message || "Unknown error",
        });
      }
    } catch (error) {
      console.error("[StartChat] Failed to create mission:", error);
      toast.error("Failed to start mission", {
        description: "Please try again",
      });
      setBusy(false);
    }
  }, [
    prompt,
    selectedRepoId,
    selectedRepoFullName,
    branch,
    auth.user?.id,
    navigate,
  ]);*/

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
              <h1 className="text-display text-white/90">Start a new task</h1>
              <p className="text-body text-white/70 mt-2">
                {loadingRepos
                  ? "Checking your GitHub connection..."
                  : githubRequired
                    ? "Connect your GitHub account to access your repositories."
                    : "Select a repository and branch, then describe what you want to do."}
              </p>

              {/* Step indicator - only show after loading */}
              {!loadingRepos && (
                <div className="mt-4 text-xs text-white/50">
                  {githubRequired
                    ? "Step 1 of 2: Connect GitHub"
                    : "Step 2 of 2: Configure your mission"}
                </div>
              )}
            </div>

            {/* Loading state - elegant spinner */}
            {loadingRepos && (
              <div className="flex items-center justify-center py-12">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
                  <div
                    className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-purple-500/30 animate-spin"
                    style={{
                      animationDuration: "1.5s",
                      animationDirection: "reverse",
                    }}
                  />
                </div>
              </div>
            )}

            {/* GitHub connect state - Elegant invitation */}
            {!loadingRepos && githubRequired && (
              <div
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/[0.03] to-blue-500/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 transition-all duration-500"
                style={{
                  animation:
                    "fade-in 0.5s ease-out, slide-in-from-top-2 0.5s ease-out",
                }}
              >
                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] via-transparent to-blue-500/[0.02] pointer-events-none" />

                {/* Floating orb for visual interest */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

                <div className="relative z-10 space-y-4">
                  {/* Icon and message */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                      {/* GitHub icon */}
                      <svg
                        className="w-5 h-5 text-white/60"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white/90 font-medium text-sm mb-1">
                        {noRepos
                          ? "No repositories available"
                          : "Connect your GitHub account"}
                      </h3>
                      <p className="text-white/50 text-xs leading-relaxed">
                        {noRepos
                          ? "The Orchestra GitHub App is installed, but no repositories are accessible. Install the app to another organization or create a repository, then refresh."
                          : "To start your mission, Orchestra needs access to your repositories. Install our GitHub App to enable seamless code collaboration."}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onConnectGitHub}
                      className="group relative px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] rounded-xl text-white/90 text-sm font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 to-blue-400/0 group-hover:from-purple-400/10 group-hover:to-blue-400/10 rounded-xl transition-all duration-300" />
                      <span className="relative z-10 flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        {noRepos ? "Add to Organization" : "Connect GitHub"}
                      </span>
                    </button>

                    <button
                      onClick={loadRepos}
                      className="px-4 py-2.5 text-white/40 hover:text-white/60 text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Refresh
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Setup form - only show when GitHub is connected and repos are available */}
            {showSetup && (
              <>
                {/* Repo + Branch */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-white/50 text-xs">Repository</label>
                    <select
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                      value={
                        selectedRepoId === "" ? "" : String(selectedRepoId)
                      }
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedRepoId(id);
                        const r = repos.find((x) => x.id === id);
                        setSelectedRepoFullName(r?.full_name || "");
                      }}
                      disabled={loadingRepos || repos.length === 0 || sending}
                    >
                      <option value="" disabled>
                        {loadingRepos
                          ? "Loading repositories…"
                          : repos.length
                            ? "Select repository…"
                            : "No repositories available"}
                      </option>
                      {repos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.full_name}
                        </option>
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
                  <label className="text-white/50 text-xs">
                    What should the agent do?
                  </label>
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
                    disabled={busy || !selectedRepoId || !prompt.trim()}
                    className={`group relative px-6 py-3 bg-white text-black rounded-xl font-medium transition-all duration-300 active:scale-100 disabled:opacity-50 cursor-pointer ${
                      busy ? "" : "hover:scale-105"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl opacity-0 transition-opacity ${
                        busy ? "" : "group-hover:opacity-100"
                      }`}
                    />
                    <span className="relative z-10">
                      {busy ? "Starting Mission…" : "Start Mission"}
                    </span>
                  </button>
                </div>

                <div className="text-center text-xs text-white/40">
                  You can change branches later. Branch listing will be added
                  soon.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
