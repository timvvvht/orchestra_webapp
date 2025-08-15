/**
 * Chat Store - Webapp Stub Implementation
 */

import { create } from 'zustand';

interface ChatState {
  messages: any[];
  isLoading: boolean;
  error: string | null;
  addMessage: (message: any) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
