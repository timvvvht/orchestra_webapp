import { sendChatMessage, type SendChatMessageParams, type SendChatMessageResult } from '@/utils/sendChatMessage';
import { runPreChatHooks, runPostChatHooks, type ChatHookContext } from '@/hooks/chatLifecycleHooks';

export interface SendChatWithHooksOptions extends SendChatMessageParams {
    cwd?: string;
}

export async function sendChatWithHooks(options: SendChatWithHooksOptions): Promise<SendChatMessageResult> {
    const { sessionId, message, userId, agentConfigName: agentConfigId, cwd } = options;

    // Build ChatHookContext from options
    const ctx: ChatHookContext = {
        sessionId,
        message,
        userId,
        agentConfigId,
        cwd
    };

    try {
        // Run pre-chat hooks
        console.log(`[sendChatWithHooks] Running pre-chat hooks for session ${sessionId}, with ctx: ${JSON.stringify(ctx)}`);
        await runPreChatHooks(ctx);

        // Send the chat message
        const result = await sendChatMessage(options);

        // Post-chat hooks are now triggered by the PostHookListenerService based on SSE events.
        // We no longer call them here.

        return result;
    } catch (error) {
        console.error('[sendChatWithHooks] Unexpected error:', error);
        return {
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
