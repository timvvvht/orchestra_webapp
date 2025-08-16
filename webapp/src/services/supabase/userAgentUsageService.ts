import { supabase } from './supabaseClient';
import { getCurrentUserId } from '@/lib/userUtils';
import type { Tables, TablesInsert } from '@/types/supabase';
import type { 
    UserAgentUsageTS, 
    QuotaCheckResultTS, 
    UpdateUsagePayloadTS 
} from '@/types/agentTypes';

// DB types from Supabase
type UserAgentUsage = Tables<'user_agent_usage'>;
type InsertUserAgentUsage = TablesInsert<'user_agent_usage'>;

/**
 * Maps a Supabase UserAgentUsage to the frontend UserAgentUsageTS type
 * @param dbUsage The Supabase UserAgentUsage to map
 * @returns The mapped UserAgentUsageTS
 */
const mapToUserAgentUsageTS = (dbUsage: UserAgentUsage): UserAgentUsageTS => {
    return {
        id: dbUsage.id,
        user_id: dbUsage.user_id,
        agent_config_id: dbUsage.agent_config_id,
        usage_window_start: dbUsage.usage_window_start,
        message_count: dbUsage.message_count,
        last_updated: dbUsage.last_updated
    };
};

/**
 * Checks if a user can send a message to a specific agent based on usage limits
 * @param agentConfigId The ID of the agent configuration
 * @param userId Optional user ID (defaults to current anonymous user)
 * @returns Promise<QuotaCheckResultTS> The quota check result
 */
export const checkMessageQuota = async (
    agentConfigId: string, 
    userId?: string
): Promise<QuotaCheckResultTS> => {
    try {
        const currentUserId = userId || getOrSetAnonymousUserId();
        
        console.log(`[userAgentUsageService] Checking quota for user ${currentUserId}, agent ${agentConfigId}`);
        
        // Call the Supabase function
        const { data, error } = await supabase.rpc('check_message_quota', {
            p_user_id: currentUserId,
            p_agent_config_id: agentConfigId
        });

        if (error) {
            console.error('[userAgentUsageService] Error checking message quota:', error);
            throw error;
        }

        console.log('[userAgentUsageService] Quota check result:', data);
        
        // Parse the JSON response from the function
        const result: QuotaCheckResultTS = {
            canSend: data.canSend,
            remainingQuota: data.remainingQuota,
            resetTime: data.resetTime,
            isUnlimited: data.isUnlimited,
            currentUsage: data.currentUsage,
            maxMessages: data.maxMessages
        };

        return result;
    } catch (error) {
        console.error('[userAgentUsageService] Error in checkMessageQuota:', error);
        throw error;
    }
};

/**
 * Updates the message usage count for a user and agent configuration
 * @param agentConfigId The ID of the agent configuration
 * @param userId Optional user ID (defaults to current anonymous user)
 * @returns Promise<void>
 */
export const updateMessageUsage = async (
    agentConfigId: string, 
    userId?: string
): Promise<void> => {
    try {
        const currentUserId = userId || getOrSetAnonymousUserId();
        
        console.log(`[userAgentUsageService] Updating usage for user ${currentUserId}, agent ${agentConfigId}`);
        
        // Call the Supabase function
        const { error } = await supabase.rpc('update_message_usage', {
            p_user_id: currentUserId,
            p_agent_config_id: agentConfigId
        });

        if (error) {
            console.error('[userAgentUsageService] Error updating message usage:', error);
            throw error;
        }

        console.log('[userAgentUsageService] Successfully updated message usage');
    } catch (error) {
        console.error('[userAgentUsageService] Error in updateMessageUsage:', error);
        throw error;
    }
};

/**
 * Gets usage history for a user and agent configuration
 * @param agentConfigId The ID of the agent configuration
 * @param userId Optional user ID (defaults to current anonymous user)
 * @param limit Optional limit for number of records (defaults to 10)
 * @returns Promise<UserAgentUsageTS[]> Array of usage records
 */
export const getUserAgentUsageHistory = async (
    agentConfigId: string,
    userId?: string,
    limit: number = 10
): Promise<UserAgentUsageTS[]> => {
    try {
        const currentUserId = userId || getOrSetAnonymousUserId();
        
        console.log(`[userAgentUsageService] Fetching usage history for user ${currentUserId}, agent ${agentConfigId}`);
        
        const { data, error } = await supabase
            .from('user_agent_usage')
            .select('*')
            .eq('user_id', currentUserId)
            .eq('agent_config_id', agentConfigId)
            .order('usage_window_start', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[userAgentUsageService] Error fetching usage history:', error);
            throw error;
        }

        if (!data) return [];

        console.log(`[userAgentUsageService] Fetched ${data.length} usage records`);
        return data.map(mapToUserAgentUsageTS);
    } catch (error) {
        console.error('[userAgentUsageService] Error in getUserAgentUsageHistory:', error);
        throw error;
    }
};

/**
 * Gets current usage summary for all agents for a user
 * @param userId Optional user ID (defaults to current anonymous user)
 * @returns Promise<UserAgentUsageTS[]> Array of current usage records
 */
export const getCurrentUsageSummary = async (userId?: string): Promise<UserAgentUsageTS[]> => {
    try {
        const currentUserId = userId || getOrSetAnonymousUserId();
        
        console.log(`[userAgentUsageService] Fetching current usage summary for user ${currentUserId}`);
        
        // Get usage records from the last 24 hours to capture current windows
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        const { data, error } = await supabase
            .from('user_agent_usage')
            .select('*')
            .eq('user_id', currentUserId)
            .gte('usage_window_start', twentyFourHoursAgo.toISOString())
            .order('last_updated', { ascending: false });

        if (error) {
            console.error('[userAgentUsageService] Error fetching usage summary:', error);
            throw error;
        }

        if (!data) return [];

        console.log(`[userAgentUsageService] Fetched ${data.length} current usage records`);
        return data.map(mapToUserAgentUsageTS);
    } catch (error) {
        console.error('[userAgentUsageService] Error in getCurrentUsageSummary:', error);
        throw error;
    }
};

/**
 * Manually creates or updates a usage record (for testing/admin purposes)
 * @param payload The usage data to create/update
 * @returns Promise<UserAgentUsageTS> The created/updated usage record
 */
export const createOrUpdateUsageRecord = async (payload: {
    user_id: string;
    agent_config_id: string;
    usage_window_start: string;
    message_count: number;
}): Promise<UserAgentUsageTS> => {
    try {
        console.log('[userAgentUsageService] Creating/updating usage record:', payload);
        
        const insertData: InsertUserAgentUsage = {
            user_id: payload.user_id,
            agent_config_id: payload.agent_config_id,
            usage_window_start: payload.usage_window_start,
            message_count: payload.message_count,
            last_updated: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('user_agent_usage')
            .upsert(insertData, { 
                onConflict: 'user_id,agent_config_id,usage_window_start',
                ignoreDuplicates: false 
            })
            .select()
            .single();

        if (error) {
            console.error('[userAgentUsageService] Error creating/updating usage record:', error);
            throw error;
        }

        if (!data) {
            throw new Error('Failed to create/update usage record');
        }

        console.log('[userAgentUsageService] Successfully created/updated usage record:', data);
        return mapToUserAgentUsageTS(data);
    } catch (error) {
        console.error('[userAgentUsageService] Error in createOrUpdateUsageRecord:', error);
        throw error;
    }
};