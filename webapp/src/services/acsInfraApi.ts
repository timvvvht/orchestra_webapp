import { withApiV1 } from "@/services/acsGitHubApi";

async function getJson<T>(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: data as T };
}

export const acsInfraApi = (config: { baseUrl: string }) => {
  const API = withApiV1(config.baseUrl);
  return {
    userOverview: async (
      opts?: { include_runtime_ready?: boolean; max_events?: number },
      authorization?: string
    ) => {
      const p = new URLSearchParams();
      if (opts?.include_runtime_ready) p.set("include_runtime_ready", "true");
      if (opts?.max_events) p.set("max_events", String(opts.max_events));
      const qs = p.toString();
      return getJson(`${API}/infra-dashboard/me${qs ? `?${qs}` : ""}`, {
        method: "GET",
        credentials: "include",
        headers: authorization ? { Authorization: authorization } : {},
      });
    },
    globalOverview: async (
      opts?: { include_runtime_ping?: boolean },
      authorization?: string
    ) => {
      const p = new URLSearchParams();
      if (opts?.include_runtime_ping) p.set("include_runtime_ping", "true");
      const qs = p.toString();
      return getJson(`${API}/infra-dashboard/global${qs ? `?${qs}` : ""}`, {
        method: "GET",
        credentials: "include",
        headers: authorization ? { Authorization: authorization } : {},
      });
    },
  };
};
