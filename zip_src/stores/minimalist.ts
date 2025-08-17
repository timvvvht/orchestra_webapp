
import { create } from "zustand";

// Mock data
export const mockEvents = [
  { id: 'evt1', ts: '10:02', summary: 'Alice edited note.md', actor: 'alice' },
  { id: 'evt2', ts: '09:58', summary: 'Bob completed task #42', actor: 'bob' },
  { id: 'evt3', ts: '09:45', summary: 'Charlie started new task', actor: 'charlie' },
  { id: 'evt4', ts: '09:30', summary: 'David reviewed PR', actor: 'david' },
  { id: 'evt5', ts: '09:15', summary: 'Eve deployed to production', actor: 'eve' },
];

export const mockTasks = { planned: 8, doing: 3, review: 1, done: 12 };

export const mockStats = { tokensToday: 32542, activeAgents: 4, modifiedFiles: 5 };

// UI store
interface UIState {
  drawer: null | { type: 'agent' | 'diff'; id: string };
  open: (drawer: { type: 'agent' | 'diff'; id: string }) => void;
  close: () => void;
}

export const useUI = create<UIState>((set) => ({
  drawer: null,
  open: (drawer) => set({ drawer }),
  close: () => set({ drawer: null }),
}));

// Events store
export const useEvents = create(() => mockEvents);

// Tasks store
export const useTasks = create(() => mockTasks);

// Stats store
export const useStats = create(() => mockStats);

// Note: Chat store has been moved to src/stores/chatStore.ts
