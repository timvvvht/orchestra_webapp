/**
 * Modular ACS Chat Hooks
 * 
 * This directory contains a refactored version of the monolithic useACSChatUI hook,
 * broken down into smaller, focused hooks with single responsibilities.
 * 
 * Architecture:
 * - Each hook handles one domain (client, sessions, messages, streaming)
 * - Hooks can be used independently or composed together
 * - Clear separation of concerns and dependencies
 * - Easier testing and maintenance
 */

// Core domain hooks
export { useACSClient } from './useACSClient';
export { useACSChatSessions } from './useACSChatSessions';
export { useACSChatMessages } from './useACSChatMessages';
export { useACSChatStreaming } from './useACSChatStreaming';

// Orchestrator hook (drop-in replacement for useACSChatUI)
export { useACSChatUIRefactored } from './useACSChatUIRefactored';

// Type exports
export type { UseACSClientOptions, UseACSClientReturn } from './useACSClient';
export type { UseACSChatSessionsOptions, UseACSChatSessionsReturn } from './useACSChatSessions';
export type { UseACSChatMessagesOptions, UseACSChatMessagesReturn } from './useACSChatMessages';
export type { UseACSChatStreamingOptions, UseACSChatStreamingReturn } from './useACSChatStreaming';

// Re-export types from original hook for compatibility
export type { UseACSChatUIOptions, UseACSChatUIReturn } from '../useACSChatUI';