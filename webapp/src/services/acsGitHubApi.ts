import { type ACSConfig } from "@/types/acsConfig";

export function withApiV1(baseUrl: ACSConfig["baseUrl"]) {
  const clean = baseUrl.replace(/\/$/, "");
  return `${clean}/api/v1`;
}

async function getJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | any }> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const acsGithubApi = (config: ACSConfig) => {
  const API = withApiV1(config.baseUrl);

  return {
    // Auth
    exchangeSupabaseJwt: async (opts: { access_token: string; user: any }) => {
      return getJson(`${API}/auth/oauth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: "supabase",
          access_token: opts.access_token,
          refresh_token: null,
          user: opts.user,
        }),
      });
    },
    whoAmI: async (authorization?: string) => {
      return getJson(`${API}/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: authorization ? { Authorization: authorization } : {},
      });
    },

    // GitHub
    listInstallations: async (authorization?: string) => {
      return getJson(`${API}/github/installations`, {
        method: "GET",
        credentials: "include",
        headers: authorization ? { Authorization: authorization } : {},
      });
    },
    listRepos: async (authorization?: string) => {
      return getJson(`${API}/github/repos`, {
        method: "GET",
        credentials: "include",
        headers: authorization ? { Authorization: authorization } : {},
      });
    },

    // Infrastructure
    provisionTest: async () => {
      return getJson(`${API}/infrastructure/provision-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: "sjc",
          machine_config: { cpus: 1, memory_mb: 1024 },
          volume_config: { size_gb: 10 },
        }),
      });
    },
    provision: async () => {
      return getJson(`${API}/infrastructure/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          region: "sjc",
          machine_config: { cpus: 1, memory_mb: 1024 },
          volume_config: { size_gb: 10 },
        }),
      });
    },
    provisionWithRepo: async (args: {
      repo_id: number;
      repo_name: string;
      branch: string;
    }) => {
      return getJson(`${API}/infrastructure/provision-with-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          repo_id: args.repo_id,
          repo_name: args.repo_name,
          branch: args.branch,
          region: "ord",
          volume_size_gb: 10,
        }),
      });
    },
  };
};
