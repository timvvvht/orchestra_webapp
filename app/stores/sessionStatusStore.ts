import { create } from "zustand";

export type SessionState = "idle" | "awaiting";

interface SessionStatusSlice {
  statusBySession: Map<string, SessionState>;
  markIdle: (id: string) => void;
  markAwaiting: (id: string) => void;
  getStatus: (id: string) => SessionState;
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

  getStatus: (id) => get().statusBySession.get(id) ?? "idle",
}));

// quick debug helper
if (import.meta.env.DEV) {
  (window as any).sessionStatus = useSessionStatusStore;
}
