import React, { useEffect, useMemo, useState } from "react";
import { CONFIG } from "@/config";
import { acsInfraApi } from "@/services/acsInfraApi";
import { supabase } from "../auth/SupabaseClient";

export default function InfraDashboard() {
  const acsBase = CONFIG.ACS_BASE_URL;
  const api = useMemo(() => acsInfraApi({ baseUrl: acsBase }), [acsBase]);

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeRuntimeReady, setIncludeRuntimeReady] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
      const res = await api.userOverview({ include_runtime_ready: includeRuntimeReady, max_events: 100 }, auth);
      if (!res.ok) throw new Error(res.data?.detail || `HTTP ${res.status}`);
      setData(res.data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOverview(); }, [includeRuntimeReady]);

  if (loading) return <div className="min-h-screen bg-black text-white p-6">Loading…</div>;
  if (error) return <div className="min-h-screen bg-black text-white p-6">Error: {error}</div>;
  if (!data) return <div className="min-h-screen bg-black text-white p-6">No data</div>;

  const s = data.summary || {};

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-white/90">Infra Dashboard</h1>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-white/70">
              <input type="checkbox" checked={includeRuntimeReady} onChange={e => setIncludeRuntimeReady(e.target.checked)} />
              Include runtime checks
            </label>
            <button className="px-3 py-1 rounded bg-white text-black" onClick={fetchOverview}>Refresh</button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card k="Installations" v={s.installations_count} />
          <Card k="Repos" v={s.repos_accessible_count} />
          <Card k="Workspaces" v={s.workspaces_count} />
          <Card k="Infra Maps" v={s.infra_count} />
          <Card k="Volumes" v={s.volumes_count} />
        </div>

        {/* Status distribution */}
        {s.statuses && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-white/80 text-sm mb-2">Statuses</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(s.statuses).map(([k, v]: any) => (
                <span key={k} className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">{k}: {String(v)}</span>
              ))}
            </div>
          </div>
        )}

        <Section title="Installations" data={data.github?.installations} />
        <Section title="Repos" data={data.github?.repos} />
        <Section title="Workspaces" data={data.workspaces} />
        <Section title="Infra Mappings" data={data.infra_mappings} />
        <Section title="Volumes" data={data.volumes} />
        <Section title="Events" data={data.events} />

        {/* Raw JSON */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <details>
            <summary className="text-white/80 cursor-pointer">Raw JSON</summary>
            <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function Card({ k, v }: { k: string; v?: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-white/60 text-xs">{k}</div>
      <div className="text-white/90 text-xl">{typeof v === 'number' ? v : '-'}</div>
    </div>
  );
}

function Section({ title, data }: { title: string; data: any[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-white/80 text-sm mb-2">{title}</div>
      {!data || data.length === 0 ? (
        <div className="text-white/50 text-sm">No {title.toLowerCase()}.</div>
      ) : (
        <pre className="text-xs text-white/70 whitespace-pre-wrap overflow-auto max-h-96">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}
