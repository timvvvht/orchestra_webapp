import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/auth/SupabaseClient";
import { useAuth } from "@/auth/AuthContext";
// Removed acsInfraApi dependency - use Supabase-only queries for dashboard
import { useSessionRepoContextStore } from "@/stores/sessionRepoContextStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import ReactMemoExoticComponent = React.MemoExoticComponent;

type WorkspaceItem = {
  id: string;
  repo_id?: number;
  branch_name: string;
  status: "ready" | "provisioned" | "stopped" | "failed" | string;
  metadata?: { repo_full_name?: string };
  representativeSession?: any;
};

type SessionRow = {
  id: string;
  name?: string | null;
  last_message_at?: string | null;
  status?: string | null;
  repo_id?: number | null;
  repo_full_name?: string | null;
  branch?: string | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, booted } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sessionsByRepoId, setSessionsByRepoId] = useState<Record<string, SessionRow[]>>({});
  const [loadingSessions, setLoadingSessions] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  
  const fetchOverview = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // Ensure we have a user id
      const uid = user?.id;
      if (!uid) throw new Error("Missing user id");

      // Fetch recent sessions for the user and derive workspaces from metadata
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", uid)
        .is("archived_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(300);

      if (error) throw error;

      const rows = data || [];

      // Group sessions into workspaces by repo+branch if available (metadata preferred)
      const map = new Map<string, any>();
      for (const s of rows) {
        const meta = (s.metadata as any) || {};
        const repoId = s.repo_id ?? meta.repo_id;
        const repoFull = s.repo_full_name ?? meta.repo_full_name ?? meta.repoFullName;
        const branch = s.branch ?? meta.branch ?? meta.branch_name ?? "main";

        let key: string;
        if (repoId) key = `repo:${repoId}::${String(branch).toLowerCase()}`;
        else if (repoFull) key = `repoName:${repoFull}::${String(branch).toLowerCase()}`;
        else key = `session:${s.id}`;

        const existing = map.get(key);
        if (!existing) {
          map.set(key, { key, repoId, repoFull, branch, last_message_at: s.last_message_at, representative: s });
        } else {
          const curTime = existing.last_message_at ? new Date(existing.last_message_at).getTime() : 0;
          const newTime = s.last_message_at ? new Date(s.last_message_at).getTime() : 0;
          if (newTime > curTime) {
            existing.last_message_at = s.last_message_at;
            existing.representative = s;
          }
        }
      }

      const now = Date.now();
      // Filter out session-only / local (desktop) sessions that don't have repo context
      // We prefer showing only web workspaces which have either a repo_id or a repo_full_name
      const workspaceValues = Array.from(map.values());
      const webOnly = workspaceValues.filter((w: any) => {
        const hasRepoId = w.repoId != null && w.repoId !== 0;
        const hasRepoName = !!(w.repoFull && String(w.repoFull).trim().length > 0);
        return hasRepoId || hasRepoName;
      });

      const workspaceCards: WorkspaceItem[] = webOnly.map((w: any) => {
        const status = (() => {
          if (!w.last_message_at) return "sleeping";
          const age = now - new Date(w.last_message_at).getTime();
          return age <= 24 * 60 * 60 * 1000 ? "ready" : "sleeping";
        })();

        return {
          id: w.key,
          repo_id: w.repoId,
          branch_name: w.branch || "main",
          status,
          metadata: { repo_full_name: w.repoFull || undefined },
          representativeSession: w.representative,
        };
      });

      setWorkspaces(workspaceCards);
    } catch (err: any) {
      console.error("[Dashboard] Failed to fetch workspaces:", err?.message || err);
      setError(err?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { 
    // Wait for auth boot to avoid racing while session is still loading
    if (!booted) return;
    if (!isAuthenticated) return; // AuthGate should prevent this, but double-guard
    fetchOverview(); 
  }, [fetchOverview, booted, isAuthenticated]);

  const loadSessionsForWorkspace = useCallback(async (ws: WorkspaceItem) => {
    const key = ws.id;
    if (loadingSessions[key]) return;
    
    setLoadingSessions(prev => ({ ...prev, [key]: true }));
    try {
      const uid = user?.id;
      if (!uid) return;

      // Fetch recent sessions for this workspace
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", uid)
        .is("archived_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);

      if (!error && data) {
        // Filter sessions that match this workspace's repo/branch
        const repoFullName = ws.metadata?.repo_full_name;
        const branch = ws.branch_name;
        
        const filtered = data.filter(s => {
          const meta = (s.metadata as any) || {};
          const sessionRepo = s.repo_full_name || meta.repo_full_name || meta.repoFullName;
          const sessionBranch = s.branch || meta.branch || meta.branch_name || "main";
          
          if (ws.repo_id) {
            // Match by repo_id if available
            const sessionRepoId = s.repo_id || meta.repo_id;
            return sessionRepoId === ws.repo_id && String(sessionBranch).toLowerCase() === String(branch).toLowerCase();
          } else if (repoFullName) {
            // Match by repo name and branch
            return sessionRepo === repoFullName && String(sessionBranch).toLowerCase() === String(branch).toLowerCase();
          }
          return false;
        }).slice(0, 10);

        setSessionsByRepoId(s => ({ ...s, [key]: filtered as SessionRow[] }));
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoadingSessions(prev => ({ ...prev, [key]: false }));
    }
  }, [loadingSessions, user]);

  const onExpand = useCallback(async (ws: WorkspaceItem) => {
    const isExpanding = expanded !== ws.id;
    setExpanded(isExpanding ? ws.id : null);
    
    if (isExpanding && !sessionsByRepoId[ws.id]) {
      await loadSessionsForWorkspace(ws);
    }
  }, [expanded, sessionsByRepoId, loadSessionsForWorkspace]);

  // deprecated pill; replaced by a subtle status dot in the new design
  const statusChip = (s: string) => null;

  const continueSession = async (ws: WorkspaceItem) => {
    // Use representative session if no expanded sessions loaded
    const repoSessions = sessionsByRepoId[ws.id] || [];
    const latest = repoSessions[0] || ws.representativeSession;
    
    if (!latest) {
      // No sessions, redirect to new task builder instead of session view
      return newTask(ws);
    }

    // Frontload repo context from metadata if available
    const meta = (latest.metadata as any) || {};
    const repoId = ws.repo_id ?? meta.repo_id;
    const repoFullName = (ws.metadata?.repo_full_name || meta.repo_full_name || meta.repoFullName || "").trim();
    const branch = ws.branch_name || meta.branch || meta.branch_name || "main";

    if (repoFullName || typeof repoId === "number") {
      useSessionRepoContextStore.getState().setRepoContext(latest.id, {
        // @ts-ignore allow optional
        repo_id: typeof repoId === "number" ? repoId : undefined,
        // normalize name
        // @ts-ignore allow optional
        repo_full_name: repoFullName ? repoFullName.toLowerCase() : undefined,
        branch: String(branch),
      } as any);

      // Compute or create a workspace and navigate to the canonical project route
      const uid = user?.id ?? "single-player-user";
      const repoIdNum = typeof repoId === "number" ? repoId : 0;
      const repoNameForCreate = repoFullName || `repo_${repoIdNum}`;

      console.info("[Dashboard] attempting createWorkspace", {
        userId: uid,
        repoId: repoIdNum,
        repoFullName: repoNameForCreate,
        branch,
        sessionId: latest.id,
      });

      try {
        const workspace = await useWorkspaceStore.getState().createWorkspace({
          userId: uid,
          repoId: repoIdNum,
          repoFullName: repoNameForCreate,
          branch: branch,
          name: repoNameForCreate,
        });

        console.info("[Dashboard] createWorkspace success", { workspaceId: workspace.id, sessionId: latest.id });
        navigate(`/project/${encodeURIComponent(workspace.id)}/${latest.id}`);
        return;
      } catch (err: any) {
        console.error("[Dashboard] createWorkspace failed", {
          error: err?.message || err,
          userId: uid,
          repoId: repoIdNum,
          repoFullName: repoNameForCreate,
          branch,
          sessionId: latest.id,
        });

        // Fallback: compute deterministic hashed workspace id locally (userId:repoId:branch)
        try {
          const workspaceKey = `${uid}:${repoIdNum}:${branch}`;
          const hashed = await (async (input: string) => {
            const enc = new TextEncoder().encode(input);
            const digest = await crypto.subtle.digest("SHA-256", enc);
            const bytes = new Uint8Array(digest);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          })(workspaceKey);

          console.info("[Dashboard] fallback hashed workspace id computed", { hashed, workspaceKey, sessionId: latest.id });
          navigate(`/project/${encodeURIComponent(hashed)}/${latest.id}`);
          return;
        } catch (hashErr) {
          console.error("[Dashboard] failed to compute fallback hashed workspace id", { error: hashErr, sessionId: latest.id });
        }
      }
    }

    // final fallback if no repo context available or hashing failed
    console.warn("[Dashboard] no repo context available, navigating to unknown project route", { sessionId: latest.id });
    navigate(`/project/unknown/${latest.id}`);
  };

  const openSession = async (session: SessionRow, ws: WorkspaceItem) => {
    // Frontload repo context from session metadata if available
    const meta = (session.metadata as any) || {};
    const repoId = ws.repo_id ?? meta.repo_id;
    const repoFullName = (ws.metadata?.repo_full_name || meta.repo_full_name || meta.repoFullName || "").trim();
    const branch = ws.branch_name || meta.branch || meta.branch_name || "main";

    if (repoFullName || typeof repoId === "number") {
      useSessionRepoContextStore.getState().setRepoContext(session.id, {
        // @ts-ignore allow optional
        repo_id: typeof repoId === "number" ? repoId : undefined,
        // @ts-ignore allow optional
        repo_full_name: repoFullName ? repoFullName.toLowerCase() : undefined,
        branch: String(branch),
      } as any);

      const uid = user?.id ?? "single-player-user";
      const repoIdNum = typeof repoId === "number" ? repoId : 0;
      const repoNameForCreate = repoFullName || `repo_${repoIdNum}`;

      console.info("[Dashboard] attempting createWorkspace (openSession)", {
        userId: uid,
        repoId: repoIdNum,
        repoFullName: repoNameForCreate,
        branch,
        sessionId: session.id,
      });

      try {
        const workspace = await useWorkspaceStore.getState().createWorkspace({
          userId: uid,
          repoId: repoIdNum,
          repoFullName: repoNameForCreate,
          branch: branch,
          name: repoNameForCreate,
        });

        console.info("[Dashboard] createWorkspace success (openSession)", { workspaceId: workspace.id, sessionId: session.id });
        navigate(`/project/${encodeURIComponent(workspace.id)}/${session.id}`);
        return;
      } catch (err: any) {
        console.error("[Dashboard] createWorkspace failed (openSession)", {
          error: err?.message || err,
          userId: uid,
          repoId: repoIdNum,
          repoFullName: repoNameForCreate,
          branch,
          sessionId: session.id,
        });

        try {
          const workspaceKey = `${uid}:${repoIdNum}:${branch}`;
          const hashed = await (async (input: string) => {
            const enc = new TextEncoder().encode(input);
            const digest = await crypto.subtle.digest("SHA-256", enc);
            const bytes = new Uint8Array(digest);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          })(workspaceKey);

          console.info("[Dashboard] fallback hashed workspace id computed (openSession)", { hashed, workspaceKey, sessionId: session.id });
          navigate(`/project/${encodeURIComponent(hashed)}/${session.id}`);
          return;
        } catch (hashErr) {
          console.error("[Dashboard] failed to compute fallback hashed workspace id (openSession)", { error: hashErr, sessionId: session.id });
        }
      }
    }

    navigate(`/project/unknown/${session.id}`);
  };

  const newTask = (ws: WorkspaceItem) => {
    const repoFullName = ws.metadata?.repo_full_name;
    const branch = ws.branch_name || "main";
    
    if (ws.repo_id && repoFullName) {
      navigate(`/start?repoId=${ws.repo_id}&branch=${encodeURIComponent(branch)}`);
    } else if (repoFullName) {
      // Pass repo name if available, let StartChat resolve repo_id
      navigate(`/start?repoFullName=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}`);
    } else {
      // Fallback to generic start
      navigate(`/start`);
    }
  };

  if (!booted) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="text-white/70">Checking authentication…</span>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="text-white/70">Loading your dashboard…</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="text-red-300 mb-2">{error}</div>
          <button
            onClick={fetchOverview}
            className="px-4 py-2 bg-white text-black rounded hover:bg-white/90"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const hasWorkspaces = workspaces.length > 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="px-6 py-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-light text-white/90">Your work</h1>
          <p className="text-white/60 mt-1">Continue where you left off. Nothing more, nothing less.</p>
        </header>

        {/* Filters */}
        <DashboardControls
          workspaces={workspaces}
          sessionsByRepoId={sessionsByRepoId}
          onConnectGitHub={() => navigate("/github-connect")}
          onNewTask={() => navigate("/start")}
          expanded={expanded}
          setExpanded={(id) => setExpanded(id)}
          loadingSessions={loadingSessions}
          loadSessionsForWorkspace={loadSessionsForWorkspace}
          onOpenSession={openSession}
          onContinueSession={continueSession}
          onNewTaskWorkspace={newTask}
        />
      </div>
    </main>
  );
}

type ControlsProps = {
  workspaces: WorkspaceItem[];
  sessionsByRepoId: Record<string, SessionRow[]>;
  loadingSessions: Record<string, boolean>;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onConnectGitHub: () => void;
  onNewTask: () => void;
  loadSessionsForWorkspace: (ws: WorkspaceItem) => Promise<void>;
  onOpenSession: (s: SessionRow, ws: WorkspaceItem) => void;
  onContinueSession: (ws: WorkspaceItem) => void;
  onNewTaskWorkspace: (ws: WorkspaceItem) => void;
};

const DashboardControls: React.FC<ControlsProps> = ({
  workspaces,
  sessionsByRepoId,
  loadingSessions,
  expanded,
  setExpanded,
  onConnectGitHub,
  onNewTask,
  loadSessionsForWorkspace,
  onOpenSession,
  onContinueSession,
  onNewTaskWorkspace,
}) => {
  const [filter, setFilter] = useState<"all" | "ready" | "sleeping">("all");
  const [showInsights, setShowInsights] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return workspaces;
    return workspaces.filter((w) => (filter === "ready" ? w.status === "ready" : w.status === "sleeping"));
  }, [filter, workspaces]);

  const hasWorkspaces = filtered.length > 0;

  const statusDot = (s: string) => {
    const color =
      s === "ready" ? "bg-green-500" : s === "provisioned" ? "bg-amber-500" : s === "failed" ? "bg-red-500" : "bg-slate-500";
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} aria-hidden="true" />;
  };

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(["all", "ready", "sleeping"] as const).map((k) => {
          const active = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                active ? "bg-white text-black" : "text-white/70 hover:text-white/90 hover:bg-white/10"
              }`}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => setShowInsights((s) => !s)} className="text-sm text-white/60 hover:text-white/90 transition-colors">
            {showInsights ? "Hide insights" : "Show insights"}
          </button>
        </div>
      </div>

      {showInsights && (
        <div className="border border-white/10 rounded-xl bg-white/[0.03] p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <Stat label="Workspaces" value={workspaces.length} />
            <Stat label="Ready" value={workspaces.filter((w) => w.status === "ready").length} />
            <Stat label="Sessions (loaded)" value={Object.values(sessionsByRepoId).flat().length} />
            <Stat
              label="Active Today"
              value={Object.values(sessionsByRepoId)
                .flat()
                .filter(
                  (s) => s.last_message_at && new Date(s.last_message_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length}
            />
          </div>
        </div>
      )}

      {!hasWorkspaces ? (
        <div className="p-8 border border-white/10 rounded-xl bg-white/[0.03] text-center">
          <div className="text-white/80 text-lg mb-2">No repositories yet</div>
          <div className="text-white/60 mb-4">Connect GitHub to get started.</div>
          <button onClick={onConnectGitHub} className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors">
            Connect GitHub
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.02]">
          {filtered.map((ws) => {
            const repoName = ws.metadata?.repo_full_name || `repo_${ws.repo_id}`;
            const isOpen = expanded === ws.id;
            const repoSessions = sessionsByRepoId[ws.id] || [];
            const isLoading = loadingSessions[ws.id];

            return (
              <li key={ws.id} className="group">
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <button className="flex-1 text-left outline-none" onClick={() => {
                    const next = isOpen ? null : ws.id;
                    setExpanded(next);
                    if (!isOpen && repoSessions.length === 0) {
                      loadSessionsForWorkspace(ws);
                    }
                  }} aria-expanded={isOpen}>
                    <div className="flex items-center gap-2">
                      {statusDot(ws.status)}
                      <div className="text-white/90 truncate">{repoName}</div>
                      <div className="text-white/50 text-xs">#{ws.branch_name}</div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
                      onClick={() => onContinueSession(ws)}
                      disabled={ws.status === "failed"}
                    >
                      Continue
                    </button>
                    <button
                      className="px-3 py-1.5 border border-white/15 text-white/90 rounded-lg text-sm hover:bg-white/05 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : ws.id)}
                      aria-label={isOpen ? "Hide details" : "Show details"}
                    >
                      {isOpen ? "Hide" : "Details"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="mt-2 rounded-lg bg-white/[0.02] border border-white/10 p-3">
                      <div className="text-white/70 text-sm font-medium mb-2">Recent sessions</div>
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-white/50 text-sm">
                          <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                          Loading…
                        </div>
                      ) : repoSessions.length === 0 ? (
                        <div className="text-white/50 text-sm py-2">None yet. Start a new task in this repo.</div>
                      ) : (
                        <div className="space-y-2">
                          {repoSessions.slice(0, 3).map((session) => (
                            <div key={session.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.04] transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="text-white/80 text-sm truncate">
                                  {session.name || `Session ${session.id.slice(0, 8)}…`}
                                </div>
                                <div className="text-white/40 text-xs">
                                  {session.status || "idle"} • {session.last_message_at ? new Date(session.last_message_at).toLocaleString() : "No activity"}
                                </div>
                              </div>
                              <button
                                className="ml-3 text-xs px-2 py-1 border border-white/15 rounded hover:bg-white/10 transition-colors"
                                onClick={() => onOpenSession(session, ws)}
                              >
                                Open
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <button className="text-sm text-white/70 hover:text-white/90 transition-colors" onClick={() => onNewTaskWorkspace(ws)}>
                          New task
                        </button>
                        {repoSessions.length > 3 && (
                          <div className="text-xs text-white/50">And {repoSessions.length - 3} more…</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3">
      <div className="text-white/50 text-xs">{label}</div>
      <div className="text-white/90 text-xl font-light">{value}</div>
    </div>
  );
}