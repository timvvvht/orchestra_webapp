// webapp/src/routes/GitHubConnectPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../auth/SupabaseClient";
import { acsGithubApi, withApiV1 } from "@/services/acsGitHubApi";
import { getDefaultACSClient } from "@/services/acs";
import { sendChatMessage } from "@/utils/sendChatMessage";
import { createSessionFast } from "@/hooks/useCreateSessionFast";
import { getFirehose } from "@/services/GlobalServiceManager";

type StatusKind = "idle" | "working" | "success" | "error";
type Chip = "unknown" | "provisioned" | "ready" | "stopped" | "failed";
type Panel = {
  status: Chip;
  app_name?: string;
  machine_id?: string;
  volume_id?: string;
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
  const [forceRedeploy, setForceRedeploy] = useState(false);
  const [diag, setDiag] = useState<Panel | null>(null);
  const [autoPoll, setAutoPoll] = useState<boolean>(true);

  // Lifecycle operations state
  const [newTesImage, setNewTesImage] = useState("registry.fly.io/orchestra-tes:latest");
  const [cleanupOldMachine, setCleanupOldMachine] = useState(true);
  const [cleanupApp, setCleanupApp] = useState(false);


  // Startables state
  const [startables, setStartables] = useState<Array<any>>([]);
  const [startablesLoadedAt, setStartablesLoadedAt] = useState<string | null>(null);

  // Shell state
  const [shellCmd, setShellCmd] = useState<string>("");
  const [shellOut, setShellOut] = useState<string>("");
  const [shellErr, setShellErr] = useState<string>("");
  const [shellCode, setShellCode] = useState<number | null>(null);
  const [shellSessionId, setShellSessionId] = useState<string | null>(null);
  const [tesVerification, setTesVerification] = useState<any>(null);
  const [healthCheck, setHealthCheck] = useState<any>(null);

  // Mini chat + SSE state for e2e testing
  const [chatPrompt, setChatPrompt] = useState<string>("");
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [sseEvents, setSseEvents] = useState<any[]>([]);
  const [onlyCurrentSession, setOnlyCurrentSession] = useState<boolean>(true);
  const [sseStatus, setSseStatus] = useState<{remoteConnected:boolean; relayConnected:boolean}>({remoteConnected:false, relayConnected:false});

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
      branch: branch.trim(),
      force_redeploy: forceRedeploy
    }, auth);
    if (!res.ok) return setErr(res.data?.detail ?? "Provisioning failed");
    setOk("Provisioning initiated.");
  }, [api, selectedRepoId, selectedRepoFullName, branch, forceRedeploy]);

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
      volume_id: d.volume_id || "—",
      region: d.region || "—",
      tes_internal_url: d.tes_internal_url || "—",
      cpu_count: d.cpu_count ?? "—",
      memory_mb: d.memory_mb ?? "—",
      volume_size_gb: d.volume_size_gb ?? "—",
      provisioned_at: d.provisioned_at || "—",
      orchestrator: !!d.has_orchestrator,
      notes: [
        d.status === "ready" ? "TES health passed" :
        d.status === "provisioned" ? "Booting; waiting for TES health" :
        d.status === "failed" ? "Provisioning/health failed" :
        d.status === "stopped" ? "Machine stopped" : "Unknown",
        (d.metadata?.desired_tes_image || d.details?.metadata?.desired_tes_image || d.desired_tes_image) ? `desired: ${d.metadata?.desired_tes_image || d.details?.metadata?.desired_tes_image || d.desired_tes_image}` : null,
        (d.metadata?.current_tes_image || d.details?.metadata?.current_tes_image || d.current_tes_image) ? `current: ${d.metadata?.current_tes_image || d.details?.metadata?.current_tes_image || d.current_tes_image}` : null,
      ].filter(Boolean).join(" • "),
      updated_at: new Date().toLocaleTimeString(),
    };
    setDiag(panel);
  }, [api, selectedRepoId, branch]);

  const onRunDiagnostics = useCallback(async () => {
    setInfo("Running diagnostics…");
    await fetchDiagnostics();
    setOk("Diagnostics updated.");
  }, [fetchDiagnostics]);

  const onTestNetworking = useCallback(async () => {
    if (!selectedRepoId || !branch.trim()) return setErr("Select repo and branch.");
    setInfo("Testing TES networking via ACS…");
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.repoHealth({ repo_id: selectedRepoId, branch: branch.trim() }, auth);
    if (!res.ok) return setErr(res.data?.detail ?? "Repo health failed");
    setHealthCheck(res.data);
    setOk(`Health ${res.data.http_status}`);
  }, [api, selectedRepoId, branch]);

  const onProvisionAndDiagnose = useCallback(async () => {
    if (!selectedRepoId || !selectedRepoFullName || !branch.trim()) {
      return setErr("Select repo and branch.");
    }
    setInfo("Provisioning repo VM and polling health…");

    // Disable autoPoll to avoid conflicts during single-flow execution
    const wasAutoPoll = autoPoll;
    setAutoPoll(false);

    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;

    // 1) Kick off provisioning
    const res = await api.provisionWithRepo({
      repo_id: selectedRepoId,
      repo_name: selectedRepoFullName,
      branch: branch.trim(),
    }, auth);
    if (!res.ok) {
      return setErr(res.data?.detail ?? "Provisioning failed");
    }

    // 2) Poll diagnostics until ready or timeout
    const started = Date.now();
    const timeoutMs = 5 * 60 * 1000; // 5 minutes
    const intervalMs = 5000;

    async function tryOnce() {
      const statusRes = await api.repoStatus({ repo_id: selectedRepoId, branch: branch.trim() }, auth);
      if (!statusRes.ok) {
        setDiag(null);
        setErr(statusRes.data?.detail ?? "Diagnostics failed");
        return false;
      }
      const d = statusRes.data;
      const panel: Panel = {
        status: (d.status as Chip) || "unknown",
        app_name: d.app_name ?? "—",
        machine_id: d.machine_id ?? "—",
        volume_id: d.volume_id ?? "—",
        region: d.region ?? "—",
        tes_internal_url: d.tes_internal_url ?? "—",
        cpu_count: d.cpu_count ?? d.details?.cpu_count ?? "—",
        memory_mb: d.memory_mb ?? d.details?.memory_mb ?? "—",
        volume_size_gb: d.volume_size_gb ?? d.details?.volume_size_gb ?? "—",
        provisioned_at: d.provisioned_at ?? "—",
        orchestrator: !!(d.details?.has_orchestrator ?? d.has_orchestrator),
        notes: [
          d.status === "ready" ? "TES health passed" :
          d.status === "provisioned" ? "Booting; waiting for TES health" :
          d.status === "failed" ? "Provisioning/health failed" :
          d.status === "stopped" ? "Machine stopped" : "Unknown",
          (d.metadata?.desired_tes_image || d.details?.metadata?.desired_tes_image || d.desired_tes_image) ? `desired: ${d.metadata?.desired_tes_image || d.details?.metadata?.desired_tes_image || d.desired_tes_image}` : null,
          (d.metadata?.current_tes_image || d.details?.metadata?.current_tes_image || d.current_tes_image) ? `current: ${d.metadata?.current_tes_image || d.details?.metadata?.current_tes_image || d.current_tes_image}` : null,
        ].filter(Boolean).join(" • "),
        updated_at: new Date().toLocaleTimeString(),
      };
      setDiag(panel);
      return d.status === "ready";
    }

    // Immediate check, then interval
    let ready = await tryOnce();
    while (!ready && Date.now() - started < timeoutMs) {
      await new Promise(r => setTimeout(r, intervalMs));
      ready = await tryOnce();
    }

    if (ready) {
      setOk("Ready – TES health passed.");
    } else {
      setErr("Timed out waiting for TES readiness.");
    }

    // Optionally restore autoPoll after completion
    // setAutoPoll(wasAutoPoll);
  }, [api, selectedRepoId, selectedRepoFullName, branch, autoPoll]);

  const onStop = useCallback(async () => {
    if (!selectedRepoId || !branch.trim()) return setErr("Select repo and branch.");
    setInfo("Stopping VM…");
    const res = await api.stopRepo({ repo_id: selectedRepoId, branch: branch.trim() });
    if (!res.ok) return setErr(res.data?.detail ?? "Stop failed");
    setOk("VM stopped.");
    setDiag(null);
  }, [api, selectedRepoId, branch]);

  // Startables handlers
  const onShowStartables = useCallback(async () => {
    setInfo("Fetching startable machines…");
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.userStartables(auth);
    if (!res.ok) return setErr(res.data?.detail ?? "Failed to fetch startables");
    setStartables(res.data?.items || []);
    setStartablesLoadedAt(new Date().toLocaleTimeString());
    setOk(`Found ${res.data?.count ?? 0} items`);
  }, [api]);

  const onStartThis = useCallback(async (item: any) => {
    if (!item?.repo_id || !item?.branch) return setErr("Missing repo_id or branch for start");
    setInfo(`Starting ${item.repo_full_name ?? item.repo_id}#${item.branch}…`);
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.startRepo({ repo_id: item.repo_id, branch: item.branch }, auth);
    if (!res.ok) return setErr(res.data?.detail ?? "Start failed");
    setOk("Start issued. Refreshing diagnostics…");
    if (selectedRepoId === item.repo_id && branch.trim() === item.branch) {
      setTimeout(() => fetchDiagnostics(), 1500);
    }
    setTimeout(() => onShowStartables(), 1500);
  }, [api, fetchDiagnostics, selectedRepoId, branch, onShowStartables]);

  const onDiagnoseThis = useCallback(async (item: any) => {
    if (!item?.repo_id || !item?.branch) return setErr("Missing repo_id/branch for diagnostics");
    setSelectedRepoId(item.repo_id);
    setSelectedRepoFullName(item.repo_full_name || "");
    setBranch(item.branch);
    setInfo(`Fetching diagnostics for ${item.repo_full_name ?? item.repo_id}#${item.branch}…`);
    await fetchDiagnostics();
    setOk("Diagnostics updated.");
  }, [fetchDiagnostics]);

  // Wire FirehoseMux to display SSE events
  useEffect(() => {
    try {
      const fh = getFirehose();
      if (!fh) return;
      const unsub = fh.subscribe((ev: any) => {
        if (onlyCurrentSession && chatSessionId && ev.session_id !== chatSessionId) return;
        setSseEvents(prev => [ev, ...prev].slice(0, 300));
      });
      const unsubStatus = fh.onStatus((st: any) => setSseStatus(st));
      return () => { unsub && unsub(); unsubStatus && unsubStatus(); };
    } catch (e) {
      console.warn("[GitHubConnect] FirehoseMux not available", e);
    }
  }, [onlyCurrentSession, chatSessionId]);

  // Start a mission using the web-first flow (createSessionFast → /acs/converse/web)
  const onStartMission = useCallback(async () => {
    if (!selectedRepoId || !selectedRepoFullName || !branch.trim()) {
      return setErr("Select repo and branch.");
    }
    if (!chatPrompt.trim()) {
      return setErr("Enter a prompt to start.");
    }
    try {
      setInfo("Creating session…");
      const cs = await createSessionFast({ sessionName: `Mission: ${chatPrompt.slice(0,60)}`, agentConfigId: "general" });
      if (!cs?.success || !cs.sessionId) {
        return setErr(cs?.error || "Failed to create session");
      }
      setChatSessionId(cs.sessionId);

      const acs = getDefaultACSClient();
      try { await acs.streaming.connect(cs.sessionId); } catch (e) { console.warn("SSE connect failed (non-fatal)", e); }

      setInfo("Provisioning + starting via /acs/converse/web…");
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || "unknown";
      await sendChatMessage({
        sessionId: cs.sessionId,
        message: chatPrompt.trim(),
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
      setOk("Mission started. Watch SSE panel for events.");
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }, [selectedRepoId, selectedRepoFullName, branch, chatPrompt]);

  // Lifecycle Operations
  const onUpdateImage = useCallback(async () => {
    if (!selectedRepoId || !branch.trim()) return setErr("Select repo and branch.");
    if (!newTesImage.trim()) return setErr("Enter TES image.");
    
    setInfo("Updating TES image…");
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    
    const res = await api.updateRepoImage({
      repo_id: selectedRepoId,
      branch: branch.trim(),
      new_tes_image: newTesImage.trim(),
      cleanup_old_machine: cleanupOldMachine
    }, auth);
    
    if (!res.ok) return setErr(res.data?.detail ?? "Image update failed");
    setOk("Image update initiated. Check diagnostics for progress.");
    
    // Refresh diagnostics after a brief delay
    setTimeout(() => fetchDiagnostics(), 2000);
  }, [api, selectedRepoId, branch, newTesImage, cleanupOldMachine, fetchDiagnostics]);

  const onDeleteVolume = useCallback(async () => {
    if (!diag?.volume_id) return setErr("No volume ID available. Run diagnostics first.");
    
    const confirmed = window.confirm(
      `⚠️ WARNING: This will permanently delete the volume and all data!\n\n` +
      `Volume ID: ${diag.volume_id}\n` +
      `Repo: ${selectedRepoFullName}#${branch}\n\n` +
      `This action cannot be undone. Continue?`
    );
    
    if (!confirmed) return;
    
    setInfo("Deleting volume…");
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    
    const res = await api.deleteVolume({
      volume_id: diag.volume_id,
      cleanup_machine: true,
      cleanup_app: cleanupApp
    }, auth);
    
    if (!res.ok) return setErr(res.data?.detail ?? "Volume deletion failed");
    setOk("Volume deleted successfully.");
    setDiag(null);
    
    // Refresh diagnostics to confirm deletion
    setTimeout(() => fetchDiagnostics(), 2000);
  }, [api, diag?.volume_id, selectedRepoFullName, branch, cleanupApp, fetchDiagnostics]);





  const onVerifyTes = useCallback(async () => {
    if (!diag?.tes_internal_url) return setErr("No TES URL – provision first.");
    setInfo("Verifying TES implementation…");
    try {
      const res = await fetch(`${acsBase}/api/v1/tes-shell/verify-tes?tes_url=${encodeURIComponent(diag.tes_internal_url)}`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.detail || "TES verification failed");
        return;
      }
      setTesVerification(data);
      setOk(`TES verified: ${data.verification}`);
    } catch (e: any) {
      setErr(String(e));
    }
  }, [acsBase, diag?.tes_internal_url]);

  const onRunShell = useCallback(async () => {
    if (!diag?.tes_internal_url) return setErr("No TES URL – provision first.");
    if (!shellCmd.trim()) return setErr("Enter a command");
    setInfo("Running shell command…");
    try {
      const res = await fetch(`${acsBase}/api/v1/tes-shell/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tes_url: diag.tes_internal_url,
          session_id: shellSessionId,
          command: shellCmd,
          initial_cwd: "/workspace",
          timeout_seconds: 60,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.detail || "Shell exec failed");
        return;
      }
      setShellSessionId(data.session_id);
      setShellOut(data.stdout || "");
      setShellErr(data.stderr || "");
      setShellCode(typeof data.exit_code === "number" ? data.exit_code : null);
      setOk("Shell done");
    } catch (e: any) {
      setErr(String(e));
    }
  }, [acsBase, diag?.tes_internal_url, shellCmd, shellSessionId]);

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
                <button className="px-4 py-2 rounded-lg bg-white text-black" onClick={onProvisionAndDiagnose}>Provision + Diagnose</button>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10" onClick={onProvisionWithRepo}>Provision With Repo</button>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10" onClick={onShowStartables}>Show Startables</button>
                <label className="text-white/60 text-xs flex items-center gap-2">
                  <input type="checkbox" checked={forceRedeploy} onChange={(e) => setForceRedeploy(e.target.checked)} />
                  Force update image if different
                </label>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10" onClick={onRunDiagnostics}>Run Diagnostics</button>
                <button className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10" onClick={onTestNetworking}>Test TES Networking (/health)</button>
                <button className="px-4 py-2 rounded-lg bg-red-600 text-white" onClick={onStop}>Stop VM</button>
                <label className="ml-auto text-white/60 text-xs flex items-center gap-2">
                  <input type="checkbox" checked={autoPoll} onChange={(e) => setAutoPoll(e.target.checked)} />
                  Auto-poll diagnostics
                </label>
              </div>
            </div>

            {/* Step 4: Lifecycle Operations */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
              <div className="text-white/90 font-medium mb-3">4 · Lifecycle Operations</div>
              
              {/* Image Update Section */}
              <div className="mb-4">
                <div className="text-white/70 text-sm mb-2">Update TES Image</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                  <div className="md:col-span-2">
                    <label className="text-white/50 text-xs">New TES Image</label>
                    <input 
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                      value={newTesImage} 
                      onChange={(e) => setNewTesImage(e.target.value)}
                      placeholder="registry.fly.io/orchestra-tes:latest"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white"
                      onClick={onUpdateImage}
                      disabled={!selectedRepoId || !branch.trim() || !newTesImage.trim()}
                    >
                      Update Image
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <label className="text-white/60 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={cleanupOldMachine} 
                      onChange={(e) => setCleanupOldMachine(e.target.checked)} 
                    />
                    Cleanup old machine
                  </label>
                  <span className="text-white/40">
                    💡 Updates image while preserving volume data
                  </span>
                </div>
              </div>

              {/* Volume Delete Section */}
              <div>
                <div className="text-white/70 text-sm mb-2">Delete Volume (⚠️ Destructive)</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button 
                    className="px-4 py-2 rounded-lg bg-red-700 text-white"
                    onClick={onDeleteVolume}
                    disabled={!diag?.volume_id || diag.volume_id === "—"}
                  >
                    🗑️ Delete Volume
                  </button>
                  <label className="text-white/60 text-xs flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={cleanupApp} 
                      onChange={(e) => setCleanupApp(e.target.checked)} 
                    />
                    Also cleanup app if no other volumes
                  </label>
                </div>
                <div className="text-white/40 text-xs">
                  ⚠️ WARNING: This permanently deletes all data in the volume. Cannot be undone.
                </div>
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
                  {healthCheck && (
                    <div className="mt-3 p-2 rounded bg-black/40 text-xs">
                      <div className="text-white/70 mb-1">TES Health via ACS</div>
                      <div className="text-white/60">URL: {healthCheck.tes_url}</div>
                      <div className="text-white/60">HTTP: {healthCheck.http_status}</div>
                      {healthCheck.body && (
                        <pre className="mt-1 text-white/70 whitespace-pre-wrap max-h-40 overflow-auto">{JSON.stringify(healthCheck.body, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-white/50 text-sm">No diagnostics yet. Run Provision or Diagnostics.</div>
              )}
            </div>

            {/* Shell Panel */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
              <div className="text-white/80 text-sm mb-3">Shell (MVP)</div>
              
              {/* TES Verification */}
              <div className="mb-3">
                <button className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs" onClick={onVerifyTes}>
                  Verify TES Implementation
                </button>
                {tesVerification && (
                  <div className="mt-2 p-2 rounded bg-black/40 text-xs">
                    <div className="text-white/90 mb-1">{tesVerification.verification}</div>
                    <div className="text-white/60">Implementation: {tesVerification.implementation}</div>
                    {tesVerification.version_data && (
                      <div className="text-white/60">Version: {tesVerification.version_data.version}</div>
                    )}
                    <div className="text-white/60">
                      Supports command: {tesVerification.supports_execute_in_runner_session_with_command ? "✅" : "❌"}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-2">
                <input className="flex-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10"
                       placeholder="echo hello && uname -a"
                       value={shellCmd} onChange={e => setShellCmd(e.target.value)} />
                <button className="px-4 py-2 rounded-lg bg-white text-black" onClick={onRunShell}>Run</button>
              </div>
              {shellCode !== null && (
                <div className="text-white/70 text-xs mb-2">exit_code: {shellCode}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-white/60 text-xs mb-1">stdout</div>
                  <pre className="p-2 rounded bg-black/60 text-green-200 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{shellOut}</pre>
                </div>
                <div>
                  <div className="text-white/60 text-xs mb-1">stderr</div>
                  <pre className="p-2 rounded bg-black/60 text-red-200 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{shellErr}</pre>
                </div>
              </div>
            </div>

            {/* Mini Chat (E2E) */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
              <div className="text-white/80 text-sm mb-3">Mini Chat (E2E)</div>

              {/* Start Mission Section */}
              <div className="space-y-2 mb-3">
                <div className="text-white/60 text-xs">Repository</div>
                <div className="text-white/80 text-xs">
                  {selectedRepoFullName || "—"}
                  <span className="text-white/50">{selectedRepoFullName ? `#${branch}` : ""}</span>
                </div>
                <div>
                  <label className="text-white/50 text-xs">Prompt</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/[0.06] text-white/90 border border-white/10 min-h-[80px]"
                    placeholder="Describe what to do…"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        onStartMission();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-lg bg-white text-black disabled:opacity-50"
                    onClick={onStartMission}
                    disabled={!selectedRepoId || !chatPrompt.trim()}
                    title={!selectedRepoId ? "Select a repository and branch first" : "Cmd/Ctrl+Enter to start"}
                  >
                    Start Mission
                  </button>
                  <div className="text-white/40 text-xs">Uses createSessionFast + /acs/converse/web</div>
                </div>
              </div>

              {/* Session & SSE Status */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-white/60 text-xs">Session:</div>
                <div className="text-white/80 text-xs font-mono truncate max-w-[220px]" title={chatSessionId || "—"}>
                  {chatSessionId ? `${chatSessionId.slice(0,8)}…${chatSessionId.slice(-4)}` : "—"}
                </div>
                <button
                  className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs border border-white/10 disabled:opacity-50"
                  onClick={() => chatSessionId && navigator.clipboard.writeText(chatSessionId)}
                  disabled={!chatSessionId}
                >Copy</button>
                <div className="ml-auto flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-white/60">
                    <span className={`inline-block w-2 h-2 rounded-full ${sseStatus.remoteConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                    Remote
                  </span>
                  <span className="flex items-center gap-1 text-white/60">
                    <span className={`inline-block w-2 h-2 rounded-full ${sseStatus.relayConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                    Relay
                  </span>
                </div>
              </div>

              {/* SSE Controls */}
              <div className="flex items-center gap-2 mb-3">
                <label className="text-white/60 text-xs flex items-center gap-1">
                  <input type="checkbox" checked={onlyCurrentSession} onChange={(e) => setOnlyCurrentSession(e.target.checked)} />
                  Filter: current session only
                </label>
                <button
                  className="ml-auto px-3 py-1 rounded bg-white/10 text-white border border-white/20 text-xs"
                  onClick={() => setSseEvents([])}
                >Clear</button>
                <button
                  className="px-3 py-1 rounded bg-white/10 text-white border border-white/20 text-xs"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(JSON.stringify(sseEvents, null, 2));
                      setOk('Events copied');
                    } catch (e) {
                      setErr('Copy failed');
                    }
                  }}
                  disabled={!sseEvents.length}
                >Copy Events</button>
              </div>

              {/* SSE Events Feed */}
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {sseEvents.length === 0 ? (
                  <div className="text-white/50 text-xs">No events yet. Start a mission to see live SSE.</div>
                ) : (
                  sseEvents.map((ev, idx) => {
                    const type = ev?.event_type || 'unknown';
                    const ts = ev?.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '';
                    const sid = ev?.session_id || '';
                    const eid = ev?.event_id || '';
                    let preview = '';
                    if (typeof ev?.delta === 'string') preview = ev.delta.slice(0, 200);
                    else if (ev?.tool_call?.name) preview = `tool: ${ev.tool_call.name}`;
                    else if (ev?.error) preview = String(ev.error).slice(0, 200);
                    else if (ev?.data) preview = JSON.stringify(ev.data).slice(0, 200);

                    const chipClass = type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-200'
                      : type === 'tool_call' ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                      : type === 'tool_result' ? 'bg-green-500/10 border-green-500/30 text-green-200'
                      : 'bg-white/10 border-white/20 text-white/80';

                    return (
                      <div key={idx} className="p-2 rounded bg-black/30 border border-white/10">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-0.5 rounded border ${chipClass}`}>{type}</span>
                          <span className="text-white/50">{ts}</span>
                        </div>
                        <div className="mt-1 text-white/60 text-[11px]">
                          <span title={sid}>sid: {sid ? `${sid.slice(0,8)}…${sid.slice(-4)}` : '—'}</span>
                          <span className="ml-3" title={eid}>eid: {eid ? `${eid.slice(0,6)}…` : '—'}</span>
                        </div>
                        {preview && (
                          <div className="mt-1 text-white/80 text-xs whitespace-pre-wrap">{preview}</div>
                        )}
                        <details className="mt-1">
                          <summary className="text-white/50 text-xs cursor-pointer">Details</summary>
                          <pre className="mt-1 p-2 rounded bg-black/60 text-white/70 text-[11px] whitespace-pre-wrap overflow-auto">{JSON.stringify(ev, null, 2)}</pre>
                        </details>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Startables Panel */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
              <div className="text-white/80 text-sm mb-3">Startables</div>
              {startables.length ? (
                <div className="space-y-2 text-white/80 text-xs">
                  <div className="text-white/50 mb-1">
                    {`Items: ${startables.length}`} {startablesLoadedAt ? `· Updated: ${startablesLoadedAt}` : ""}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {startables.map((it, i) => (
                      <div key={i} className="p-2 rounded bg-black/30 border border-white/10 flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-white/90">
                            {it.repo_full_name ?? `repo:${it.repo_id}`}<span className="text-white/50">{`#${it.branch ?? "?"}`}</span>
                          </div>
                          <div className="text-white/60">
                            {`app: ${it.app_name ?? "—"} · machine: ${it.machine_id ?? "—"} · db:${it.db_status} rt:${it.runtime_state ?? "?"}`}
                          </div>
                          <div className="text-white/40">
                            {`cpu:${it.cpu_count ?? "—"} mem:${it.memory_mb ?? "—"}MB vol:${it.volume_size_gb ?? "—"}GB`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded bg-white/10 text-white border border-white/20"
                            onClick={() => onDiagnoseThis(it)}
                          >
                            Diagnose
                          </button>
                          <button
                            className="px-3 py-1 rounded bg-white text-black disabled:opacity-50"
                            disabled={!it.startable}
                            onClick={() => onStartThis(it)}
                          >Start</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-white/50 text-sm">Click “Show Startables” to load.</div>
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


