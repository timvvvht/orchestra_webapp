/**
 * Chat store stub for web app
 * This is Tauri-specific functionality that's not needed in the web version
 */

export interface ChatSession {
  id: string;
  name: string;
  agent_cwd?: string;
  avatar?: string;
  specialty?: string;
  model?: string;
  tools?: string[];
  systemPrompt?: string;
  temperature?: number;
}

export interface ChatStore {
  createSession: (id: string, name: string, config?: Partial<ChatSession>) => Promise<string>;
  getSession: (id: string) => ChatSession | null;
}

// Stub implementation - not functional in web app
export const useChatStore = {
  getState: (): ChatStore => ({
    createSession: async (id: string, name: string, config?: Partial<ChatSession>) => {
      console.warn('[ChatStore] Stub implementation - createSession not functional in web app');
      return id;
    },
    getSession: (id: string) => {
      console.warn('[ChatStore] Stub implementation - getSession not functional in web app');
      return null;
    }
  })
};