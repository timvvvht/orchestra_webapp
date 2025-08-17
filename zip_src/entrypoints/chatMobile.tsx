import ChatMainCanonicalLegacy from '@/components/chat-interface/ChatMainCanonicalLegacy';

/**
 * Mobile-optimized chat entry point
 * Includes touch interactions, reduced animations, mobile input patterns
 */
export default function ChatMobile() {
  return <ChatMainCanonicalLegacy sidebarCollapsed={false} />;
}