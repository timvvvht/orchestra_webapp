import React, { useEffect, useMemo, useState } from "react";
import { CONFIG } from "@/config";
import { acsInfraApi } from "@/services/acsInfraApi";
import { supabase } from "../auth/SupabaseClient";

export default function GlobalInfraDashboard() {
  const getInitialBase = () => {
    try {
      const saved = localStorage.getItem("globalInfra.acsBase");
      if (saved && saved.trim().length > 0) return saved;
    } catch {}
    return CONFIG.ACS_BASE_URL;
  };
  const [acsBase, setAcsBase] = useState<string>(getInitialBase());
  const api = useMemo(() => acsInfraApi({ baseUrl: acsBase }), [acsBase]);

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeRuntimePing, setIncludeRuntimePing] = useState(false);

  const fetchGlobal = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
      const res = await api.globalOverview({ include_runtime_ping: includeRuntimePing }, auth);
      if (!res.ok) throw new Error(res.data?.detail || `HTTP ${res.status}`);
      setData(res.data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGlobal(); }, [acsBase, includeRuntimePing]);
  useEffect(() => { try { localStorage.setItem("globalInfra.acsBase", acsBase); } catch {} }, [acsBase]);

  const s = data?.summary || {};
  const machines = data?.machines || [];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-white/90">Global TES Machines</h1>
          <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                className="flex-1 md:flex-none px-2 py-1 rounded bg-white/10 border border-white/10 text-white min-w-[260px] md:w-[360px]"
                value={acsBase}
                onChange={(e) => setAcsBase(e.target.value)}
                placeholder="https://orchestra-acs.fly.dev"
              />
              <button className="px-2 py-1 rounded bg-white/10 border border-white/10" onClick={() => setAcsBase("https://orchestra-acs.fly.dev")}>Use localhost:8001</button>
              <button className="px-2 py-1 rounded bg-white/10 border border-white/10" onClick={() => setAcsBase(CONFIG.ACS_BASE_URL)}>Use default</button>
            </div>
            <label className="flex items-center gap-2 text-white/70">
              <input type="checkbox" checked={includeRuntimePing} onChange={e => setIncludeRuntimePing(e.target.checked)} />
              Ping runtime
            </label>
            <button className="px-3 py-1 rounded bg-white text-black" onClick={fetchGlobal}>Refresh</button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <div className="text-sm font-medium">Error</div>
            <div className="text-xs mt-1 break-all">{error}</div>
          </div>
        )}
        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-white/70">Loading…</div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card k="Apps" v={s.apps_count} />
              <Card k="Machines" v={s.machines_count} />
              <Card k="Owners Resolved" v={s.owners_resolved} />
              <Card k="Timestamp" v={s.timestamp ? new Date(s.timestamp * 1000).toLocaleString() : "-"} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-white/80 text-sm mb-2">By State</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.by_state || {}).map(([k, v]) => (
                  <span key={k} className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">{k}: {String(v)}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-white/80 text-sm mb-2">By Region</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.by_region || {}).map(([k, v]) => (
                  <span key={k} className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">{k}: {String(v)}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-white/80 text-sm mb-2">Machines</div>
              {machines.length === 0 ? (
                <div className="text-white/50 text-sm">No machines.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left p-2">App</th>
                        <th className="text-left p-2">Machine</th>
                        <th className="text-left p-2">Owner (user_id)</th>
                        <th className="text-left p-2">State</th>
                        <th className="text-left p-2">Region</th>
                        <th className="text-left p-2">CPU/Mem</th>
                        <th className="text-left p-2">Image</th>
                        <th className="text-left p-2">Uptime</th>
                        <th className="text-left p-2">Ping</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machines.map((m: any) => (
                        <tr key={m.machine_id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-2">{m.app_name}</td>
                          <td className="p-2">{m.machine_id}</td>
                          <td className="p-2">{m.owner_user_id || "-"}</td>
                          <td className="p-2">{m.state}</td>
                          <td className="p-2">{m.region || "-"}</td>
                          <td className="p-2">{m.cpu || "-"} / {m.memory_mb || "-"}</td>
                          <td className="p-2">{(m.image || "").slice(0, 32)}</td>
                          <td className="p-2">{m.uptime_seconds != null ? formatDuration(m.uptime_seconds) : "-"}</td>
                          <td className="p-2">{m.runtime_ping_ok === true ? "OK" : (m.runtime_ping_ok === false ? "Fail" : "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <details>
                <summary className="text-white/80 cursor-pointer">Raw JSON</summary>
                <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
              </details>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ k, v }: { k: string; v?: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-white/60 text-xs">{k}</div>
      <div className="text-white/90 text-xl">{v ?? "-"}</div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
