/**
 * useApprovals Hook
 * 
 * React hook for managing tool approval state and interactions.
 * Provides real-time updates on pending approvals and approval decisions.
 */

import { useState, useEffect, useCallback } from 'react';
import { getApprovalAPI } from '@/services/approval';
import { PendingApproval, ApprovalEvent, ApprovalConfig } from '@/services/approval/types';

interface UseApprovalsOptions {
  sessionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseApprovalsReturn {
  // State
  pendingApprovals: PendingApproval[];
  isLoading: boolean;
  error: string | null;
  config: ApprovalConfig | null;
  
  // Actions
  approve: (toolUseId: string, userId?: string) => Promise<boolean>;
  reject: (toolUseId: string, userId?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  updateConfig: (newConfig: Partial<ApprovalConfig>) => Promise<boolean>;
  
  // Utilities
  requiresApproval: (toolName: string) => boolean;
  getPendingCount: () => number;
  hasPendingApprovals: () => boolean;
}

export function useApprovals(options: UseApprovalsOptions = {}): UseApprovalsReturn {
  const {
    sessionId,
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ApprovalConfig | null>(null);

  const approvalAPI = getApprovalAPI();

  // Load pending approvals
  const loadPendingApprovals = useCallback(async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await approvalAPI.getPendingApprovals(sessionId);
      if (result.success) {
        setPendingApprovals(result.data || []);
      } else {
        setError(result.message || 'Failed to load pending approvals');
      }
    } catch (err) {
      console.error('[useApprovals] Error loading pending approvals:', err);
      setError('Failed to load pending approvals');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, approvalAPI]);

  // Load configuration
  const loadConfig = useCallback(async () => {
    try {
      const result = await approvalAPI.getConfig();
      if (result.success) {
        setConfig(result.data);
      }
    } catch (err) {
      console.error('[useApprovals] Error loading config:', err);
    }
  }, [approvalAPI]);

  // Handle approval events
  const handleApprovalEvent = useCallback((event: ApprovalEvent) => {
    if (sessionId && event.session_id !== sessionId) {
      return;
    }

    console.log('[useApprovals] Received approval event:', event);

    switch (event.type) {
      case 'APPROVAL_REQUESTED':
        // Reload pending approvals to include the new request
        loadPendingApprovals();
        break;
        
      case 'APPROVAL_DECIDED':
      case 'APPROVAL_TIMED_OUT':
        // Remove the approval from pending list
        setPendingApprovals(prev => 
          prev.filter(approval => approval.tool_use_id !== event.tool_use_id)
        );
        break;
    }
  }, [sessionId, loadPendingApprovals]);

  // Set up event listeners and initial load
  useEffect(() => {
    const service = approvalAPI.getService();
    service.on('approval_event', handleApprovalEvent);

    // Load initial data
    loadPendingApprovals();
    loadConfig();

    return () => {
      service.removeListener('approval_event', handleApprovalEvent);
    };
  }, [approvalAPI, handleApprovalEvent, loadPendingApprovals, loadConfig]);

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh || !sessionId) return;

    const interval = setInterval(() => {
      loadPendingApprovals();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, sessionId, refreshInterval, loadPendingApprovals]);

  // Approve a tool execution
  const approve = useCallback(async (toolUseId: string, userId?: string): Promise<boolean> => {
    try {
      const result = await approvalAPI.makeDecision({
        tool_use_id: toolUseId,
        decision: 'APPROVED',
        user_id: userId || 'current_user' // TODO: Get from auth context
      });

      if (result.success) {
        // Optimistically remove from pending list
        setPendingApprovals(prev => 
          prev.filter(approval => approval.tool_use_id !== toolUseId)
        );
        return true;
      } else {
        setError(result.message || 'Failed to approve tool execution');
        return false;
      }
    } catch (err) {
      console.error('[useApprovals] Error approving tool:', err);
      setError('Failed to approve tool execution');
      return false;
    }
  }, [approvalAPI]);

  // Reject a tool execution
  const reject = useCallback(async (toolUseId: string, userId?: string): Promise<boolean> => {
    try {
      const result = await approvalAPI.makeDecision({
        tool_use_id: toolUseId,
        decision: 'REJECTED',
        user_id: userId || 'current_user' // TODO: Get from auth context
      });

      if (result.success) {
        // Optimistically remove from pending list
        setPendingApprovals(prev => 
          prev.filter(approval => approval.tool_use_id !== toolUseId)
        );
        return true;
      } else {
        setError(result.message || 'Failed to reject tool execution');
        return false;
      }
    } catch (err) {
      console.error('[useApprovals] Error rejecting tool:', err);
      setError('Failed to reject tool execution');
      return false;
    }
  }, [approvalAPI]);

  // Refresh data
  const refresh = useCallback(async () => {
    await Promise.all([
      loadPendingApprovals(),
      loadConfig()
    ]);
  }, [loadPendingApprovals, loadConfig]);

  // Update configuration
  const updateConfig = useCallback(async (newConfig: Partial<ApprovalConfig>): Promise<boolean> => {
    try {
      const result = await approvalAPI.updateConfig(newConfig);
      if (result.success) {
        await loadConfig(); // Reload to get updated config
        return true;
      } else {
        setError(result.message || 'Failed to update configuration');
        return false;
      }
    } catch (err) {
      console.error('[useApprovals] Error updating config:', err);
      setError('Failed to update configuration');
      return false;
    }
  }, [approvalAPI, loadConfig]);

  // Check if a tool requires approval
  const requiresApproval = useCallback((toolName: string): boolean => {
    return approvalAPI.requiresApproval(toolName);
  }, [approvalAPI]);

  // Get pending count
  const getPendingCount = useCallback((): number => {
    return pendingApprovals.length;
  }, [pendingApprovals]);

  // Check if there are pending approvals
  const hasPendingApprovals = useCallback((): boolean => {
    return pendingApprovals.length > 0;
  }, [pendingApprovals]);

  return {
    // State
    pendingApprovals,
    isLoading,
    error,
    config,
    
    // Actions
    approve,
    reject,
    refresh,
    updateConfig,
    
    // Utilities
    requiresApproval,
    getPendingCount,
    hasPendingApprovals
  };
}

/**
 * Hook for global approval state (all sessions)
 */
export function useGlobalApprovals(): Omit<UseApprovalsReturn, 'pendingApprovals'> & {
  config: ApprovalConfig | null;
} {
  const { 
    config, 
    isLoading, 
    error, 
    refresh, 
    updateConfig, 
    requiresApproval 
  } = useApprovals({ sessionId: undefined });

  return {
    config,
    isLoading,
    error,
    approve: async () => false, // Not applicable for global
    reject: async () => false,  // Not applicable for global
    refresh,
    updateConfig,
    requiresApproval,
    getPendingCount: () => 0,
    hasPendingApprovals: () => false
  };
}