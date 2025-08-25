import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";

type Props = {
  repo_id: number;
  repo_full_name: string;
  branch: string;
  acs_base?: string;
  onDone(status: "ready" | "provisioned" | "failed" | "stopped" | "unknown", details?: any): void;
  onCancel?(): void;
};

export const ProvisioningOverlay: React.FC<Props> = ({
  repo_id,
  repo_full_name,
  branch,
  acs_base,
  onDone,
  onCancel
}) => {
  const DEFAULT_ACS = (import.meta.env?.VITE_ACS_BASE_URL || "https://orchestra-acs-web.fly.dev").replace(/\/$/, "");
  const api = useMemo(() => acsGithubApi({ baseUrl: (acs_base || DEFAULT_ACS) }), [acs_base]);

  const [phase, setPhase] = useState<"init"|"provisioning"|"waiting"|"ready"|"failed">("init");
  const [message, setMessage] = useState<string>("Preparing your workspace…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let iv: any;

    const run = async () => {
      try {
        setPhase("provisioning");
        setMessage("Provisioning infrastructure…");

        const { data: { session } } = await supabase.auth.getSession();
        const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;

        // Kick off provisioning (idempotent on backend)
        const res = await api.provisionWithRepo({
          repo_id,
          repo_name: repo_full_name,
          branch
        }, auth);

        if (!res.ok) {
          setError(res.data?.detail || "Provisioning failed");
          setPhase("failed");
          onDone("failed", res.data);
          return;
        }

        // Poll until ready or timeout
        setPhase("waiting");
        setMessage("Waiting for workspace to become healthy…");

        const startedAt = Date.now();
        const timeoutMs = 5 * 60 * 1000; // 5 minutes
        const poll = async () => {
          const statusRes = await api.repoStatus({ repo_id, branch }, auth);
          if (!statusRes.ok) {
            // keep polling, but surface a hint
            setMessage("Checking status…");
          } else {
            const s = statusRes.data?.status || "unknown";
            if (s === "ready") {
              setPhase("ready");
              setMessage("Workspace ready!");
              onDone("ready", statusRes.data);
              return true;
            }
            if (s === "failed" || s === "stopped") {
              setPhase("failed");
              setError(s === "failed" ? "Provisioning failed" : "Machine stopped");
              onDone(s, statusRes.data);
              return true;
            }
          }
          if (Date.now() - startedAt > timeoutMs) {
            setPhase("failed");
            setError("Provisioning timed out");
            onDone("failed");
            return true;
          }
          return false;
        };

        // immediate check, then interval
        const once = await poll();
        if (once) return;
        iv = setInterval(async () => {
          const done = await poll();
          if (done) {
            clearInterval(iv);
          }
        }, 5000);
      } catch (e: any) {
        setPhase("failed");
        setError(e?.message || "Unexpected error");
        onDone("failed");
      }
    };

    run();

    return () => {
      mounted = false;
      if (iv) clearInterval(iv);
    };
  }, [repo_id, repo_full_name, branch, acs_base, api, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 max-w-md w-full text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="text-white/80 text-sm">Provisioning</div>
          <div className="flex items-center justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" 
                style={{ animationDelay: `${i*150}ms` }} 
              />
            ))}
          </div>
          <div className="text-white/90">{message}</div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          {onCancel && (
            <button 
              onClick={onCancel} 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};