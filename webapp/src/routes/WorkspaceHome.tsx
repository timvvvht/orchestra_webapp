import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CONFIG } from "@/config";
import { supabase } from "@/auth/SupabaseClient";
import { acsInfraApi } from "@/services/acsInfraApi";

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const { repoId: repoIdParam, branch: branchParam } = useParams();
  const repoIdFromUrl = repoIdParam ? Number(repoIdParam) : undefined;
  const branchFromUrl = branchParam || undefined;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "idle" | "ok" | "err"; msg: string }>({ kind: "idle", msg: "" });

  const api = useMemo(() => acsInfraApi({ baseUrl: CONFIG.ACS_BASE_URL }), []);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
      const res = await api.userOverview({ include_runtime_ready: false, max_events: 50 }, auth);
      if (!res.ok) throw new Error(res.data?.detail || `HTTP ${res.status}`);
      setData(res.data);
    } catch (e: any) {
      setToast({ kind: "err", msg: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    if (!data) return;
    const wss = data.workspaces || [];
    let pick: any = undefined;
    if (repoIdFromUrl && branchFromUrl) {
      pick = wss.find((w: any) => w.repo_id === repoIdFromUrl && (w.branch_name || "").toLowerCase() === branchFromUrl.toLowerCase());
    }
    if (!pick) pick = wss.find((w: any) => w.status === "ready") || wss[0];
    setSelectedWsId(pick?.id || null);
  }, [data, repoIdFromUrl, branchFromUrl]);

  const selectedWs = useMemo(() => data?.workspaces?.find((w: any) => w.id === selectedWsId) || null, [data, selectedWsId]);
  const wsName = selectedWs?.metadata?.repo_full_name || (selectedWs?.repo_id ? `repo_${selectedWs.repo_id}` : "Workspace");

  const onOpen = useCallback(() => {
    if (!selectedWs?.repo_id || !selectedWs.branch_name) return setToast({ kind: "err", msg: "Select a workspace" });
    navigate(`/start?repoId=${selectedWs.repo_id}&branch=${encodeURIComponent(selectedWs.branch_name)}`);
  }, [navigate, selectedWs]);

  const onNew = useCallback(() => {
    if (!selectedWs?.repo_id || !selectedWs.branch_name) return setToast({ kind: "err", msg: "Select a workspace" });
    navigate(`/start?repoId=${selectedWs.repo_id}&branch=${encodeURIComponent(selectedWs.branch_name)}&new=1`);
  }, [navigate, selectedWs]);

  if (loading) return <div className="min-h-screen bg-black text-white p-6">Loading…</div>;

  const workspaces = data?.workspaces || [];
  const hasWs = workspaces.length > 0;

  return (
    <div className="min-h-screen bg-black text-white grid grid-cols-[280px_1fr]">
      <aside className="border-r border-white/10 p-3">
        <div className="text-white/70 text-sm mb-2">My Workspaces</div>
        {!hasWs ? (
          <div className="text-white/50 text-sm p-3 rounded-lg border border-white/10 bg-white/5">No workspaces yet. Use the GitHub wizard.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces.map((w: any) => {
              const isActive = w.id === selectedWsId;
              const s = w.status || "unknown";
              return (
                <button key={w.id} onClick={() => setSelectedWsId(w.id)} className={`text-left p-3 rounded-lg border ${isActive ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <div className="text-white/90 text-sm truncate">{w.metadata?.repo_full_name || `repo_${w.repo_id}`}</div>
                  <div className="text-white/60 text-xs">#{w.branch_name}</div>
                  <div className="mt-1 text-[11px] inline-block px-2 py-0.5 rounded bg-white/10">{s === "ready" ? "Ready" : s === "provisioned" ? "Warming up" : s === "stopped" ? "Sleeping" : s === "failed" ? "Needs setup" : "Unknown"}</div>
                </button>
              )
            })}
          </div>
        )}
      </aside>

      <main className="p-6 space-y-6">
        {selectedWs ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-xs">Workspace</div>
                <div className="text-white/90 text-2xl">{wsName}</div>
                <div className="text-white/60 text-sm">#{selectedWs.branch_name}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white text-black rounded" onClick={onOpen}>Open</button>
                <button className="px-4 py-2 border border-white/20 bg-white/10 rounded" onClick={onNew}>New Session</button>
              </div>
            </div>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-white/80 text-sm">Sessions</div>
                <button className="text-white/70 text-sm" onClick={onNew}>New</button>
              </div>
              <div className="text-white/50 text-sm">List recent sessions tied to this workspace here, with one-click Continue.</div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-white/80 text-sm mb-1">Recent Activity</div>
              <div className="text-white/50 text-xs">Provisioning and changes timeline (human-readable).</div>
            </section>

            <details className="rounded-xl border border-white/10 bg-white/5 p-4">
              <summary className="text-white/70 cursor-pointer text-sm">Troubleshoot (Advanced)</summary>
              <div className="text-white/50 text-xs mt-2">Infra details appear only when needed. Keep this hidden by default.</div>
            </details>

            {toast.kind !== "idle" && (
              <div className={`p-3 rounded-lg border ${toast.kind === "err" ? "bg-red-500/10 border-red-500/30 text-red-200" : "bg-white/10 border-white/20 text-white/80"}`}>{toast.msg}</div>
            )}
          </>
        ) : (
          <div className="text-white/60">Select a workspace to begin.</div>
        )}
      </main>
    </div>
  );
}
