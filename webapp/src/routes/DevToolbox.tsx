import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PreviewFrame from "@/components/preview/PreviewFrame";
import CloudflaredFrame from "@/components/preview/CloudflaredFrame";
import IDEFrame from "@/components/ide/IDEFrame";
import { supabase } from "@/auth/SupabaseClient";

const DEFAULT_ACS = (import.meta.env?.VITE_ACS_BASE_URL || "https://orchestra-acs.fly.dev").replace(/\/$/, "");

type Status = { running: boolean; port?: number };

export default function DevToolboxRoute() {
  const navigate = useNavigate();
  const params = useParams();
  const initialSession = (params as any).sessionId || "";
  const [sessionId, setSessionId] = useState<string>(initialSession);
  const [acsBase, setAcsBase] = useState<string>(DEFAULT_ACS);
  const [useCustomCloudflared, setUseCustomCloudflared] = useState<boolean>(() => {
    try {
      return localStorage.getItem('devtoolbox_use_custom_cloudflared') === '1';
    } catch (e) {
      return false;
    }
  });
  const [customCloudflaredUrl, setCustomCloudflaredUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('devtoolbox_custom_cloudflared_url') || '';
    } catch (e) {
      return '';
    }
  });
  
  const effectiveBase = useCustomCloudflared && customCloudflaredUrl 
    ? customCloudflaredUrl 
    : acsBase;
  const normalizedBase = useMemo(() => effectiveBase.replace(/\/$/, "").trim(), [effectiveBase]);
  const [logs, setLogs] = useState<string[]>([]);
  const [authInfo, setAuthInfo] = useState<{ user_id?: string; email?: string } | null>(null);
  const [status, setStatus] = useState<Status>({ running: false });
  const [busy, setBusy] = useState(false);
  const [forceCloudflaredPreview, setForceCloudflaredPreview] = useState(false);

  // Dev proxy controls
  const [proxyIpv6, setProxyIpv6] = useState<string>("::1");
  const [proxyPort, setProxyPort] = useState<string>("80");
  const [proxyPath, setProxyPath] = useState<string>("");
  const [proxySrc, setProxySrc] = useState<string | null>(null);
  const [proxyLastStatus, setProxyLastStatus] = useState<number | null>(null);

  const [ideReloadSignal, setIdeReloadSignal] = useState(0);
  const [useSimplePreview, setUseSimplePreview] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(`devtoolbox_use_simple_preview_${initialSession}`);
      return v === "1";
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`devtoolbox_use_simple_preview_${sessionId}`, useSimplePreview ? "1" : "0");
    } catch (e) {
      // ignore
    }
  }, [useSimplePreview, sessionId]);

  useEffect(() => {
    try {
      localStorage.setItem('devtoolbox_use_custom_cloudflared', useCustomCloudflared ? '1' : '0');
    } catch (e) {
      // ignore
    }
  }, [useCustomCloudflared]);

  useEffect(() => {
    try {
      localStorage.setItem('devtoolbox_custom_cloudflared_url', customCloudflaredUrl);
    } catch (e) {
      // ignore
    }
  }, [customCloudflaredUrl]);

  const addLog = useCallback((m: string) => {
    setLogs((l) => [`${new Date().toLocaleTimeString()} • ${m}`, ...l.slice(0, 200)]);
  }, []);

  // Helper to get Supabase auth headers
  const getAuthHeaders = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }
    } catch (e) {
      console.warn("Failed to get Supabase session for auth headers:", e);
    }
    return {};
  }, []);

  // Always use absolute URLs from env base for DevToolbox
  const effectivePreviewUrl = useSimplePreview 
    ? `${normalizedBase}/api/v1/preview_simple/${sessionId || ""}/`
    : `${normalizedBase}/api/v1/preview/${sessionId || ""}/`;
  const effectiveIDEUrl = `${normalizedBase}/api/v1/ide/${sessionId || ""}/`;

  const refreshStatus = useCallback(async () => {
    if (!sessionId) return addLog("⚠️ No session id provided");
    try {
      const statusUrl = `${normalizedBase}/api/v1/preview/${sessionId}/status`;
      const authHeaders = await getAuthHeaders();
      const res = await fetch(statusUrl, { 
        credentials: "include",
        headers: {
          ...authHeaders
        }
      });
      const data = await res.json();
      setStatus(data);
      addLog(`Preview status ➜ ${JSON.stringify(data)}`);
    } catch (e: any) {
      addLog(`Preview status failed ➜ ${e?.message || String(e)}`);
    }
  }, [sessionId, normalizedBase, addLog, getAuthHeaders]);

  useEffect(() => {
    if (sessionId) refreshStatus();
  }, [sessionId, refreshStatus]);

  const checkAuth = useCallback(async () => {
    try {
      const authUrl = `${normalizedBase}/protected/user-info`;
      const authHeaders = await getAuthHeaders();
      const res = await fetch(authUrl, { 
        credentials: "include",
        headers: {
          ...authHeaders
        }
      });
      if (!res.ok) {
        addLog(`Auth check ❌ HTTP ${res.status}`);
        setAuthInfo(null);
        return;
      }
      const data = await res.json();
      setAuthInfo({ user_id: data.user_id, email: data.email });
      addLog(`Auth check ✅ user=${data.user_id} email=${data.email}`);
    } catch (e: any) {
      addLog(`Auth check failed ➜ ${e?.message || String(e)}`);
    }
  }, [normalizedBase, addLog, getAuthHeaders]);

  const fetchIDEDiagnostics = useCallback(async () => {
    if (!sessionId) return addLog('⚠️ No session id provided for IDE diagnostics');
    const debugUrl = `${normalizedBase}/api/v1/ide/${sessionId}/debug-echo`;

    // 1) Cookie-only (mimic iframe)
    try {
      const res = await fetch(debugUrl, { credentials: 'include' });
      let body;
      try { body = await res.json(); } catch { body = await res.text(); }
      addLog(`IDE diag (cookies-only) ➜ HTTP ${res.status} ${typeof body === 'string' ? body.slice(0,200) : JSON.stringify(body).slice(0,200)}`);
    } catch (e: any) {
      addLog(`IDE diag (cookies-only) failed ➜ ${e?.message || String(e)}`);
    }

    // 2) Auth header (Supabase JWT)
    try {
      const authHeaders = await getAuthHeaders();
      const res2 = await fetch(debugUrl, { credentials: 'include', headers: { ...authHeaders } });
      let body2;
      try { body2 = await res2.json(); } catch { body2 = await res2.text(); }
      addLog(`IDE diag (auth-header) ➜ HTTP ${res2.status} ${typeof body2 === 'string' ? body2.slice(0,200) : JSON.stringify(body2).slice(0,200)}`);
    } catch (e: any) {
      addLog(`IDE diag (auth-header) failed ➜ ${e?.message || String(e)}`);
    }
  }, [normalizedBase, sessionId, addLog, getAuthHeaders]);

  const exchangeCookies = useCallback(async () => {
    try {
      addLog("Exchanging Supabase JWT for ACS cookies…");
      
      // Get Supabase session for the exchange
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        addLog("❌ No Supabase session found - please log in first");
        return;
      }

      const exchangeUrl = `${normalizedBase}/api/v1/auth/oauth/exchange`;
      const res = await fetch(exchangeUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          provider: 'supabase',
          access_token: session.access_token,
          user: {
            email: session.user?.email || 'unknown@example.com'
          }
        })
      });
      const text = await (async () => { try { return await res.text(); } catch { return ''; } })();
      addLog(`Exchange ➜ HTTP ${res.status} ${text ? `| ${text.slice(0, 160)}` : ''}`);
      if (res.ok) {
        // Small delay for cookie propagation, then re-check auth
        await new Promise(r => setTimeout(r, 300));
        await checkAuth();
      }
    } catch (e: any) {
      addLog(`Exchange failed ➜ ${e?.message || String(e)}`);
    }
  }, [normalizedBase, checkAuth, addLog]);

  const buildProxyUrl = useCallback((ipv6: string, port: string | number, path?: string) => {
    const p = path ? String(path) : "";
    const q = new URLSearchParams();
    q.set("ipv6", ipv6);
    q.set("port", String(port));
    if (p) q.set("path", p);
    return `${normalizedBase}/api/v1/dev/proxy?${q.toString()}`;
  }, [normalizedBase]);

  const loadProxy = useCallback(async (autoExchange = true) => {
    if (!proxyIpv6 || !proxyPort) return addLog("⚠️ Provide ipv6 and port");
    const url = buildProxyUrl(proxyIpv6, proxyPort, proxyPath);
    addLog(`Loading via dev-proxy ➜ ${url}`);

    try {
      const authHeaders = await getAuthHeaders();
      let res: Response | null = null;
      try {
        res = await fetch(url, { method: "GET", credentials: "include", headers: { ...authHeaders } });
      } catch (e: any) {
        addLog(`Proxy fetch failed (network/CORS) ➜ ${e?.message || String(e)}`);
        // Still set iframe; caller may rely on cookies in iframe
        setProxySrc(url);
        return;
      }

      setProxyLastStatus(res.status);
      if (res.status === 401 && autoExchange) {
        addLog("Proxy returned 401 — attempting cookie exchange and retry...");
        await exchangeCookies();
        // small delay before retry
        await new Promise((r) => setTimeout(r, 300));
        try {
          const authHeaders2 = await getAuthHeaders();
          const res2 = await fetch(url, { method: "GET", credentials: "include", headers: { ...authHeaders2 } });
          setProxyLastStatus(res2.status);
          if (res2.ok) {
            setProxySrc(url);
            addLog(`Proxy ready ➜ HTTP ${res2.status}`);
            return;
          }
          addLog(`Proxy retry returned HTTP ${res2.status}`);
          setProxySrc(url); // still try to render in iframe
          return;
        } catch (e: any) {
          addLog(`Proxy retry failed ➜ ${e?.message || String(e)}`);
          setProxySrc(url);
          return;
        }
      }

      if (res.ok) {
        addLog(`Proxy reachable ➜ HTTP ${res.status}`);
        setProxySrc(url);
      } else {
        addLog(`Proxy returned HTTP ${res.status}`);
        setProxySrc(url); // still allow iframe to attempt render
      }
    } catch (e: any) {
      addLog(`Proxy load error ➜ ${e?.message || String(e)}`);
    }
  }, [proxyIpv6, proxyPort, proxyPath, buildProxyUrl, addLog, getAuthHeaders, exchangeCookies]);

  const handleIdeAuthFailure = useCallback(async () => {
    // Try exchange when IDE reports no auth
    addLog("IDE diagnostics indicated no auth — attempting exchange cookies automatically...");
    await exchangeCookies();
    // Small delay, then refresh the IDE iframe by bumping a reload signal if needed
    await new Promise((r) => setTimeout(r, 400));
    setIdeReloadSignal((s) => s + 1);
  }, [exchangeCookies, addLog]);

  const startPreview = useCallback(async () => {
    if (!sessionId) return addLog("⚠️ No session id provided");
    setBusy(true);
    try {
      // Immediate relief for possible auth race: retry on 401 a few times
      const startUrl = useSimplePreview 
        ? `${normalizedBase}/api/v1/preview_simple/${sessionId}/start`
        : `${normalizedBase}/api/v1/preview/${sessionId}/start`;
      const authHeaders = await getAuthHeaders();
      const doFetch = async () => fetch(startUrl, {
        method: "POST",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({}),
      });
      let res = await doFetch();
      if (res.status === 401) {
        addLog("Auth race suspected on Start – retrying (1/3)...");
        await new Promise(r => setTimeout(r, 350));
        res = await doFetch();
      }
      if (res.status === 401) {
        addLog("Auth race suspected on Start – retrying (2/3)...");
        await new Promise(r => setTimeout(r, 650));
        res = await doFetch();
      }
      if (res.status === 401) {
        addLog("Auth race suspected on Start – retrying (3/3)...");
        await new Promise(r => setTimeout(r, 1200));
        res = await doFetch();
      }
      const body = await (async () => {
        try {
          return await res.text();
        } catch {
          return "";
        }
      })();
      addLog(`Start ➜ HTTP ${res.status} ${body ? `| ${body.slice(0, 140)}` : ""}`);
      await refreshStatus();
    } catch (e: any) {
      addLog(`Start failed ➜ ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [sessionId, normalizedBase, refreshStatus, addLog, getAuthHeaders, useSimplePreview]);

  const stopPreview = useCallback(async () => {
    if (!sessionId) return addLog("⚠️ No session id provided");
    setBusy(true);
    try {
      const stopUrl = useSimplePreview 
        ? `${normalizedBase}/api/v1/preview_simple/${sessionId}/stop`
        : `${normalizedBase}/api/v1/preview/${sessionId}/stop`;
      const authHeaders = await getAuthHeaders();
      const doFetch = async () => fetch(stopUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          ...authHeaders
        }
      });
      let res = await doFetch();
      if (res.status === 401) {
        addLog("Auth race suspected on Stop – retrying (1/3)...");
        await new Promise(r => setTimeout(r, 350));
        res = await doFetch();
      }
      if (res.status === 401) {
        addLog("Auth race suspected on Stop – retrying (2/3)...");
        await new Promise(r => setTimeout(r, 650));
        res = await doFetch();
      }
      if (res.status === 401) {
        addLog("Auth race suspected on Stop – retrying (3/3)...");
        await new Promise(r => setTimeout(r, 1200));
        res = await doFetch();
      }
      const body = await (async () => {
        try {
          return await res.text();
        } catch {
          return "";
        }
      })();
      addLog(`Stop ➜ HTTP ${res.status} ${body ? `| ${body.slice(0, 140)}` : ""}`);
      await refreshStatus();
    } catch (e: any) {
      addLog(`Stop failed ➜ ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [sessionId, normalizedBase, refreshStatus, addLog, getAuthHeaders, useSimplePreview]);

  return (
    <div className="h-full w-full p-6 text-white/90">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Developer Toolbox</h1>
          <p className="text-white/60 text-sm mt-1">Verify ACS Preview and IDE integration for a session.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 text-white/80 text-sm"
            onClick={checkAuth}
            title="Check ACS auth cookies"
          >
            Check Auth
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 text-white/80 text-sm"
            onClick={exchangeCookies}
            title="Exchange Supabase JWT for ACS cookies"
          >
            Exchange Cookies
          </button>
          <a
            href={`${normalizedBase}/ping`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm"
            title="Ping ACS"
          >
            Ping ACS ↗
          </a>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur mb-6 p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60 w-20">
              {useCustomCloudflared ? 'Cloudflared' : 'ACS Base'}
            </label>
            <input
              className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/10 outline-none focus:border-white/25 text-sm"
              value={useCustomCloudflared ? customCloudflaredUrl : acsBase}
              onChange={(e) => useCustomCloudflared ? setCustomCloudflaredUrl(e.target.value) : setAcsBase(e.target.value)}
              placeholder={useCustomCloudflared ? "https://your-tunnel.trycloudflare.com" : "https://your-acs.example.com"}
            />
            <label className="flex items-center gap-1 text-xs text-white/70 whitespace-nowrap">
              <input
                type="checkbox"
                checked={useCustomCloudflared}
                onChange={(e) => setUseCustomCloudflared(e.target.checked)}
                className="w-3 h-3"
              />
              <span>Cloudflared</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60 w-20">Session ID</label>
            <input
              className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/10 outline-none focus:border-white/25 text-sm"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            <button
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm"
              onClick={() => navigate(`/dev/toolbox/${sessionId}`)}
            >
              Go
            </button>
          </div>
        </div>
        {/* Effective URLs */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
          <div className="mr-1">URLs:</div>
          {useCustomCloudflared && (
            <div className="px-2 py-1 rounded bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs">
              🌩️ Cloudflared
            </div>
          )}
          <div className="flex items-center gap-2">
            <code className="px-2 py-1 rounded bg-black/40 border border-white/10">{effectivePreviewUrl}</code>
            <a className="underline" href={effectivePreviewUrl} target="_blank" rel="noreferrer">Open</a>
            <button
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              onClick={() => navigator.clipboard.writeText(effectivePreviewUrl)}
            >
              Copy
            </button>
          </div>
          <span className="opacity-30">|</span>
          <div className="flex items-center gap-2">
            <code className="px-2 py-1 rounded bg-black/40 border border-white/10">{effectiveIDEUrl}</code>
            <a className="underline" href={effectiveIDEUrl} target="_blank" rel="noreferrer">Open</a>
            <button
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              onClick={() => navigator.clipboard.writeText(effectiveIDEUrl)}
            >
              Copy
            </button>
          </div>
          {authInfo && (
            <>
              <span className="opacity-30">|</span>
              <span className="text-emerald-300/80">Authed: {authInfo.email || authInfo.user_id}</span>
            </>
          )}
        </div>
      </div>

      {/* Two Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview Card */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/2 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${status.running ? "bg-emerald-400" : "bg-red-400"}`} />
              <div className="font-medium">Preview</div>
              <div className="text-xs text-white/60">
                {status.running ? `Running on :${status.port}` : "Stopped"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-white/80 mr-2">
                <input
                  type="checkbox"
                  checked={useSimplePreview}
                  onChange={(e) => setUseSimplePreview(e.target.checked)}
                  className="w-3 h-3"
                />
                <span>Simple (5173/3000)</span>
              </label>
              <button
                onClick={refreshStatus}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
              >
                Refresh
              </button>
              <button
                onClick={startPreview}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs disabled:opacity-50"
              >
                Start
              </button>
              <button
                onClick={stopPreview}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs disabled:opacity-50"
              >
                Stop
              </button>
              {useCustomCloudflared && customCloudflaredUrl && (
                <button
                  onClick={() => setForceCloudflaredPreview(true)}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs"
                  title="Force load cloudflared preview (bypass status check)"
                >
                  Force Load
                </button>
              )}
            </div>
          </div>
          <div className="h-[420px]">
            {sessionId && (status.running || forceCloudflaredPreview) ? (
              <>
                {useCustomCloudflared && customCloudflaredUrl ? (
                  <CloudflaredFrame url={customCloudflaredUrl} />
                ) : (
                  <PreviewFrame 
                    acsBaseUrl={normalizedBase} 
                    sessionId={sessionId}
                  />
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-white/50 text-sm">
                {sessionId 
                  ? (useCustomCloudflared && customCloudflaredUrl 
                      ? "Click Force Load to load cloudflared preview" 
                      : "Preview not running. Click Start.")
                  : "Enter a session ID to load preview."
                }
              </div>
            )}
          </div>
        </div>

        {/* IDE Card */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/2 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
              <div className="font-medium">IDE</div>
              <div className="text-xs text-white/60">OpenVSCode Server</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
                href={effectiveIDEUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in New Tab
              </a>
              <button
                onClick={() => fetchIDEDiagnostics()}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
                title="Run IDE diagnostics from DevToolbox (parent request)"
              >
                IDE Diagnostics
              </button>
            </div>
          </div>
          <div className="h-[420px]">
            {sessionId ? (
              <IDEFrame 
                sessionId={sessionId} 
                className="w-full h-full" 
                style={{ border: 0 }}
                reloadSignal={ideReloadSignal}
                onAuthFailed={handleIdeAuthFailure}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-white/50 text-sm">
                Enter a session ID to load IDE.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dev Proxy Panel */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Dev Proxy (IPv6 testing)</div>
          <div className="text-xs text-white/60">Use with caution — dev only</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <input className="px-2 py-1 rounded bg-black/20" value={proxyIpv6} onChange={(e) => setProxyIpv6(e.target.value)} placeholder="IPv6 (e.g. ::1 or 2604:...)" />
          <input className="px-2 py-1 rounded bg-black/20" value={proxyPort} onChange={(e) => setProxyPort(e.target.value)} placeholder="Port" />
          <input className="px-2 py-1 rounded bg-black/20" value={proxyPath} onChange={(e) => setProxyPath(e.target.value)} placeholder="Path (optional)" />
          <div className="flex gap-2">
            <button onClick={() => loadProxy(true)} className="px-3 py-1 rounded bg-emerald-600 text-white">Load</button>
            <button onClick={() => { setProxySrc(null); setProxyLastStatus(null); }} className="px-3 py-1 rounded bg-gray-600 text-white">Clear</button>
          </div>
        </div>

        <div className="mb-2 text-xs text-white/60">Proxy status: {proxyLastStatus ?? "-"}</div>
        <div className="h-60 border border-white/10 bg-black/80">
          {proxySrc ? (
            <iframe src={proxySrc} className="w-full h-full" style={{ border: 0 }} />
          ) : (
            <div className="h-full flex items-center justify-center text-white/40">No proxy target loaded.</div>
          )}
        </div>
      </div>

      {/* Logs */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Diagnostics</div>
          <button
            className="text-xs text-white/60 hover:text-white/90"
            onClick={() => setLogs([])}
          >
            Clear
          </button>
        </div>
        <div className="h-44 overflow-auto rounded-xl bg-black/70 border border-white/10 p-3 font-mono text-xs text-white/80">
          {logs.length === 0 ? (
            <div className="text-white/40">No diagnostics yet.</div>
          ) : (
            logs.map((l, i) => <div key={i} className="whitespace-pre-wrap">{l}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
