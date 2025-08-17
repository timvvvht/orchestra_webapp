/**
 * Chat Interface Hooks - Extracted from ChatMainCanonicalLegacy
 * 
 * These hooks provide focused, reusable state management for different
 * aspects of the chat interface:
 * 
 * - useChatSession: Session management and hydration
 * - useChatScrolling: Auto-scroll behavior and message indicators
 * - useChatSSE: Server-Sent Events processing and batching
 */

export { useChatSession } from './useChatSession';
export { useChatScrolling } from './useChatScrolling';
export { useChatSSE } from './useChatSSE';