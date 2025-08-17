import type { ChatHookContext } from '@/hooks/chatLifecycleHooks';

/**
 * Post-chat hook placeholder for extensibility demonstration
 * This hook runs after every successful chat message is sent
 */
export async function postChatLogging(ctx: ChatHookContext): Promise<void> {
  console.log('[PostChatHook] message sent', ctx.sessionId);
}