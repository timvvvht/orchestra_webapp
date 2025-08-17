import { create } from 'zustand';
import * as UserAgentUsageService from '@/services/supabase/userAgentUsageService';
import type { 
    QuotaCheckResultTS, 
    UserAgentUsageTS 
} from '@/types/agentTypes';

interface UsageTrackingState {
    // Quota check results cache (keyed by agent_config_id)
    quotaResults: Record<string, QuotaCheckResultTS>;
    
    // Usage history cache (keyed by agent_config_id)
    usageHistory: Record<string, UserAgentUsageTS[]>;
    
    // Current usage summary
    currentUsageSummary: UserAgentUsageTS[];
    
    // Loading states
    isCheckingQuota: boolean;
    isUpdatingUsage: boolean;
    isFetchingHistory: boolean;
    isFetchingSummary: boolean;
    
    // Error state
    error: string | null;

    // Actions
    checkMessageQuota: (agentConfigId: string, userId?: string) => Promise<QuotaCheckResultTS>;
    updateMessageUsage: (agentConfigId: string, userId?: string) => Promise<void>;
    fetchUsageHistory: (agentConfigId: string, userId?: string, limit?: number) => Promise<void>;
    fetchCurrentUsageSummary: (userId?: string) => Promise<void>;
    clearQuotaCache: (agentConfigId?: string) => void;
    clearUsageHistory: (agentConfigId?: string) => void;
    clearError: () => void;
}

export const useUsageTrackingStore = create<UsageTrackingState>((set, get) => ({
    quotaResults: {},
    usageHistory: {},
    currentUsageSummary: [],
    isCheckingQuota: false,
    isUpdatingUsage: false,
    isFetchingHistory: false,
    isFetchingSummary: false,
    error: null,

    checkMessageQuota: async (agentConfigId: string, userId?: string) => {
        set({ isCheckingQuota: true, error: null });
        
        try {
            console.log(`[usageTrackingStore] Checking quota for agent ${agentConfigId}`);
            
            const result = await UserAgentUsageService.checkMessageQuota(agentConfigId, userId);
            
            // Cache the result
            set(state => ({
                quotaResults: {
                    ...state.quotaResults,
                    [agentConfigId]: result
                },
                isCheckingQuota: false
            }));
            
            console.log(`[usageTrackingStore] Quota check result for ${agentConfigId}:`, result);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[usageTrackingStore] Error checking quota:', errorMessage);
            
            set({ 
                error: errorMessage, 
                isCheckingQuota: false 
            });
            
            throw error;
        }
    },

    updateMessageUsage: async (agentConfigId: string, userId?: string) => {
        set({ isUpdatingUsage: true, error: null });
        
        try {
            console.log(`[usageTrackingStore] Updating usage for agent ${agentConfigId}`);
            
            await UserAgentUsageService.updateMessageUsage(agentConfigId, userId);
            
            // Clear the cached quota result to force refresh on next check
            set(state => {
                const newQuotaResults = { ...state.quotaResults };
                delete newQuotaResults[agentConfigId];
                
                return {
                    quotaResults: newQuotaResults,
                    isUpdatingUsage: false
                };
            });
            
            console.log(`[usageTrackingStore] Successfully updated usage for ${agentConfigId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[usageTrackingStore] Error updating usage:', errorMessage);
            
            set({ 
                error: errorMessage, 
                isUpdatingUsage: false 
            });
            
            throw error;
        }
    },

    fetchUsageHistory: async (agentConfigId: string, userId?: string, limit: number = 10) => {
        set({ isFetchingHistory: true, error: null });
        
        try {
            console.log(`[usageTrackingStore] Fetching usage history for agent ${agentConfigId}`);
            
            const history = await UserAgentUsageService.getUserAgentUsageHistory(agentConfigId, userId, limit);
            
            set(state => ({
                usageHistory: {
                    ...state.usageHistory,
                    [agentConfigId]: history
                },
                isFetchingHistory: false
            }));
            
            console.log(`[usageTrackingStore] Fetched ${history.length} usage records for ${agentConfigId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[usageTrackingStore] Error fetching usage history:', errorMessage);
            
            set({ 
                error: errorMessage, 
                isFetchingHistory: false 
            });
            
            throw error;
        }
    },

    fetchCurrentUsageSummary: async (userId?: string) => {
        set({ isFetchingSummary: true, error: null });
        
        try {
            console.log('[usageTrackingStore] Fetching current usage summary');
            
            const summary = await UserAgentUsageService.getCurrentUsageSummary(userId);
            
            set({
                currentUsageSummary: summary,
                isFetchingSummary: false
            });
            
            console.log(`[usageTrackingStore] Fetched usage summary with ${summary.length} records`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[usageTrackingStore] Error fetching usage summary:', errorMessage);
            
            set({ 
                error: errorMessage, 
                isFetchingSummary: false 
            });
            
            throw error;
        }
    },

    clearQuotaCache: (agentConfigId?: string) => {
        set(state => {
            if (agentConfigId) {
                const newQuotaResults = { ...state.quotaResults };
                delete newQuotaResults[agentConfigId];
                return { quotaResults: newQuotaResults };
            } else {
                return { quotaResults: {} };
            }
        });
    },

    clearUsageHistory: (agentConfigId?: string) => {
        set(state => {
            if (agentConfigId) {
                const newUsageHistory = { ...state.usageHistory };
                delete newUsageHistory[agentConfigId];
                return { usageHistory: newUsageHistory };
            } else {
                return { usageHistory: {} };
            }
        });
    },

    clearError: () => {
        set({ error: null });
    }
}));

// Helper function to get cached quota result
export const getCachedQuotaResult = (agentConfigId: string): QuotaCheckResultTS | null => {
    const state = useUsageTrackingStore.getState();
    return state.quotaResults[agentConfigId] || null;
};

// Helper function to get cached usage history
export const getCachedUsageHistory = (agentConfigId: string): UserAgentUsageTS[] => {
    const state = useUsageTrackingStore.getState();
    return state.usageHistory[agentConfigId] || [];
};