import React from 'react';
import { ChatHeader } from './header';

interface ChatHeaderFixedProps {
  sessionId?: string | null;
  onNewChat?: () => void;
  onOpenAgentSelector?: () => void;
  className?: string;
  // Refined mode props
  refinedMode?: boolean;
  onToggleRefinedMode?: (active: boolean) => void;
  hasMessages?: boolean;
  // Stream debug overlay props
  streamDebugOverlayOpen?: boolean;
  onToggleStreamDebugOverlay?: (open: boolean) => void;
  // Hydration debug overlay props
  hydrationDebugOverlayOpen?: boolean;
  onToggleHydrationDebugOverlay?: (open: boolean) => void;
}

/**
 * @deprecated This component is a legacy wrapper. The main implementation has been moved to './header/ChatHeader.tsx'.
 * This wrapper is preserved for backward compatibility but should not be used for new development.
 * It will be removed in a future version.
 * 
 * ChatHeaderFixed - Wrapper component that maintains backward compatibility
 * 
 * This component has been refactored to use the new modular ChatHeader component
 * with well-organized subcomponents. The original 750+ line component has been
 * broken down into focused, reusable components:
 * 
 * - AgentSelector: Agent dropdown and selection logic
 * - ModelSelector: Model dropdown and selection logic  
 * - SessionMetadata: Session duration, name, message count display
 * - CapabilitiesDisplay: Agent tools and capabilities with progressive disclosure
 * - HeaderActions: New chat button, refined mode toggle, settings
 * - DebugPanel: Comprehensive debugging information
 * - ChatHeader: Main orchestrator component
 * 
 * Benefits of refactoring:
 * - Single responsibility principle
 * - Improved maintainability
 * - Better testability
 * - Reusable components
 * - Cleaner code organization
 * 
 * The new architecture maintains all existing functionality while being
 * much more maintainable and organized.
 */
export function ChatHeaderFixed({
  sessionId,
  onNewChat,
  onOpenAgentSelector,
  className = '',
  refinedMode,
  onToggleRefinedMode,
  hasMessages,
  streamDebugOverlayOpen,
  onToggleStreamDebugOverlay,
  hydrationDebugOverlayOpen,
  onToggleHydrationDebugOverlay
}: ChatHeaderFixedProps) {
  // The new ChatHeader component handles all the functionality
  // that was previously in this 750+ line component
  return (
    <ChatHeader 
      sessionId={sessionId}
      onOpenAgentSelector={onOpenAgentSelector}
      className={className}
      refinedMode={refinedMode}
      onToggleRefinedMode={onToggleRefinedMode}
      hasMessages={hasMessages}
      streamDebugOverlayOpen={streamDebugOverlayOpen}
      onToggleStreamDebugOverlay={onToggleStreamDebugOverlay}
      hydrationDebugOverlayOpen={hydrationDebugOverlayOpen}
      onToggleHydrationDebugOverlay={onToggleHydrationDebugOverlay}
    />
  );
}

export default ChatHeaderFixed;