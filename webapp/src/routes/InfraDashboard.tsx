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
  const d = data.diag || {};

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

        {/* Diagnostic Chips */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-white/80 text-sm mb-2">Diagnostics</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <DiagChip label="Inst. w/o Repos" count={d.installations_without_repos?.count} title="Installations without repos (sample below)" />
            <DiagChip label="Repos w/o Workspace" count={d.repos_without_workspace?.count} title="Repos accessible but no workspace" />
            <DiagChip label="WS w/o Infra" count={d.workspaces_without_infra?.count} title="Workspaces without infra mapping" />
            <DiagChip label="Infra w/o Volumes" count={d.infra_without_volumes?.count} title="Infra mappings missing volumes" />
            <DiagChip label="Missing Images" count={d.infra_missing_images?.count} title="Infra missing desired/current image metadata" />
            <DiagChip label="Abnormal Status" count={d.infra_abnormal_status?.count} title="failed/error/terminated infra" />
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-white/70">Diagnostic Samples</summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <Sample title="Installations w/o Repos" obj={d.installations_without_repos?.sample} />
              <Sample title="Repos w/o Workspace" obj={d.repos_without_workspace?.sample} />
              <Sample title="Workspaces w/o Infra" obj={d.workspaces_without_infra?.sample} />
              <Sample title="Infra w/o Volumes" obj={d.infra_without_volumes?.sample} />
              <Sample title="Missing Images" obj={d.infra_missing_images?.sample} />
              <Sample title="Abnormal Status" obj={d.infra_abnormal_status?.sample} />
            </div>
          </details>
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

function DiagChip({ label, count, title }: { label: string; count?: number; title?: string }) {
  const bad = typeof count === 'number' && count > 0;
  return (
    <span title={title}
      className={`px-2 py-1 rounded border ${bad ? 'bg-red-500/20 border-red-500/30 text-red-200' : 'bg-white/10 border-white/10 text-white/70'}`}>
      {label}: {typeof count === 'number' ? count : '-'}
    </span>
  );
}

function Sample({ title, obj }: { title: string; obj: any }) {
  if (!obj || (Array.isArray(obj) && obj.length === 0)) return (
    <div className="rounded border border-white/10 p-2">
      <div className="text-white/70 text-xs mb-1">{title}</div>
      <div className="text-white/50 text-xs">No samples</div>
    </div>
  );
  return (
    <div className="rounded border border-white/10 p-2">
      <div className="text-white/70 text-xs mb-1">{title}</div>
      <pre className="text-[11px] text-white/70 max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(obj, null, 2)}</pre>
    </div>
  );
}
