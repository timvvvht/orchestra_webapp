/**
 * Chat Core Store - Zustand
 * 
 * Manages sessions, agent configs, and core chat state.
 * Phase 2 of Zustand migration: chat core states.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { SessionSummary, SessionDetails } from '@/services/acs';
import type { AgentConfigTS } from '@/types/agentTypes';

interface ChatCoreState {
  // Session state
  sessions: SessionSummary[];
  currentSessionId?: string;
  currentSession?: SessionDetails;
  
  // Agent configuration state
  agentConfigs: AgentConfigTS[];
  currentAgentConfigId?: string;
  currentAgentConfig?: AgentConfigTS;
  
  // Connection state
  isInitialized: boolean;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Session actions
  setSessions: (sessions: SessionSummary[]) => void;
  addSession: (session: SessionSummary) => void;
  updateSession: (id: string, updates: Partial<SessionSummary>) => void;
  removeSession: (id: string) => void;
  setCurrentSession: (session: SessionDetails) => void;
  setCurrentSessionId: (id: string | undefined) => void;
  clearSessions: () => void;
  
  // Agent config actions
  setAgentConfigs: (configs: AgentConfigTS[]) => void;
  addAgentConfig: (config: AgentConfigTS) => void;
  updateAgentConfig: (id: string, updates: Partial<AgentConfigTS>) => void;
  removeAgentConfig: (id: string) => void;
  setCurrentAgentConfigId: (id: string | undefined) => void;
  setCurrentAgentConfig: (config: AgentConfigTS | undefined) => void;
  clearAgentConfigs: () => void;
  
  // Connection actions
  setInitialized: (initialized: boolean) => void;
  setConnected: (connected: boolean) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  
  // Bulk actions
  clear: () => void;
}

export const useChatCoreStore = create<ChatCoreState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        sessions: [],
        agentConfigs: [],
        isInitialized: false,
        isConnected: false,
        connectionStatus: 'disconnected',
        
        // Session actions
        setSessions: (sessions) =>
          set((state) => {
            state.sessions = sessions;
          }, false, 'chatCore/setSessions'),
          
        addSession: (session) =>
          set((state) => {
            state.sessions.push(session);
          }, false, 'chatCore/addSession'),
          
        updateSession: (id, updates) =>
          set((state) => {
            const index = state.sessions.findIndex(s => s.id === id);
            if (index !== -1) {
              Object.assign(state.sessions[index], updates);
            }
          }, false, 'chatCore/updateSession'),
          
        removeSession: (id) =>
          set((state) => {
            state.sessions = state.sessions.filter(s => s.id !== id);
            // Clear current session if it was deleted
            if (state.currentSessionId === id) {
              state.currentSessionId = undefined;
              state.currentSession = undefined;
            }
          }, false, 'chatCore/removeSession'),
          
        setCurrentSession: (session) =>
          set((state) => {
            state.currentSession = session;
            state.currentSessionId = session.id;
          }, false, 'chatCore/setCurrentSession'),
          
        setCurrentSessionId: (id) =>
          set((state) => {
            state.currentSessionId = id;
            // Clear current session if id is undefined
            if (!id) {
              state.currentSession = undefined;
            }
          }, false, 'chatCore/setCurrentSessionId'),
          
        clearSessions: () =>
          set((state) => {
            state.sessions = [];
            state.currentSessionId = undefined;
            state.currentSession = undefined;
          }, false, 'chatCore/clearSessions'),
          
        // Agent config actions
        setAgentConfigs: (configs) =>
          set((state) => {
            state.agentConfigs = configs;
          }, false, 'chatCore/setAgentConfigs'),
          
        addAgentConfig: (config) =>
          set((state) => {
            state.agentConfigs.push(config);
          }, false, 'chatCore/addAgentConfig'),
          
        updateAgentConfig: (id, updates) =>
          set((state) => {
            const index = state.agentConfigs.findIndex(c => c.id === id);
            if (index !== -1) {
              Object.assign(state.agentConfigs[index], updates);
            }
          }, false, 'chatCore/updateAgentConfig'),
          
        removeAgentConfig: (id) =>
          set((state) => {
            state.agentConfigs = state.agentConfigs.filter(c => c.id !== id);
            // Clear current agent config if it was deleted
            if (state.currentAgentConfigId === id) {
              state.currentAgentConfigId = undefined;
              state.currentAgentConfig = undefined;
            }
          }, false, 'chatCore/removeAgentConfig'),
          
        setCurrentAgentConfigId: (id) =>
          set((state) => {
            state.currentAgentConfigId = id;
            // Find and set the current agent config
            if (id) {
              const config = state.agentConfigs.find(c => c.id === id);
              state.currentAgentConfig = config;
            } else {
              state.currentAgentConfig = undefined;
            }
          }, false, 'chatCore/setCurrentAgentConfigId'),
          
        setCurrentAgentConfig: (config) =>
          set((state) => {
            state.currentAgentConfig = config;
            state.currentAgentConfigId = config?.id;
          }, false, 'chatCore/setCurrentAgentConfig'),
          
        clearAgentConfigs: () =>
          set((state) => {
            state.agentConfigs = [];
            state.currentAgentConfigId = undefined;
            state.currentAgentConfig = undefined;
          }, false, 'chatCore/clearAgentConfigs'),
          
        // Connection actions
        setInitialized: (initialized) =>
          set((state) => {
            state.isInitialized = initialized;
          }, false, 'chatCore/setInitialized'),
          
        setConnected: (connected) =>
          set((state) => {
            state.isConnected = connected;
            // Update connection status based on connected state
            if (connected) {
              state.connectionStatus = 'connected';
            } else if (state.connectionStatus === 'connected') {
              state.connectionStatus = 'disconnected';
            }
          }, false, 'chatCore/setConnected'),
          
        setConnectionStatus: (status) =>
          set((state) => {
            state.connectionStatus = status;
            // Update connected state based on status
            state.isConnected = status === 'connected';
          }, false, 'chatCore/setConnectionStatus'),
          
        // Bulk clear action
        clear: () =>
          set((state) => {
            state.sessions = [];
            state.currentSessionId = undefined;
            state.currentSession = undefined;
            state.agentConfigs = [];
            state.currentAgentConfigId = undefined;
            state.currentAgentConfig = undefined;
            state.isInitialized = false;
            state.isConnected = false;
            state.connectionStatus = 'disconnected';
          }, false, 'chatCore/clear'),
      })),
      {
        name: 'orchestra-chat-core',
        version: 1,
        // Persist only essential data
        partialize: (state) => ({
          currentSessionId: state.currentSessionId,
          currentAgentConfigId: state.currentAgentConfigId,
        }),
      }
    ),
    {
      name: 'Chat Core Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selector hooks for performance optimization
export const useSessions = () => useChatCoreStore(state => state.sessions);
export const useCurrentSession = () => useChatCoreStore(state => state.currentSession);
export const useCurrentSessionId = () => useChatCoreStore(state => state.currentSessionId);
export const useAgentConfigs = () => useChatCoreStore(state => state.agentConfigs);
export const useCurrentAgentConfig = () => useChatCoreStore(state => state.currentAgentConfig);
export const useCurrentAgentConfigId = () => useChatCoreStore(state => state.currentAgentConfigId);
export const useIsInitialized = () => useChatCoreStore(state => state.isInitialized);
export const useIsConnected = () => useChatCoreStore(state => state.isConnected);
export const useConnectionStatus = () => useChatCoreStore(state => state.connectionStatus);

// Computed selectors
export const useSessionCount = () => 
  useChatCoreStore(state => state.sessions.length);

export const useAgentConfigCount = () => 
  useChatCoreStore(state => state.agentConfigs.length);

export const useIsAuthenticated = () => 
  useChatCoreStore(state => state.isInitialized && state.isConnected);