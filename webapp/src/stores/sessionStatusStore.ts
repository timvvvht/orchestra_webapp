import { create } from "zustand";

export type SessionState = "idle" | "awaiting";

interface SessionStatusSlice {
  statusBySession: Map<string, SessionState>;
  markIdle: (id: string) => void;
  markAwaiting: (id: string) => void;
  getStatus: (id: string) => SessionState;
  markError: (id: string) => void;
}

export const useSessionStatusStore = create<SessionStatusSlice>((set, get) => ({
  statusBySession: new Map(),

  markIdle: (id) =>
    set((state) => {
      const map = new Map(state.statusBySession);
      map.set(id, "idle");
      console.log(`[SessionStatus] Session ${id.slice(-8)} marked as IDLE`);
      return { statusBySession: map };
    }),

  markAwaiting: (id) =>
    set((state) => {
      const map = new Map(state.statusBySession);
      map.set(id, "awaiting");
      console.log(`[SessionStatus] Session ${id.slice(-8)} marked as AWAITING`);
      return { statusBySession: map };
    }),

  markError: (id) => {
    set((state) => {
      const map = new Map(state.statusBySession);
      map.set(id, "idle");
      console.log(`[SessionStatus] Session ${id.slice(-8)} marked as ERROR`);
      return { statusBySession: map };
    });
  },

  getStatus: (id) => get().statusBySession.get(id) ?? "idle",
}));

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as any).sessionStatus = useSessionStatusStore;
}
