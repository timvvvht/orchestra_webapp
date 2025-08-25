import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SupabaseUser } from "@/lib/supabaseClient";
import type { GitHubRepo } from "@/services/acs/shared/types";

// Browser-safe SHA-256 base64url helper
async function sha256Base64Url(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(digest);
  let b64 = btoa(String.fromCharCode(...Array.from(bytes)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface Workspace {
  id: string; // SHA256 hash of userId:repoId:branch
  userId: string;
  repoId: number;
  repoFullName: string;
  branch: string;
  name: string; // Human-readable name for the workspace
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  isActive: boolean; // Whether this workspace is currently active
  metadata?: Record<string, any>; // Additional workspace-specific data
}

export interface WorkspaceState {
  // Data
  workspaces: Record<string, Workspace>; // id -> Workspace
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createWorkspace: (params: {
    userId: string;
    repoId: number;
    repoFullName: string;
    branch: string;
    name?: string;
    description?: string;
    metadata?: Record<string, any>;
  }) => Promise<Workspace>;

  updateWorkspace: (
    id: string,
    updates: Partial<
      Omit<
        Workspace,
        "id" | "userId" | "repoId" | "repoFullName" | "branch" | "createdAt"
      >
    >
  ) => void;

  deleteWorkspace: (id: string) => void;

  setActiveWorkspace: (id: string | null) => void;

  getWorkspace: (id: string) => Workspace | undefined;

  getWorkspaceByRepoAndBranch: (
    repoId: number,
    branch: string
  ) => Workspace | undefined;

  getWorkspacesByRepo: (repoId: number) => Workspace[];

  getWorkspacesByUser: (userId: string) => Workspace[];

  refreshWorkspaceAccess: (id: string) => void;

  clearError: () => void;

  // Computed getters
  getActiveWorkspace: () => Workspace | undefined;
  getRecentWorkspaces: (limit?: number) => Workspace[];
  getWorkspaceCount: () => number;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      workspaces: {},
      activeWorkspaceId: null,
      isLoading: false,
      error: null,

      // Actions
      createWorkspace: async (params) => {
        try {
          set({ isLoading: true, error: null });

          const {
            userId,
            repoId,
            repoFullName,
            branch,
            name,
            description,
            metadata,
          } = params;

          // Generate unique ID using SHA256 hash
          const workspaceKey = `${userId}:${repoId}:${branch}`;
          const id = await sha256Base64Url(workspaceKey);

          // Check if workspace already exists
          const existing = get().getWorkspace(id);
          if (existing) {
            // Update last accessed time and return existing
            const updated = {
              ...existing,
              lastAccessedAt: new Date().toISOString(),
            };
            set((state) => ({
              workspaces: { ...state.workspaces, [id]: updated },
            }));
            return updated;
          }

          const now = new Date().toISOString();
          const workspace: Workspace = {
            id,
            userId,
            repoId,
            repoFullName,
            branch,
            name: name || `${repoFullName}/${branch}`,
            description,
            createdAt: now,
            updatedAt: now,
            lastAccessedAt: now,
            isActive: false,
            metadata: metadata || {},
          };

          set((state) => ({
            workspaces: { ...state.workspaces, [id]: workspace },
            isLoading: false,
          }));

          return workspace;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to create workspace";
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      updateWorkspace: (id, updates) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;

          const updated = {
            ...workspace,
            ...updates,
            updatedAt: new Date().toISOString(),
          };

          return {
            workspaces: { ...state.workspaces, [id]: updated },
          };
        });
      },

      deleteWorkspace: (id) => {
        set((state) => {
          const { [id]: deleted, ...remaining } = state.workspaces;

          // If deleting active workspace, clear it
          const newActiveWorkspaceId =
            state.activeWorkspaceId === id ? null : state.activeWorkspaceId;

          return {
            workspaces: remaining,
            activeWorkspaceId: newActiveWorkspaceId,
          };
        });
      },

      setActiveWorkspace: (id) => {
        set((state) => {
          // Deactivate all workspaces
          const updatedWorkspaces = Object.values(state.workspaces).reduce(
            (acc, workspace) => {
              acc[workspace.id] = { ...workspace, isActive: false };
              return acc;
            },
            {} as Record<string, Workspace>
          );

          // Activate the specified workspace and update access time
          if (id && updatedWorkspaces[id]) {
            updatedWorkspaces[id] = {
              ...updatedWorkspaces[id],
              isActive: true,
              lastAccessedAt: new Date().toISOString(),
            };
          }

          return {
            workspaces: updatedWorkspaces,
            activeWorkspaceId: id,
          };
        });
      },

      getWorkspace: (id) => {
        return get().workspaces[id];
      },

      getWorkspaceByRepoAndBranch: (repoId, branch) => {
        return Object.values(get().workspaces).find(
          (w) => w.repoId === repoId && w.branch === branch
        );
      },

      getWorkspacesByRepo: (repoId) => {
        return Object.values(get().workspaces).filter(
          (w) => w.repoId === repoId
        );
      },

      getWorkspacesByUser: (userId) => {
        return Object.values(get().workspaces).filter(
          (w) => w.userId === userId
        );
      },

      refreshWorkspaceAccess: (id) => {
        set((state) => {
          const workspace = state.workspaces[id];
          if (!workspace) return state;

          return {
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...workspace,
                lastAccessedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      clearError: () => {
        set({ error: null });
      },

      // Computed getters
      getActiveWorkspace: () => {
        const { activeWorkspaceId, workspaces } = get();
        return activeWorkspaceId ? workspaces[activeWorkspaceId] : undefined;
      },

      getRecentWorkspaces: (limit = 10) => {
        return Object.values(get().workspaces)
          .sort(
            (a, b) =>
              new Date(b.lastAccessedAt).getTime() -
              new Date(a.lastAccessedAt).getTime()
          )
          .slice(0, limit);
      },

      getWorkspaceCount: () => {
        return Object.keys(get().workspaces).length;
      },
    }),
    {
      name: "workspace-store",
      version: 1,
      // Only persist workspaces data, not loading/error states
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);

// Export individual selectors for better performance
export const useWorkspaces = () =>
  useWorkspaceStore((state) => state.workspaces);
export const useActiveWorkspaceId = () =>
  useWorkspaceStore((state) => state.activeWorkspaceId);
export const useActiveWorkspace = () =>
  useWorkspaceStore((state) => state.getActiveWorkspace());
export const useWorkspaceCount = () =>
  useWorkspaceStore((state) => state.getWorkspaceCount());
export const useRecentWorkspaces = (limit?: number) =>
  useWorkspaceStore((state) => state.getRecentWorkspaces(limit));
export const useWorkspacesByRepo = (repoId: number) =>
  useWorkspaceStore((state) => state.getWorkspacesByRepo(repoId));
export const useWorkspacesByUser = (userId: string) =>
  useWorkspaceStore((state) => state.getWorkspacesByUser(userId));
