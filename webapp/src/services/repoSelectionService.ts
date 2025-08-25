import { supabase } from '@/auth/SupabaseClient';
import { acsGithubApi } from '@/services/acsGitHubApi';
import { useRepoSelectionStore } from '@/stores/repoSelectionStore';

const api = acsGithubApi({
    baseUrl: (import.meta.env?.VITE_ACS_BASE_URL || 'https://orchestra-acs.fly.dev').replace(/\/$/, '')
});

export async function loadReposService() {
    const {
        data: { session }
    } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.listRepos(auth);
    if (!res.ok) {
        return {
            ok: false,
            githubRequired: true,
            repos: [],
            error: res.data?.detail || 'GitHub connection required'
        };
    }
    const mapped = (res.data.repositories || []).map((r: any) => ({
        id: r.repo_id,
        full_name: r.repo_full_name
    }));
    return { ok: true, githubRequired: false, repos: mapped };
}

export async function connectGithubService() {
    const {
        data: { session }
    } = await supabase.auth.getSession();
    const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
    const res = await api.installUrl(auth);
    if (!res.ok) throw new Error(res.data?.detail || 'Failed to get GitHub install URL');
    window.open(res.data.install_url, '_blank', 'noopener,noreferrer');
}
