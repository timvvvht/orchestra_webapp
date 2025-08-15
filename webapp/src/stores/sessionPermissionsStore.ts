/**
 * Session permissions store for managing tool execution permissions
 * Stub implementation for web app - permissions are handled differently
 */

export interface SessionPermissions {
  sessionId: string;
  allowedTools: string[];
  deniedTools: string[];
  requiresApproval: boolean;
}

export const sessionPermissionsUtils = {
  hasPermission: (sessionId: string, toolName: string): boolean => {
    // Stub implementation - allow all tools in web app
    console.warn('[SessionPermissionsStore] Stub implementation - allowing all tools');
    return true;
  },
  
  grantPermission: (sessionId: string, toolName: string): void => {
    console.warn('[SessionPermissionsStore] Stub implementation - grantPermission not functional');
  },
  
  denyPermission: (sessionId: string, toolName: string): void => {
    console.warn('[SessionPermissionsStore] Stub implementation - denyPermission not functional');
  },
  
  getPermissions: (sessionId: string): SessionPermissions | null => {
    console.warn('[SessionPermissionsStore] Stub implementation - getPermissions not functional');
    return null;
  }
};

// Stub store
export const useSessionPermissionsStore = {
  getState: () => ({
    permissions: new Map<string, SessionPermissions>(),
    hasPermission: sessionPermissionsUtils.hasPermission,
    grantPermission: sessionPermissionsUtils.grantPermission,
    denyPermission: sessionPermissionsUtils.denyPermission,
    getPermissions: sessionPermissionsUtils.getPermissions
  })
};