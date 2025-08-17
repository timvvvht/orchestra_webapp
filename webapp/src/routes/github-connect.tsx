// webapp/src/routes/GitHubConnectPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../auth/SupabaseClient";
import { acsGithubApi, withApiV1 } from "@/services/acsGitHubApi";

type StatusKind = "idle" | "working" | "success" | "error";
type Chip = "unknown" | "provisioned" | "ready" | "stopped" | "failed";
type Panel = {
  status: Chip;
  app_name?: string;
  machine_id?: string;
  region?: string;
  tes_internal_url?: string;
  cpu_count?: number | string;
  memory_mb?: number | string;
  volume_size_gb?: number | string;
  provisioned_at?: string;
  orchestrator?: boolean;
  notes?: string;
  updated_at?: string;
};

export default function GitHubConnectPage() {
  // Config + Auth
  const DEFAULT_ACS = (import.meta.env?.VITE_ACS_BASE_URL || "http://localhost:8001").replace(/\/$/, "");
  const [acsBase, setAcsBase] = useState<string>(DEFAULT_ACS);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);

  const [toast, setToast] = useState<{ kind: StatusKind; msg: string }>({ kind: "idle", msg: "Configure, then proceed step-by-step." });

  // Step states
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("testpassword123");
  const [installCount, setInstallCount] = useState<number | null>(null);
  const [repos, setRepos] = useState<Array<{ id: number; full_name: string }> | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>("");
  const [branch, setBranch] = useState("main");
  const [diag, setDiag] = useState<Panel | null>(null);
  const [autoPoll, setAutoPoll] = useState<boolean>(true);

  // Helpers
  const setInfo = (msg: string) => setToast({ kind: "working", msg });
  const setOk = (msg: string) => setToast({ kind: "success", msg });
  const setErr = (msg: string) => setToast({ kind: "error", msg });

  // Auth
  const onLogin = useCallback(async () => {
    setInfo("Logging in...");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setErr(error.message);
    setOk(`Logged in as ${data.user?.email}`);
  }, [email, password]);

  const onExchange = useCallback(async () => {
    setInfo("Exchanging Supabase token for ACS cookies…");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return setErr("No Supabase session. Login first.");
    const res = await api.exchangeSupabaseJwt({ access_token: session.access_token, user: session.user || {} });
    if (!res.ok) return setErr(res.data?.detail ?? "Exchange failed");
    setOk("ACS cookies set.");
  }, [api]);

  // GitHub connect
  const onInstallUrl = useCallback(async () => {
    setInfo("Fetching GitHub install URL…");
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.installUrl(auth);
    if (!res.ok) return setErr(res.data?.detail ?? "Failed to get install URL");
    window.open(res.data.install_url, "_blank", "noopener,noreferrer");
    setOk("Opened GitHub install in a new tab.");
  }, [api]);

  const onListInstalls = useCallback(async () => {
    setInfo("Listing installations…");
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.listInstallations(auth);
    if (!res.ok) return setErr(res.data?.detail ?? "Failed to list installations");
    setInstallCount(res.data.count);
    setOk(`Installations: ${res.data.count}`);
  }, [api]);

  const onListRepos = useCallback(async () => {
    setInfo("Fetching repositories…");
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.listRepos(auth);
    if (!res.ok) return setErr(res.data?.detail ?? "Failed to fetch repos");
    const mapped = (res.data.repositories || []).map((r: any) => ({ id: r.repo_id, full_name: r.repo_full_name }));
    setRepos(mapped);
    setOk(`Repos: ${mapped.length}`);
  }, [api]);

  // Provisioning
  const onProvisionWithRepo = useCallback(async () => {
    if (!selectedRepoId || !selectedRepoFullName || !branch.trim()) {
      return setErr("Select repo and branch.");
    }
    setInfo("Provisioning repo VM…");
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    
    const res = await api.provisionWithRepo({
      repo_id: selectedRepoId,
      repo_name: selectedRepoFullName,
      branch: branch.trim()
    }, auth);
    if (!res.ok) return setErr(res.data?.detail ?? "Provisioning failed");
    setOk("Provisioning initiated.");
  }, [api, selectedRepoId, selectedRepoFullName, branch]);

  const fetchDiagnostics = useCallback(async () => {
    if (!selectedRepoId || !branch.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.repoStatus({ repo_id: selectedRepoId, branch: branch.trim() }, auth);
    if (!res.ok) {
      setDiag(null);
      return setErr(res.data?.detail ?? "Diagnostics failed");
    }
    const d = res.data;
    const panel: Panel = {
      status: d.status || "unknown",
      app_name: d.app_name || "—",
      machine_id: d.machine_id || "—",
      region: d.region || "—",
      tes_internal_url: d.tes_internal_url || "—",
      cpu_count: d.cpu_count ?? "—",
      memory_mb: d.memory_mb ?? "—",
      volume_size_gb: d.volume_size_gb ?? "—",
      provisioned_at: d.provisioned_at || "—",
      orchestrator: !!d.has_orchestrator,
      notes:
        d.status === "ready" ? "TES health passed" :
        d.status === "provisioned" ? "Booting; waiting for TES health" :
        d.status === "failed" ? "Provisioning/health failed" :
        d.status === "stopped" ? "Machine stopped" : "Unknown",
      updated_at: new Date().toLocaleTimeString(),
    };
    setDiag(panel);
  }, [api, selectedRepoId, branch]);

  const onRunDiagnostics = useCallback(async () => {
    setInfo("Running diagnostics…");
    await fetchDiagnostics();
    setOk("Diagnostics updated.");
  }, [fetchDiagnostics]);

  const onStop = useCallback(async () => {
    if (!selectedRepoId || !branch.trim()) return setErr("Select repo and branch.");
    setInfo("Stopping VM…");
    const res = await api.stopRepo({ repo_id: selectedRepoId, branch: branch.trim() });
    if (!res.ok) return setErr(res.data?.detail ?? "Stop failed");
    setOk("VM stopped.");
    setDiag(null);
  }, [api, selectedRepoId, branch]);

  // Auto-poll while provisioned until ready or stopped
  useEffect(() => {
    if (!autoPoll || !selectedRepoId) return;
    let iv: any;
    iv = setInterval(() => fetchDiagnostics(), 5000);
    return () => clearInterval(iv);
  }, [autoPoll, selectedRepoId, fetchDiagnostics]);

  return (
    <div className="min-h-screen" style={{ background: "#000" }}>
      {/* Background gradient and glass container */}
      <div className="relative max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-white/90 text-2xl font-medium mb-6">GitHub Connect · Repo Provisioning</h1>

        {/* Toast */}
        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 text-sm text-white/80">
          {toast.msg}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stepper */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Configure + Login */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
              <div className="text-white/90 font-medium mb-3">1 · Authenticate</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs">ACS Server</label>
                  <input className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                         value={acsBase} onChange={(e) => setAcsBase(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <button className="px-4 py-2 rounded-lg bg-white text-black" onClick={onLogin}>Login (Supabase)</button>
                  <button className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10" onClick={onExchange}>Exchange → ACS</button>
                </div>
                <div>
                  <label className="text-white/50 text-xs">Email</label>
                  <input className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                         value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="text-white/50 text-xs">Password</label>
                  <input type="password" className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                         value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Step 2: Connect GitHub */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
              <div className="text-white/90 font-medium mb-3">2 · Connect GitHub</div>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 rounded-lg bg-white text-black" onClick={onInstallUrl}>Install App</button>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10" onClick={onListInstalls}>
                  My Installations {installCount !== null && <span className="ml-2 text-white/60">({installCount})</span>}
                </button>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10" onClick={onListRepos}>My Repos</button>
              </div>
              {repos && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/50 text-xs">Repository</label>
                    <select className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                            value={selectedRepoId ?? ""} onChange={(e) => {
                              const id = Number(e.target.value);
                              setSelectedRepoId(id);
                              const r = repos.find(x => x.id === id);
                              setSelectedRepoFullName(r?.full_name || "");
                            }}>
                      <option value="" disabled>Select repository…</option>
                      {repos.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/50 text-xs">Branch</label>
                    <input className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                           value={branch} onChange={(e) => setBranch(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Provision */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
              <div className="text-white/90 font-medium mb-3">3 · Provision & Control</div>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 rounded-lg bg-white text-black" onClick={onProvisionWithRepo}>Provision With Repo</button>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10" onClick={onRunDiagnostics}>Run Diagnostics</button>
                <button className="px-4 py-2 rounded-lg bg-red-600 text-white" onClick={onStop}>Stop VM</button>
                <label className="ml-auto text-white/60 text-xs flex items-center gap-2">
                  <input type="checkbox" checked={autoPoll} onChange={(e) => setAutoPoll(e.target.checked)} />
                  Auto-poll diagnostics
                </label>
              </div>
            </div>
          </div>

          {/* Right: Diagnostics */}
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
              <div className="text-white/80 text-sm mb-4">Diagnostics</div>
              {diag ? (
                <div className="space-y-3 text-white/80 text-sm">
                  <Row k="Status" v={
                    diag.status === "ready" ? "✅ Ready" :
                    diag.status === "provisioned" ? "⏳ Provisioned" :
                    diag.status === "stopped" ? "🛑 Stopped" :
                    diag.status === "failed" ? "❌ Failed" : "❓ Unknown"
                  } />
                  <Row k="App Name" v={diag.app_name} />
                  <Row k="Machine ID" v={diag.machine_id} />
                  <Row k="Region" v={diag.region} />
                  <Row k="CPU" v={String(diag.cpu_count)} />
                  <Row k="Memory (MB)" v={String(diag.memory_mb)} />
                  <Row k="Volume (GB)" v={String(diag.volume_size_gb)} />
                  <Row k="Orchestrator" v={diag.orchestrator ? "✅ Available" : "❌ Not available"} />
                  <Row k="TES URL" v={diag.tes_internal_url} />
                  <div className="mt-2 text-white/60">{diag.notes}</div>
                  <div className="text-white/40 text-xs">Updated: {diag.updated_at}</div>
                </div>
              ) : (
                <div className="text-white/50 text-sm">No diagnostics yet. Run Provision or Diagnostics.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/50">{k}</span>
      <span className="text-white/90">{v}</span>
    </div>
  );
}


