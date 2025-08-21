import {
  connectGithubService,
  loadReposService,
} from "@/services/repoSelectionService";
import { create } from "zustand";

type RepoItem = { id: number; full_name: string };
type State = {
  loading: boolean;
  error: string | null;
  githubRequired: boolean;
  repos: RepoItem[];
  selectedRepoId: number | "";
  selectedRepoFullName: string;
  branch: string;

  loadRepos: () => Promise<void>;
  connectGithub: () => Promise<void>;
  selectRepo: (id: number) => void;
  setBranch: (b: string) => void;
};

export const useRepoSelectionStore = create<State>((set, get) => ({
  loading: false,
  error: null,
  githubRequired: false,
  repos: [],
  selectedRepoId: "",
  selectedRepoFullName: "",
  branch: "main",

  loadRepos: async () => {
    set({ loading: true, error: null });
    try {
      const { repos } = await loadReposService();
      set({ repos, loading: false });
    } catch (err) {
      if (err instanceof Error) {
        set({ error: err.message, loading: false });
        if (err.message === "Github authentication required") {
          set({ githubRequired: true });
        }
      }
    }
  },
  connectGithub: async () => {
    set({ loading: true, error: null });
    try {
      await connectGithubService();
      set({ loading: false, githubRequired: false });
      await get().loadRepos();
    } catch (err) {
      if (err instanceof Error) {
        set({ error: err.message, loading: false });
      }
    }
  },
  selectRepo: (id) => {
    const r = get().repos.find((x) => x.id === id);
    set({ selectedRepoId: id, selectedRepoFullName: r?.full_name || "" });
  },
  setBranch: (b) => set({ branch: b }),
}));
