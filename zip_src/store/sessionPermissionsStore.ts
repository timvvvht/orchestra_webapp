/**
 * Session-based permissions store using Zustand
 * Manages access policies per session with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccessPolicy } from '@/services/localTool/types';

export interface SessionPermissions {
  sessionId: string;
  accessPolicy: AccessPolicy;
  isCustomized: boolean;
  lastModified: string;
}

interface SessionPermissionsState {
  // State
  sessionPermissions: Record<string, SessionPermissions>;
  
  // Actions
  setSessionPermissions: (sessionId: string, accessPolicy: AccessPolicy, isCustomized?: boolean) => void;
  getSessionPermissions: (sessionId: string) => SessionPermissions | undefined;
  resetSessionPermissions: (sessionId: string, defaultCwd: string) => void;
  clearOldSessions: () => void;
  hasCustomPermissions: (sessionId: string) => boolean;
}

const CLEANUP_DAYS = 7; // Remove sessions older than 7 days

export const useSessionPermissionsStore = create<SessionPermissionsState>()(
  persist(
    (set, get) => ({
      sessionPermissions: {},

      setSessionPermissions: (sessionId: string, accessPolicy: AccessPolicy, isCustomized = true) => {
        set((state) => ({
          sessionPermissions: {
            ...state.sessionPermissions,
            [sessionId]: {
              sessionId,
              accessPolicy,
              isCustomized,
              lastModified: new Date().toISOString(),
            },
          },
        }));
      },

      getSessionPermissions: (sessionId: string) => {
        return get().sessionPermissions[sessionId];
      },

      resetSessionPermissions: (sessionId: string, defaultCwd: string) => {
        const defaultPolicy: AccessPolicy = {
          whitelist: [`${defaultCwd}/**`],
          blacklist: ['**/*.env', '**/*.log'],
          shell_forbidden_patterns: ['rm -rf*', 'sudo*'],
        };

        set((state) => ({
          sessionPermissions: {
            ...state.sessionPermissions,
            [sessionId]: {
              sessionId,
              accessPolicy: defaultPolicy,
              isCustomized: false,
              lastModified: new Date().toISOString(),
            },
          },
        }));
      },

      clearOldSessions: () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS);
        const cutoffTime = cutoffDate.toISOString();

        set((state) => {
          const filteredPermissions: Record<string, SessionPermissions> = {};
          
          Object.entries(state.sessionPermissions).forEach(([sessionId, permissions]) => {
            if (permissions.lastModified > cutoffTime) {
              filteredPermissions[sessionId] = permissions;
            }
          });

          return { sessionPermissions: filteredPermissions };
        });
      },

      hasCustomPermissions: (sessionId: string) => {
        const permissions = get().sessionPermissions[sessionId];
        return permissions?.isCustomized ?? false;
      },
    }),
    {
      name: 'orchestra-session-permissions',
      version: 1,
      // Clean up old sessions on load
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clearOldSessions();
        }
      },
    }
  )
);

export default useSessionPermissionsStore;