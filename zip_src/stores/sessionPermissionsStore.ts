/**
 * Session-based permissions store for local tool access control
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccessPolicy } from '@/services/localTool/types';
import { getVaultPath } from '@/api/vaultApi';

export interface SessionPermissions {
  sessionId: string;
  accessPolicy: AccessPolicy;
  lastModified: number;
  isCustomized: boolean; // Track if user has customized permissions
}

interface SessionPermissionsState {
  // State
  sessionPermissions: Record<string, SessionPermissions>;
  
  // Actions
  getSessionPermissions: (sessionId: string) => SessionPermissions | undefined;
  setSessionPermissions: (sessionId: string, accessPolicy: AccessPolicy, isCustomized?: boolean) => void;
  updateSessionPermissions: (sessionId: string, updates: Partial<AccessPolicy>) => void;
  deleteSessionPermissions: (sessionId: string) => void;
  clearOldSessions: (maxAge?: number) => void;
  
  // Utilities
  hasCustomPermissions: (sessionId: string) => boolean;
  getDefaultPermissions: (cwd: string) => AccessPolicy;
}

const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const useSessionPermissionsStore = create<SessionPermissionsState>()(
  persist(
    (set, get) => ({
      sessionPermissions: {},

      getSessionPermissions: (sessionId: string) => {
        const state = get();
        return state.sessionPermissions[sessionId];
      },

      setSessionPermissions: (sessionId: string, accessPolicy: AccessPolicy, isCustomized = true) => {
        set((state) => ({
          sessionPermissions: {
            ...state.sessionPermissions,
            [sessionId]: {
              sessionId,
              accessPolicy,
              lastModified: Date.now(),
              isCustomized
            }
          }
        }));
      },

      updateSessionPermissions: (sessionId: string, updates: Partial<AccessPolicy>) => {
        set((state) => {
          const existing = state.sessionPermissions[sessionId];
          if (!existing) {
            console.warn(`[SessionPermissions] No existing permissions for session ${sessionId}`);
            return state;
          }

          return {
            sessionPermissions: {
              ...state.sessionPermissions,
              [sessionId]: {
                ...existing,
                accessPolicy: {
                  ...existing.accessPolicy,
                  ...updates
                },
                lastModified: Date.now(),
                isCustomized: true
              }
            }
          };
        });
      },

      deleteSessionPermissions: (sessionId: string) => {
        set((state) => {
          const { [sessionId]: deleted, ...remaining } = state.sessionPermissions;
          return {
            sessionPermissions: remaining
          };
        });
      },

      clearOldSessions: (maxAge = DEFAULT_MAX_AGE) => {
        const cutoff = Date.now() - maxAge;
        set((state) => {
          const filtered = Object.fromEntries(
            Object.entries(state.sessionPermissions).filter(
              ([_, permissions]) => permissions.lastModified > cutoff
            )
          );
          
          const deletedCount = Object.keys(state.sessionPermissions).length - Object.keys(filtered).length;
          if (deletedCount > 0) {
            console.log(`[SessionPermissions] Cleaned up ${deletedCount} old session permissions`);
          }
          
          return {
            sessionPermissions: filtered
          };
        });
      },

      hasCustomPermissions: (sessionId: string) => {
        const state = get();
        const permissions = state.sessionPermissions[sessionId];
        return permissions?.isCustomized ?? false;
      },

      getDefaultPermissions: (cwd: string): AccessPolicy => {
        const whitelist = [`${cwd}/**`];
        
        // TODO: Add vault path to default whitelist
        // Note: This is synchronous, so we can't await getDefaultVaultPath() here
        // The vault path should be added when permissions are actually created
        // See sessionPermissionsUtils.getOrCreateSessionPermissions
        
        return {
          whitelist,
          blacklist: [],
          shell_forbidden_patterns: []
        };
      }
    }),
    {
      name: 'session-permissions-store',
      version: 1,
      // Clean up old sessions on store initialization
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clearOldSessions();
        }
      }
    }
  )
);

// Export utilities for external use
export const sessionPermissionsUtils = {
  /**
   * Get or create default permissions for a session
   */
  getOrCreateSessionPermissions: async (sessionId: string, cwd: string): Promise<SessionPermissions> => {
    const store = useSessionPermissionsStore.getState();
    let permissions = store.getSessionPermissions(sessionId);
    
    if (!permissions) {
      const defaultPolicy = store.getDefaultPermissions(cwd);
      
      // Add vault path to default whitelist
      try {
        const vaultPath = await getVaultPath();
        console.log('🔍 [DEBUG] Raw vault path from getVaultPath():', {
          vaultPath,
          type: typeof vaultPath,
          isString: typeof vaultPath === 'string',
          stringified: JSON.stringify(vaultPath)
        });
        
        if (vaultPath && typeof vaultPath === 'string') {
          const vaultPattern = `${vaultPath}/**`;
          defaultPolicy.whitelist.push(vaultPattern);
          console.log('🛡️ [SessionPermissions] Added vault path to default whitelist:', vaultPattern);
          
          // Debug: Check what's actually in the whitelist
          console.log('🔍 [DEBUG] Current whitelist after adding vault path:', defaultPolicy.whitelist);
        } else {
          console.warn('🚨 [SessionPermissions] Vault path is null or not a string:', {
            vaultPath,
            type: typeof vaultPath,
            stringified: JSON.stringify(vaultPath)
          });
        }
      } catch (error) {
        console.warn('🚨 [SessionPermissions] Failed to get vault path for default permissions:', error);
      }
      
      // Add /tmp directory to default whitelist for temporary files
      const tmpPattern = '/tmp/**';
      if (!defaultPolicy.whitelist.includes(tmpPattern)) {
        defaultPolicy.whitelist.push(tmpPattern);
        console.log('🛡️ [SessionPermissions] Added /tmp to default whitelist:', tmpPattern);
      }
      
      store.setSessionPermissions(sessionId, defaultPolicy, false); // Not customized initially
      permissions = store.getSessionPermissions(sessionId)!;
    }
    
    return permissions;
  },

  /**
   * Check if session has any access restrictions
   */
  hasAccessRestrictions: (sessionId: string): boolean => {
    const store = useSessionPermissionsStore.getState();
    const permissions = store.getSessionPermissions(sessionId);
    
    if (!permissions) return false;
    
    const { whitelist, blacklist, shell_forbidden_patterns } = permissions.accessPolicy;
    
    return (
      (whitelist && whitelist.length > 0) ||
      (blacklist && blacklist.length > 0) ||
      (shell_forbidden_patterns && shell_forbidden_patterns.length > 0)
    );
  },

  /**
   * Get a summary of permissions for display
   */
  getPermissionsSummary: (sessionId: string): string => {
    const store = useSessionPermissionsStore.getState();
    const permissions = store.getSessionPermissions(sessionId);
    
    if (!permissions) return 'No permissions set';
    
    const { whitelist, blacklist, shell_forbidden_patterns } = permissions.accessPolicy;
    const parts: string[] = [];
    
    if (whitelist && whitelist.length > 0) {
      parts.push(`${whitelist.length} whitelisted path${whitelist.length > 1 ? 's' : ''}`);
    }
    
    if (blacklist && blacklist.length > 0) {
      parts.push(`${blacklist.length} blacklisted path${blacklist.length > 1 ? 's' : ''}`);
    }
    
    if (shell_forbidden_patterns && shell_forbidden_patterns.length > 0) {
      parts.push(`${shell_forbidden_patterns.length} forbidden pattern${shell_forbidden_patterns.length > 1 ? 's' : ''}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No restrictions';
  }
};