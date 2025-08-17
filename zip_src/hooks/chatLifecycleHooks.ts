export type ChatHookContext = {
    sessionId: string;
    message: string;
    userId: string;
    agentConfigId: string;
    cwd?: string;
};

export type ChatHook = (ctx: ChatHookContext) => Promise<void> | void;

// Module-level singleton arrays for hooks
const preChatHooks: ChatHook[] = [];
const postChatHooks: ChatHook[] = [];

export function registerPreChatHook(hook: ChatHook): void {
    preChatHooks.push(hook);
}

export function unregisterPreChatHook(hook: ChatHook): void {
    const index = preChatHooks.indexOf(hook);
    if (index !== -1) {
        preChatHooks.splice(index, 1);
    }
}

export function registerPostChatHook(hook: ChatHook): void {
    postChatHooks.push(hook);
}

export function unregisterPostChatHook(hook: ChatHook): void {
    const index = postChatHooks.indexOf(hook);
    if (index !== -1) {
        postChatHooks.splice(index, 1);
    }
}

export async function runPreChatHooks(ctx: ChatHookContext): Promise<void> {
    for (const hook of preChatHooks) {
        console.log(`[ChatHook] Running pre-chat hook for session ${ctx.sessionId}, with ctx: ${JSON.stringify(ctx)}`);
        try {
            await hook(ctx);
        } catch (err) {
            console.error('[ChatHook] Pre-chat hook error:', err);
            // Continue executing remaining hooks even if one fails
        }
    }
}

export async function runPostChatHooks(ctx: ChatHookContext): Promise<void> {
    for (const hook of postChatHooks) {
        try {
            console.log(`[ChatHook] Running post-chat hook for session ${ctx.sessionId}, with ctx: ${JSON.stringify(ctx)}`);
            await hook(ctx);
        } catch (err) {
            console.error('[ChatHook] Post-chat hook error:', err);
            // Continue executing remaining hooks even if one fails
        }
    }
}
