// Backward compatibility layer for the old chatStore
// This file re-exports the new refactored store with the same interface
// TODO: Remove this file after all components are migrated to new hooks

import { useChatStore as useNewChatStore } from './chat';

// Re-export the new store with the old name for backward compatibility
export const useChatStore = useNewChatStore;

// Export types for backward compatibility
export type { ChatStore as ChatStoreState } from './chat';

console.warn('[DEPRECATED] Using legacy chatStore import. Please migrate to @/stores/chat/hooks/* for better performance and maintainability.');