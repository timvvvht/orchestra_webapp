import ChatMainCanonicalLegacy from '@/components/chat-interface/ChatMainCanonicalLegacy';

/**
 * Desktop-optimized chat entry point
 * Includes full feature set with drag-resize, hover states, etc.
 */
export default function ChatDesktop() {
  return <ChatMainCanonicalLegacy sidebarCollapsed={false} />;
}