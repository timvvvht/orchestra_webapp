import { supabase } from './supabaseClient';
import { getCurrentUserId } from '@/lib/userUtils';
import {
    ChatMessage,
    RichContentPart,
    TextPart,
    ToolUsePart,
    ToolResultPart
} from '@/types/chatTypes';
import type { Tables } from '@/types/supabase';

// Define Supabase table types
type SupabaseChatMessageRow = Tables<'chat_messages'>;

/**
 * Converts Supabase Json content to RichContentPart[]
 */
const convertJsonToRichContent = (content: any): RichContentPart[] => {
    if (!Array.isArray(content)) {
        return [{ type: 'text', text: String(content) }];
    }

    return content.map(item => {
        if (typeof item !== 'object' || item === null) {
            return { type: 'text', text: String(item) } as TextPart;
        }

        if ('type' in item) {
            const type = item.type as string;

            if (type === 'text' && 'text' in item) {
                return { type: 'text', text: String(item.text) } as TextPart;
            }

            if (type === 'tool_use' && ('id' in item || 'tool_use_id' in item) && ('name' in item || 'tool_name' in item)) {
                return {
                    type: 'tool_use',
                    id: String(item.id || item.tool_use_id),
                    name: String(item.name || item.tool_name),
                    input: item.input || item.tool_input
                } as ToolUsePart;
            }

            if ((type === 'tool_result' || type === 'tool_output') && ('tool_use_id' in item || 'tool_use_id_for_output' in item)) {
                let contentStr = '';
                const rawContent = item.content || item.output;
                
                if (typeof rawContent === 'string') {
                    contentStr = rawContent;
                } else if (Array.isArray(rawContent)) {
                    contentStr = rawContent
                        .map((contentItem: any) => {
                            if (typeof contentItem === 'string') return contentItem;
                            if (contentItem?.text) return contentItem.text;
                            return JSON.stringify(contentItem);
                        })
                        .join('\n');
                } else if (rawContent && typeof rawContent === 'object') {
                    contentStr = JSON.stringify(rawContent, null, 2);
                } else {
                    contentStr = String(rawContent);
                }
                
                return {
                    type: 'tool_result',
                    tool_use_id: String(item.tool_use_id || item.tool_use_id_for_output),
                    content: contentStr,
                    is_error: Boolean(item.is_error || (item.status === 'error'))
                } as ToolResultPart;
            }
        }

        console.warn('[chatMessageService] Unrecognized content part, converting to text:', item);
        return { type: 'text', text: JSON.stringify(item) } as TextPart;
    });
};

/**
 * Maps a Supabase ChatMessage to the frontend ChatMessage type
 */
const mapToChatMessage = (dbMsg: SupabaseChatMessageRow): ChatMessage => {
    const role = dbMsg.role.toLowerCase() as any;
    const content = convertJsonToRichContent(dbMsg.content);

    return {
        id: dbMsg.id,
        sessionId: dbMsg.session_id,
        role,
        content,
        timestamp: new Date(dbMsg.timestamp).getTime(),
        model: dbMsg.model_used || undefined
    };
};

export interface MessagePaginationOptions {
    limit?: number;
    cursor?: string; // Message ID to start from
    direction?: 'before' | 'after';
}

/**
 * Gets messages for a specific session with pagination support
 */
export const getMessagesForSession = async (
    sessionId: string,
    options: MessagePaginationOptions = {}
): Promise<{ messages: ChatMessage[]; hasMore: boolean; nextCursor?: string }> => {
    try {
        const { limit = 50, cursor, direction = 'before' } = options;
        const currentUserId = await getCurrentUserId();

        // First verify the session belongs to the current user
        const { data: sessionData, error: sessionError } = await supabase
            .from('chat_sessions')
            .select('user_id')
            .eq('id', sessionId)
            .single();

        if (sessionError || !sessionData) {
            throw new Error('Session not found');
        }

        if (sessionData.user_id !== currentUserId) {
            throw new Error('Unauthorized access to session');
        }

        // Build the query
        let query = supabase
            .from('chat_messages')
            .select()
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });

        // Apply cursor-based pagination
        if (cursor) {
            // Get the timestamp of the cursor message
            const { data: cursorMsg } = await supabase
                .from('chat_messages')
                .select('timestamp')
                .eq('id', cursor)
                .single();

            if (cursorMsg) {
                if (direction === 'before') {
                    query = query.lt('timestamp', cursorMsg.timestamp);
                } else {
                    query = query.gt('timestamp', cursorMsg.timestamp);
                }
            }
        }

        // Fetch one extra to determine if there are more
        query = query.limit(limit + 1);

        const { data: messagesData, error: messagesError } = await query;

        if (messagesError) throw messagesError;

        const messages = messagesData ? messagesData.slice(0, limit).map(mapToChatMessage) : [];
        const hasMore = messagesData ? messagesData.length > limit : false;
        const nextCursor = hasMore && messages.length > 0 ? messages[0].id : undefined;

        console.log(`[chatMessageService] Fetched ${messages.length} messages for session ${sessionId}`);
        
        return { messages, hasMore, nextCursor };
    } catch (error) {
        console.error(`[chatMessageService] Error fetching messages for session ${sessionId}:`, error);
        throw error;
    }
};

/**
 * Gets only the most recent messages for a session (for initial load)
 */
export const getRecentMessagesForSession = async (
    sessionId: string,
    limit: number = 50
): Promise<ChatMessage[]> => {
    try {
        const currentUserId = await getCurrentUserId();

        // Verify session ownership
        const { data: sessionData, error: sessionError } = await supabase
            .from('chat_sessions')
            .select('user_id')
            .eq('id', sessionId)
            .single();

        if (sessionError || !sessionData || sessionData.user_id !== currentUserId) {
            throw new Error('Session not found or unauthorized');
        }

        // Get the most recent messages
        const { data: messagesData, error: messagesError } = await supabase
            .from('chat_messages')
            .select()
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (messagesError) throw messagesError;

        // Reverse to get chronological order
        const messages = messagesData ? messagesData.reverse().map(mapToChatMessage) : [];

        console.log(`[chatMessageService] Fetched ${messages.length} recent messages for session ${sessionId}`);
        
        return messages;
    } catch (error) {
        console.error(`[chatMessageService] Error fetching recent messages for session ${sessionId}:`, error);
        throw error;
    }
};

/**
 * Prefetch messages for multiple sessions (for performance optimization)
 */
export const prefetchMessagesForSessions = async (
    sessionIds: string[],
    limit: number = 30
): Promise<Record<string, ChatMessage[]>> => {
    try {
        const currentUserId = await getCurrentUserId();
        const result: Record<string, ChatMessage[]> = {};

        // Batch fetch session ownership verification
        const { data: sessions, error: sessionError } = await supabase
            .from('chat_sessions')
            .select('id')
            .in('id', sessionIds)
            .eq('user_id', currentUserId);

        if (sessionError) throw sessionError;

        const authorizedSessionIds = sessions?.map(s => s.id) || [];

        // Fetch messages for all authorized sessions in one query
        const { data: allMessages, error: messagesError } = await supabase
            .from('chat_messages')
            .select()
            .in('session_id', authorizedSessionIds)
            .order('timestamp', { ascending: false });

        if (messagesError) throw messagesError;

        // Group messages by session and limit
        for (const sessionId of authorizedSessionIds) {
            const sessionMessages = allMessages
                ?.filter(msg => msg.session_id === sessionId)
                .slice(0, limit)
                .reverse()
                .map(mapToChatMessage) || [];
            
            result[sessionId] = sessionMessages;
        }

        console.log(`[chatMessageService] Prefetched messages for ${Object.keys(result).length} sessions`);
        
        return result;
    } catch (error) {
        console.error('[chatMessageService] Error prefetching messages:', error);
        return {};
    }
};