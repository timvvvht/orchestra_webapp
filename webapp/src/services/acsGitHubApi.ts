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
    // Note: /auth/me is not used by the GitHub Wizard flow to avoid CORS dependency.
    // The wizard proceeds directly to GitHub endpoints after successful cookie exchange.
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
    installUrl: async (authorization?: string) => {
      return getJson(`${API}/github/install/url`, {
        method: 'GET',
        credentials: 'include',
        headers: authorization ? { Authorization: authorization } : {}
      });
    },
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
    }, authorization?: string) => {
      return getJson(`${API}/infrastructure/provision-with-repo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authorization ? { Authorization: authorization } : {})
        },
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
    repoStatus: async (args: {
      repo_id: number;
      branch: string;
    }, authorization?: string) => {
      const params = new URLSearchParams({
        repo_id: String(args.repo_id),
        branch: args.branch,
      });
      return getJson(`${API}/infrastructure/repo-status?${params}`, {
        method: "GET",
        credentials: "include",
        headers: authorization ? { Authorization: authorization } : {},
      });
    },
    stopRepo: async (args: {
      repo_id: number;
      branch: string;
    }) => {
      return getJson(`${API}/infrastructure/repo/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          repo_id: args.repo_id,
          branch: args.branch,
        }),
      });
    },

    // Lifecycle Operations
    updateRepoImage: async (args: {
      repo_id: number;
      branch: string;
      new_tes_image: string;
      cleanup_old_machine?: boolean;
    }, authorization?: string) => {
      return getJson(`${API}/infrastructure/repo/update-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authorization ? { Authorization: authorization } : {})
        },
        credentials: "include",
        body: JSON.stringify({
          repo_id: args.repo_id,
          branch: args.branch,
          new_tes_image: args.new_tes_image,
          cleanup_old_machine: args.cleanup_old_machine ?? true,
        }),
      });
    },

    deleteVolume: async (args: {
      volume_id: string;
      cleanup_machine?: boolean;
      cleanup_app?: boolean;
    }, authorization?: string) => {
      const params = new URLSearchParams();
      if (args.cleanup_machine !== undefined) {
        params.set("cleanup_machine", String(args.cleanup_machine));
      }
      if (args.cleanup_app !== undefined) {
        params.set("cleanup_app", String(args.cleanup_app));
      }
      
      const queryString = params.toString();
      const url = `${API}/infrastructure/volumes/${args.volume_id}${queryString ? `?${queryString}` : ''}`;
      
      return getJson(url, {
        method: "DELETE",
        credentials: "include",
        headers: authorization ? { Authorization: authorization } : {},
      });
    },
  };
};
