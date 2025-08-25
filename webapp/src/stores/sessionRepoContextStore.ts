import { create } from 'zustand';

type RepoCtx = { repo_id?: number; repo_full_name?: string; branch: string };

type State = {
  bySession: Map<string, RepoCtx>;
  setRepoContext: (sessionId: string, ctx: RepoCtx) => void;
  getRepoContext: (sessionId: string) => RepoCtx | undefined;
  clear: (sessionId?: string) => void;
};

export const useSessionRepoContextStore = create<State>((set, get) => ({
  bySession: new Map(),
  setRepoContext: (sessionId, ctx) => set(state => {
    const next = new Map(state.bySession);
    const normalized = {
      repo_id: typeof ctx.repo_id === 'number' ? ctx.repo_id : undefined,
      repo_full_name: ctx.repo_full_name ? ctx.repo_full_name.trim().toLowerCase() : undefined,
      branch: (ctx.branch || 'main').trim(),
    } as RepoCtx;
    next.set(sessionId, normalized);
    return { bySession: next };
  }),
  getRepoContext: (sessionId) => get().bySession.get(sessionId),
  clear: (sessionId) => set(state => {
    if (!sessionId) return { bySession: new Map() };
    const next = new Map(state.bySession);
    next.delete(sessionId);
    return { bySession: next };
  })
}));