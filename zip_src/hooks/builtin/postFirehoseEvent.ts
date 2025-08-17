import { eventBus } from '@/services/acs/eventBus';
import type { ChatHookContext } from '@/hooks/chatLifecycleHooks';

/**
 * Build and send firehose event after a successful chat completion
 */
export async function postFirehoseEvent(ctx: ChatHookContext): Promise<void> {
  try {
    // Create an SSE-compatible event for the firehose system
    const firehoseEvent = {
      type: 'chat_completion',
      sessionId: ctx.sessionId,
      data: {
        userId: ctx.userId,
        agentConfigId: ctx.agentConfigId,
        messageLength: ctx.message.length,
        timestamp: Date.now(),
        cwd: ctx.cwd
      }
    };

    // Emit to the global event bus (same pattern as ACSFirehoseService)
    eventBus.emit('sse', firehoseEvent);

    console.log('[postFirehoseEvent] Chat completion event sent to firehose', {
      sessionId: ctx.sessionId.slice(0, 8) + '...',
      messageLength: ctx.message.length,
      userId: ctx.userId
    });
  } catch (err) {
    console.error('[postFirehoseEvent] Failed to send firehose event:', err);
    // Don't throw - hooks should not break chat flow
  }
}