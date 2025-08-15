/**
 * Chat lifecycle hooks for pre/post chat processing
 * Stub implementation for web app - hooks are handled differently
 */

export interface ChatHookContext {
  sessionId: string;
  message: string;
  userId: string;
  agentConfigId: string;
  cwd?: string;
}

export interface ChatHookResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Run pre-chat hooks before sending a message
 * Stub implementation for web app
 */
export async function runPreChatHooks(context: ChatHookContext): Promise<ChatHookResult> {
  console.warn('[ChatLifecycleHooks] Stub implementation - runPreChatHooks not functional in web app');
  return { success: true };
}

/**
 * Run post-chat hooks after sending a message
 * Stub implementation for web app
 */
export async function runPostChatHooks(context: ChatHookContext): Promise<ChatHookResult> {
  console.warn('[ChatLifecycleHooks] Stub implementation - runPostChatHooks not functional in web app');
  return { success: true };
}

/**
 * Register a pre-chat hook
 * Stub implementation for web app
 */
export function registerPreChatHook(name: string, hook: (context: ChatHookContext) => Promise<ChatHookResult>): void {
  console.warn('[ChatLifecycleHooks] Stub implementation - registerPreChatHook not functional in web app');
}

/**
 * Register a post-chat hook
 * Stub implementation for web app
 */
export function registerPostChatHook(name: string, hook: (context: ChatHookContext) => Promise<ChatHookResult>): void {
  console.warn('[ChatLifecycleHooks] Stub implementation - registerPostChatHook not functional in web app');
}