import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AnimatePresence, motion } from "framer-motion";

// ACS imports
import { useACSClient } from "@/hooks/acs-chat/useACSClient";
import { useAuth } from "@/auth/AuthContext";
import { useBYOKStore } from "@/stores/byokStore";
import { createACSTemplateVariables } from "@/utils/templateVariables";
import { sendChatMessage } from "@/utils/sendChatMessage";

// Types
import type { ChatMessage as ChatMessageType } from "@/types/chatTypes";

type Base64URLString = string;

// Components
import AgentProfile from "./AgentProfile";
import ChatHeader from "./header/ChatHeader";
import NewChatModal from "./NewChatModal";
import { shouldUseUnifiedRendering } from "./UnrefinedModeTimelineRenderer";
import { renderUnifiedTimelineEvent } from "./UnifiedTimelineRenderer";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import ChatEmptyState from "./ChatEmptyState";
import ChatTypingIndicator from "./ChatTypingIndicator";
import ChatMessageList from "./ChatMessageList";
import ChatLoadingOverlay from "./ChatLoadingOverlay";

// Performance optimizations
import {
  getOptimizedVisibleMessages,
  isOptimizedFinalAssistantMessage,
  getOptimizedFileOperationsForResponse,
} from "@/utils/optimizedMessageFiltering";

// Chat utilities (extracted from this component)
import {
  formatMessageDate,
  isSameDay,
  shouldGroupMessages,
  convertEventsToMessages,
} from "@/utils/chat";

// Canonical store imports
import { useEventStore } from "@/stores/eventStore";
import { useSessionStatusStore } from "@/stores/sessionStatusStore";
import { clearDuplicateCache } from "@/stores/eventReducer";
import { hydrateSession } from "@/stores/eventBridges/historyBridge";
import { useChatUI } from "@/context/ChatUIContext";
import { useSelections, getAcsOverrides } from "@/context/SelectionContext";
import { supabase } from "@/auth/SupabaseClient";

// Approval imports
import { ApprovalPanel } from "@/components/approval/ApprovalPanel";

import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import PendingToolsDebugOverlay from "./PendingToolsDebugOverlay";
import { ScrollArea } from "../ui/ScrollArea";
import { Button } from "../ui/Button";
import { toast } from "sonner";
import ChatScrollAnchor from "./ChatScrollAnchor";
import NewMessagesIndicator from "./NewMessagesIndicator";
import { cn } from "@/lib/utils";
import { cancelConversation } from "@/utils/cancelConversation";
import { LexicalChatInput } from "./MobileLexicalChatInput";
import { Image } from "lucide-react";

// Lazy render constants
const INITIAL_RENDER_BATCH = 15;
const RENDER_BATCH_INCREMENT = 30;

// ────────────────────────────────────────────────────────────────────────────────
// DEBUG: Global stream-complete tracker
// Creates window.__STREAM_DEBUG with an addLogEntry helper so developers can
// inspect streaming completion events from the console.
// ────────────────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    __STREAM_DEBUG?: {
      logs: Array<{ sessionId: string; timestamp: string }>;
      addLogEntry?: (entry: { sessionId: string; timestamp: string }) => void;
    };
  }
}

if (import.meta.env.DEV && !(window as any).__STREAM_DEBUG) {
  (window as any).__STREAM_DEBUG = {
    logs: [],
  };
  (window as any).__STREAM_DEBUG.addLogEntry = (entry: {
    sessionId: string;
    timestamp: string;
  }) => {
    const logs = (window as any).__STREAM_DEBUG.logs;
    logs.push(entry);
    // Cap the logs array at 500 entries to prevent memory leaks
    const MAX_LOGS = 500;
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
    }
    // Also emit to console for quick inspection (removed)
  };
}

interface ChatMainCanonicalLegacyProps {
  sidebarCollapsed: boolean;
  sessionId: string; // Optional prop - falls back to URL params if not provided
  renderContext?: "default" | "mission-control"; // New prop to specify rendering context
  onSubmit?: (message: string, images?: string[]) => Promise<void>; // Optional custom submit handler
  hideHeader?: boolean; // Optional prop to hide the ChatHeader component
  hideInput?: boolean; // Optional prop to hide the input area
  // NEW: single abstraction for mission control
  sessionIsActive?: boolean; // Parent-controlled: true => show busy visuals
  onToggleSessionActive?: (next: boolean) => void; // Parent-provided toggle handler
  agentCwd?: string; // Optional: explicit working directory for LexicalChatInput
}

// Note: convertEventsToMessages function moved to @/utils/chat/eventConversion.ts

/**
 * ChatMainCanonicalLegacy - The primary chat interface component using canonical store
 */
const ChatMainCanonicalLegacyComponent: React.FC<
  ChatMainCanonicalLegacyProps
> = ({
  sidebarCollapsed,
  sessionId: propSessionId,
  renderContext = "default",
  onSubmit: customOnSubmit,
  hideHeader = false,
  hideInput = false,
  sessionIsActive,
  onToggleSessionActive,
  agentCwd,
}) => {
  // Performance monitoring
  usePerformanceMonitor();

  const [showTextInputArea, setShowTextInputArea] =
    useState<boolean>(!hideInput);

  // Debug overlay - track container size via ResizeObserver
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  // Auth and ACS
  const auth = useAuth();
  const {
    acsClient,
    isInitialized: acsInitialized,
    initialize: initializeACS,
  } = useACSClient();

  // Navigation hooks for URL cleanup
  const navigate = useNavigate();
  const location = useLocation();

  // State - inputMessage moved to ChatInput component for performance
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [refinedMode, setRefinedMode] = useState(false);

  const [images, setImages] = useState<string[]>([]);

  const removeImage = useCallback((img: string) => {
    setImages((prev) => prev.filter((p) => p !== img));
  }, []);

  const handleImageUpload = (file: File) => {
    const maxPromptSize = parseInt(
      String(import.meta.env.VITE_MAX_PROMPT_SIZE * 1024 * 1044) || "15728640"
    ); // 15MB default

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;

      // Calculate total size of all images including the new one
      const currentTotalSize = images.reduce(
        (total, img) => total + img.length,
        0
      );
      const newTotalSize = currentTotalSize + base64String.length;

      if (newTotalSize > maxPromptSize) {
        toast.error(
          `Total prompt size would exceed ${Math.round(maxPromptSize / 1024 / 1024)}MB limit`
        );
        console.error(
          `Total prompt size would exceed ${Math.round(maxPromptSize / 1024 / 1024)}MB limit`
        );
        return;
      }

      // Only add the image if it's not already in the array
      setImages((prev) => {
        if (!prev.includes(base64String)) {
          return [...prev, base64String];
        }
        return prev;
      });
    };
    reader.readAsDataURL(file);
  };

  // State for stream debug overlay
  const [streamDebugOverlayOpen, setStreamDebugOverlayOpen] = useState(false);

  // State for hydration debug overlay
  const [hydrationDebugOverlayOpen, setHydrationDebugOverlayOpen] =
    useState(false);

  // State for tool debug panel
  const [toolDebugOpen, setToolDebugOpen] = useState(false);

  // State for event tap debug overlay
  const [eventTapDebugOpen, setEventTapDebugOpen] = useState(false);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          handleImageUpload(file);
        }
      });
    },
    [images]
  );

  // Local + context loading (fallback)
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const fallbackIsLoading = localIsLoading;
  // New: track when session hydration is occurring due to a session switch
  const [isSessionHydrating, setIsSessionHydrating] = useState(false);

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugData, setDebugData] = useState<{
    supabaseData: any[];
    storeData: any[];
    loading: boolean;
  }>({ supabaseData: [], storeData: [], loading: false });

  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const previousSessionIdRef = useRef<string | undefined>(undefined);
  const activeHydrationRef = useRef<string | null>(null); // Track active hydration to prevent races
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll state
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [anchorVisible, setAnchorVisible] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // Lazy render state
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_BATCH);
  const loadingOlderRef = useRef(false);

  // Scroll throttling
  const scrollRafRef = useRef<number | null>(null);

  // Params and context - use prop sessionId if provided, otherwise fall back to URL params
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const sessionId = propSessionId ?? urlSessionId;
  const [searchParams] = useSearchParams();
  const selections = useSelections();
  const acsOverrides = selections; // Renaming variable for clarity

  // Log component mount and session info
  useEffect(() => {
    console.log(
      `🚀 [ChatMainCanonicalLegacy] Component mounted for session: ${sessionId || "none"}`,
      {
        sessionId,
        renderContext,
        hideHeader,
        hideInput,
        sessionIsActive,
      }
    );
  }, [sessionId, renderContext, hideHeader, hideInput, sessionIsActive]);

  // ✅ ROBUST: Check if session is idle using new centralized store
  const idleNow = useSessionStatusStore((state) =>
    sessionId ? state.getStatus(sessionId) === "idle" : true
  );

  const isTyping = useMemo(() => {
    // If agent is marked as idle, don't show typing indicator
    if (idleNow) {
      return false;
    }

    const streamingMessages = messages.filter((msg) => msg.isStreaming);
    return streamingMessages.length > 0;
  }, [messages, idleNow]);

  // "AI is typing" if the session is currently marked as awaiting
  const isWaitingForAI = useSessionStatusStore((s) =>
    sessionId ? s.getStatus(sessionId) === "awaiting" : false
  );

  const effectiveActive =
    typeof sessionIsActive === "boolean"
      ? sessionIsActive
      : isTyping || fallbackIsLoading || isWaitingForAI;
  const effectiveDisabled = effectiveActive; // In MC, when active (busy), disable input

  // Initialize stream debug global object
  useEffect(() => {
    if (import.meta.env.DEV && !(window as any).__STREAM_DEBUG) {
      (window as any).__STREAM_DEBUG = {
        logs: [],
        addLogEntry: (entry: any) => {
          const logs = (window as any).__STREAM_DEBUG.logs;
          logs.push({
            ...entry,
            timestamp: new Date().toISOString(),
          });
          // Cap the logs array at 500 entries to prevent memory leaks
          const MAX_LOGS = 500;
          if (logs.length > MAX_LOGS) {
            logs.splice(0, logs.length - MAX_LOGS);
          }
        },
      };
    }
  }, []);

  // Debug refined mode changes
  useEffect(() => {
    // Effect for tracking refined mode changes
  }, [refinedMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    update(); // initial

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Clean up query parameters after initial load
  useEffect(() => {
    // Only clean up if we have query parameters and a valid session
    if (sessionId && location.search) {
      const currentParams = new URLSearchParams(location.search);
      const hasBootstrapParams =
        currentParams.has("initialMessage") ||
        currentParams.has("agentConfigId") ||
        currentParams.has("modelId") ||
        currentParams.has("sessionName") ||
        currentParams.has("projectPath");

      if (hasBootstrapParams) {
        if (import.meta.env.DEV) {
          console.log(
            "🧹 [ChatMainCanonicalLegacy] Cleaning up bootstrap query parameters"
          );
        }
        // Navigate to clean URL without query parameters
        navigate(`/chat/${sessionId}`, { replace: true });
      }
    }
  }, [sessionId, location.search, navigate]);

  // Monitor sessionId changes and reset auto-scroll state
  useEffect(() => {
    console.log(
      `🔄 [SessionChange] New session: ${sessionId}, resetting auto-scroll state`
    );

    // Reset auto-scroll state for new session
    setIsAtBottom(true);
    setAnchorVisible(true);
    setNewMessageCount(0);
    setHasScrolledUp(false);
    setLastMessageCount(0);

    // Reset render limit for new session
    setRenderLimit(INITIAL_RENDER_BATCH);

    // Scroll to bottom after a brief delay to ensure DOM is ready
    setTimeout(() => {
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        console.log(
          `🔄 [SessionChange] Scrolling to bottom for session: ${sessionId}`
        );
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  }, [sessionId]);

  // Lifecycle monitoring
  useEffect(() => {
    const startTime = Date.now();

    // Monitor store clears by patching the clearAll method
    const originalClearAll = useEventStore.getState().clearAll;
    const patchedClearAll = () => {
      // Store clearing logic (debug logging removed)
      const result = originalClearAll();
      return result;
    };

    useEventStore.setState((state) => ({
      ...state,
      clearAll: patchedClearAll,
    }));

    // Remove periodic logging interval

    return () => {
      // Cleanup logic

      // Restore original clearAll method
      useEventStore.setState((state) => ({
        ...state,
        clearAll: originalClearAll,
      }));
    };
  }, []);

  // Load events from canonical store
  const loadEvents = useCallback(() => {
    if (!sessionId) {
      return;
    }

    const state = useEventStore.getState();

    // Try session ID first, then 'unknown'
    let eventIds = state.bySession.get(sessionId) || [];
    if (eventIds.length === 0 && state.bySession.has("unknown")) {
      eventIds = state.bySession.get("unknown") || [];
    }

    const events = eventIds
      .map((id) => state.byId.get(id))
      .filter((event): event is NonNullable<typeof event> => Boolean(event));

    // Log individual events for detailed inspection
    events.forEach((event, index) => {
      console.log(
        `📋 [Event ${index + 1}] ID: ${event.id}, Kind: ${event.kind}, Role: ${event.role}, Created: ${event.createdAt}`,
        event
      );
    });

    // Convert to messages
    const convertedMessages = convertEventsToMessages(events);

    setMessages(convertedMessages);
  }, [sessionId]);

  // Auto-scroll functions - handleScroll moved below after mergedMessages is defined

  const scrollToBottom = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const scrollContainer = scrollArea.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, []);

  const handleAnchorVisibilityChange = useCallback((isVisible: boolean) => {
    setAnchorVisible(isVisible);
  }, []);

  // Auto-scroll logic: scroll if user is at bottom OR anchor is not visible (new messages arrived)
  const shouldAutoScroll = useMemo(() => {
    // Auto-scroll if:
    // 1. User is at bottom AND anchor not visible (new content arrived), OR
    // 2. Currently streaming and user hasn't scrolled up significantly
    const hasStreamingMessage = messages.some((m) => m.isStreaming);
    const streamingAutoScroll = hasStreamingMessage && !hasScrolledUp;

    const result = (isAtBottom && !anchorVisible) || streamingAutoScroll;

    console.log(
      `🔄 [AutoScroll] Session: ${sessionId}, shouldAutoScroll: ${result}, isAtBottom: ${isAtBottom}, anchorVisible: ${anchorVisible}, streaming: ${hasStreamingMessage}, scrolledUp: ${hasScrolledUp}`
    );
    return result;
  }, [isAtBottom, anchorVisible, hasScrolledUp, sessionId, messages]);

  // Track new messages for the indicator
  useEffect(() => {
    const currentMessageCount = messages.length;
    if (currentMessageCount > lastMessageCount && !isAtBottom) {
      setNewMessageCount(
        (prev) => prev + (currentMessageCount - lastMessageCount)
      );
    }
    setLastMessageCount(currentMessageCount);
  }, [messages.length, lastMessageCount, isAtBottom]);

  // Reset new message count when user scrolls to bottom
  useEffect(() => {
    if (isAtBottom) {
      setNewMessageCount(0);
    }
  }, [isAtBottom]);

  // Determine which button to show and what variant
  const scrollButtonConfig = useMemo(() => {
    // Priority 1: New messages (always takes precedence)
    if (!isAtBottom && newMessageCount > 0) {
      return {
        show: true,
        variant: "new-messages" as const,
        messageCount: newMessageCount,
      };
    }

    // Priority 2: Back to latest (when scrolled up significantly, no new messages)
    if (hasScrolledUp && newMessageCount === 0) {
      return {
        show: true,
        variant: "back-to-latest" as const,
        messageCount: undefined,
      };
    }

    // Default: No button
    return {
      show: false,
      variant: "new-messages" as const,
      messageCount: 0,
    };
  }, [isAtBottom, newMessageCount, hasScrolledUp]);

  // Load older messages for infinite scroll
  const loadOlderMessages = useCallback(async () => {
    if (!sessionId || sessionId.startsWith("temp-")) return;

    const store = useEventStore.getState();
    const currentEventIds = store.bySession.get(sessionId) || [];

    if (currentEventIds.length === 0) return;

    // Get the oldest event timestamp for pagination
    const oldestEventId = currentEventIds[0];
    const oldestEvent = store.byId.get(oldestEventId);

    if (!oldestEvent) return;

    console.log(
      `📜 [ChatMainCanonicalLegacy] Loading older messages before ${oldestEvent.createdAt}`
    );

    try {
      console.log(
        `📜 [ChatMainCanonicalLegacy] Would load older messages for session ${sessionId}`
      );
    } catch (error) {
      console.error("Failed to load older messages:", error);
    }
  }, [sessionId]);

  // Initialize ACS client
  useEffect(() => {
    if (!acsInitialized) {
      initializeACS().catch((_) => {
        // Error handling maintained without logging
      });
    }
  }, [acsInitialized, initializeACS]);

  // Connect SSE streaming when session and ACS are ready - REMOVED: Now handled by ChatEventOrchestrator
  // useEffect(() => {
  //   if (sessionId && !sessionId.startsWith('temp-') && acsInitialized && !sseConnected) {
  //     connectStreaming(sessionId)
  //       .catch(error => {
  //         // Error handling maintained without logging
  //       });
  //   }
  // }, [sessionId, acsInitialized, sseConnected, connectStreaming]);

  // 🔒 2024-06 fix: initial message now handled exclusively in ChatRoute.
  // Leaving empty effect as a guard against future regression.
  useEffect(() => {
    if (searchParams.get("initialMessage")) {
      if (import.meta.env.DEV) {
        console.warn(
          "[ChatMain] initialMessage param detected but ignored (handled upstream)"
        );
      }
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []); // run once

  const isSessionSwitch =
    previousSessionIdRef.current &&
    previousSessionIdRef.current !== sessionId &&
    !!sessionId &&
    !sessionId.startsWith("temp-");

  // Auto-hydrate on session change
  useEffect(() => {
    if (sessionId && !sessionId.startsWith("temp-")) {
      setLocalIsLoading(true);

      setIsSessionHydrating(Boolean(isSessionSwitch));

      const store = useEventStore.getState();

      // PERFORMANCE: No session clearing - keep all sessions cached for faster switching
      // Previous sessions remain in store for instant switching back
      if (import.meta.env.DEV) {
        console.log(
          `📦 [ChatMainCanonicalLegacy] Keeping previous sessions cached. Store has ${store.bySession.size} sessions.`
        );
      }

      // Update the previous session ID
      previousSessionIdRef.current = sessionId;

      clearDuplicateCache();

      // ROBUSTNESS: Memory management - limit cache size
      const MAX_CACHED_SESSIONS = 20;
      const currentSessionCount = store.bySession.size;
      if (currentSessionCount > MAX_CACHED_SESSIONS) {
        if (import.meta.env.DEV) {
          console.log(
            `🧹 [ChatMainCanonicalLegacy] Cache size (${currentSessionCount}) exceeds limit (${MAX_CACHED_SESSIONS}), cleaning up old sessions`
          );
        }

        // Get all sessions with their last access time (approximate)
        const sessionEntries = Array.from(store.bySession.entries());
        const sessionsWithAge = sessionEntries.map(([sessionId, eventIds]) => {
          let lastEventTime = 0;
          // Check last few events for most recent timestamp
          const recentEvents = eventIds.slice(-3);
          for (const eventId of recentEvents) {
            const event = store.byId.get(eventId);
            if (event?.createdAt) {
              const eventTime = new Date(event.createdAt).getTime();
              lastEventTime = Math.max(lastEventTime, eventTime);
            }
          }
          return { sessionId, lastEventTime, eventCount: eventIds.length };
        });

        // Sort by age (oldest first) and remove oldest sessions
        sessionsWithAge.sort((a, b) => a.lastEventTime - b.lastEventTime);
        const sessionsToRemove = sessionsWithAge.slice(
          0,
          currentSessionCount - MAX_CACHED_SESSIONS + 1
        );

        for (const {
          sessionId: oldSessionId,
          eventCount,
        } of sessionsToRemove) {
          if (oldSessionId !== sessionId) {
            // Don't remove current session
            const eventIds = store.bySession.get(oldSessionId) || [];
            eventIds.forEach((eventId) => {
              if (store.removeEvent) {
                store.removeEvent(eventId);
              }
            });
            if (import.meta.env.DEV) {
              console.log(
                `🗑️ [ChatMainCanonicalLegacy] Removed old session ${oldSessionId} (${eventCount} events)`
              );
            }
          }
        }
      }

      // SMART CACHE: Check if session is already hydrated AND recent
      const sessionEvents = store.bySession.get(sessionId) || [];
      const hasSessionData = sessionEvents.length > 0;

      // Get the most recent event timestamp for cache freshness check
      let mostRecentEventTime = 0;
      if (hasSessionData) {
        const recentEventIds = sessionEvents.slice(-5); // Check last 5 events
        for (const eventId of recentEventIds) {
          const event = store.byId.get(eventId);
          if (event?.createdAt) {
            const eventTime = new Date(event.createdAt).getTime();
            mostRecentEventTime = Math.max(mostRecentEventTime, eventTime);
          }
        }
      }

      // Cache is considered fresh if:
      // 1. We have session data AND
      // 2. Most recent event is less than 5 minutes old OR we just switched sessions recently
      const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
      const cacheAge = Date.now() - mostRecentEventTime;
      const isCacheFresh =
        hasSessionData &&
        (cacheAge < CACHE_TTL_MS || mostRecentEventTime === 0);

      const isSessionAlreadyHydrated = hasSessionData && isCacheFresh;

      if (import.meta.env.DEV) {
        console.log(
          `🧠 [ChatMainCanonicalLegacy] Cache analysis for ${sessionId}:`,
          {
            hasSessionData,
            mostRecentEventTime:
              mostRecentEventTime > 0
                ? new Date(mostRecentEventTime).toISOString()
                : "No timestamps",
            cacheAge:
              mostRecentEventTime > 0
                ? `${Math.round(cacheAge / 1000)}s`
                : "Unknown",
            isCacheFresh,
            isSessionAlreadyHydrated,
            activeHydration: activeHydrationRef.current,
          }
        );
      }

      // ROBUSTNESS: Prevent race conditions
      if (
        activeHydrationRef.current &&
        activeHydrationRef.current !== sessionId
      ) {
        if (import.meta.env.DEV) {
          console.warn(
            `⚠️ [ChatMainCanonicalLegacy] Cancelling hydration for ${activeHydrationRef.current}, switching to ${sessionId}`
          );
        }
      }

      if (isSessionAlreadyHydrated) {
        // Session already hydrated - skip hydrateSession and load events directly
        if (import.meta.env.DEV) {
          console.log(
            `🚀 [ChatMainCanonicalLegacy] Session ${sessionId} already hydrated, skipping re-hydration`
          );
        }

        // PROGRESSIVE LOADING: Show cached data immediately, then load full context
        setLocalIsLoading(false); // Clear loading immediately for better UX

        // PHASE 1: Show cached messages immediately (bottom-up loading)
        const cachedEvents = store.bySession.get(sessionId) || [];
        if (cachedEvents.length > 0) {
          // Show last 20 messages immediately for instant feedback
          const recentEventIds = cachedEvents.slice(-20);
          const recentEvents = recentEventIds
            .map((id) => store.byId.get(id))
            .filter(Boolean);
          const recentMessages = convertEventsToMessages(recentEvents);
          setMessages(recentMessages);
          if (import.meta.env.DEV) {
            console.log(
              `⚡ [ChatMainCanonicalLegacy] Showing ${recentMessages.length} cached messages immediately`
            );
          }
        } else {
          // Show empty state if no cached data
          setMessages([]);
        }

        // Use requestAnimationFrame to defer expensive operations to next frame
        requestAnimationFrame(() => {
          loadEvents();
        });
      } else {
        // Session not hydrated or cache is stale - proceed with hydration
        const reason = !hasSessionData ? "no cached data" : "cache expired";
        if (import.meta.env.DEV) {
          console.log(
            `💧 [ChatMainCanonicalLegacy] Hydrating session ${sessionId} (${reason})`
          );
        }

        // ROBUSTNESS: Track active hydration to prevent races
        activeHydrationRef.current = sessionId;

        hydrateSession(sessionId)
          .then(() => {
            // ROBUSTNESS: Only proceed if this is still the active session
            if (activeHydrationRef.current === sessionId) {
              // Call loadEvents directly instead of relying on dependency
              const state = useEventStore.getState();
              let eventIds = state.bySession.get(sessionId) || [];
              if (eventIds.length === 0 && state.bySession.has("unknown")) {
                eventIds = state.bySession.get("unknown") || [];
              }
              const events = eventIds
                .map((id) => state.byId.get(id))
                .filter((event): event is NonNullable<typeof event> =>
                  Boolean(event)
                );

              // Log events received during hydration
              console.log(
                `💧 [Hydration] Session ${sessionId} - Hydrated ${events.length} events:`,
                events
              );
              events.forEach((event, index) => {
                console.log(
                  `💧 [HydratedEvent ${index + 1}] ID: ${event.id}, Kind: ${event.kind}, Role: ${event.role}, Created: ${event.createdAt}`,
                  event
                );
              });

              const convertedMessages = convertEventsToMessages(events);
              setMessages(convertedMessages);
              if (import.meta.env.DEV) {
                console.log(
                  `✅ [ChatMainCanonicalLegacy] Successfully hydrated ${sessionId} with ${events.length} events`
                );
              }
            } else {
              if (import.meta.env.DEV) {
                console.log(
                  `🚫 [ChatMainCanonicalLegacy] Discarding hydration result for ${sessionId} (user switched to ${activeHydrationRef.current})`
                );
              }
            }
          })
          .catch((err) => {
            console.error(
              `❌ [ChatMainCanonicalLegacy] Hydration failed for ${sessionId}:`,
              err
            );

            // ROBUSTNESS: Only proceed if this is still the active session
            if (activeHydrationRef.current === sessionId) {
              // Try to load events anyway in case there's cached data
              const state = useEventStore.getState();
              let eventIds = state.bySession.get(sessionId) || [];
              if (eventIds.length === 0 && state.bySession.has("unknown")) {
                eventIds = state.bySession.get("unknown") || [];
              }
              const events = eventIds
                .map((id) => state.byId.get(id))
                .filter((event): event is NonNullable<typeof event> =>
                  Boolean(event)
                );

              // Log fallback events
              console.log(
                `🔄 [Fallback] Session ${sessionId} - Loaded ${events.length} cached events:`,
                events
              );
              events.forEach((event, index) => {
                console.log(
                  `🔄 [FallbackEvent ${index + 1}] ID: ${event.id}, Kind: ${event.kind}, Role: ${event.role}, Created: ${event.createdAt}`,
                  event
                );
              });

              const convertedMessages = convertEventsToMessages(events);
              setMessages(convertedMessages);
              if (import.meta.env.DEV) {
                console.log(
                  `🔄 [ChatMainCanonicalLegacy] Fallback: Loaded ${events.length} cached events for ${sessionId}`
                );
              }
            }
          })
          .finally(() => {
            // ROBUSTNESS: Clear active hydration tracking
            if (activeHydrationRef.current === sessionId) {
              activeHydrationRef.current = null;
            }
            setLocalIsLoading(false);
            setIsSessionHydrating(false);
          });
      }
    } else if (sessionId) {
      // Try to load events for temp sessions
      const state = useEventStore.getState();
      let eventIds = state.bySession.get(sessionId) || [];
      if (eventIds.length === 0 && state.bySession.has("unknown")) {
        eventIds = state.bySession.get("unknown") || [];
      }
      const events = eventIds
        .map((id) => state.byId.get(id))
        .filter((event): event is NonNullable<typeof event> => Boolean(event));

      // Log temp session events
      console.log(
        `🆔 [TempSession] Session ${sessionId} - Loaded ${events.length} events:`,
        events
      );
      events.forEach((event, index) => {
        console.log(
          `🆔 [TempEvent ${index + 1}] ID: ${event.id}, Kind: ${event.kind}, Role: ${event.role}, Created: ${event.createdAt}`,
          event
        );
      });

      const convertedMessages = convertEventsToMessages(events);
      setMessages(convertedMessages);
    }
  }, [sessionId, loadEvents]); // Added loadEvents dependency

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = useEventStore.subscribe((state, prevState) => {
      // Log store changes for debugging
      const currentEventCount = state.byId.size;
      const prevEventCount = prevState?.byId.size || 0;

      if (currentEventCount > prevEventCount) {
        console.log(
          `🔄 [EventStore] Store updated - Events: ${prevEventCount} → ${currentEventCount} (+${currentEventCount - prevEventCount})`
        );

        // Find new events by comparing current and previous state
        const currentEventIds = new Set(state.byId.keys());
        const prevEventIds = new Set(prevState?.byId.keys() || []);

        const newEventIds = Array.from(currentEventIds).filter(
          (id) => !prevEventIds.has(id)
        );
        if (newEventIds.length > 0) {
          console.log(`🆕 [EventStore] New events detected:`, newEventIds);
          newEventIds.forEach((eventId) => {
            const event = state.byId.get(eventId);
            if (event) {
              console.log(
                `✨ [NewEvent] ID: ${event.id}, Kind: ${event.kind}, Role: ${event.role}, Session: ${event.sessionId || "unknown"}`,
                event
              );
            }
          });
        }
      }

      // Call the original loadEvents function
      loadEvents();
    });
    return unsubscribe;
  }, [loadEvents]);

  // Handle modal submit - create new chat with message and images
  const handleModalSubmit = useCallback(async (message: string, images: string[]) => {
    if (!sessionId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || "unknown";
      
      await sendChatMessage({
        sessionId,
        message,
        endpoint: "web",
        userId: uid,
        agentConfigName: "general",
        acsClient: acsClient!,
        images: images.length > 0 ? images : [], // Ensure it's never null
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [sessionId, acsClient]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  // Handle SSE events and update canonical store - REMOVED: Now handled by ChatEventOrchestrator
  // This entire ~350 line useEffect block has been moved to ChatEventOrchestrator
  // The orchestrator handles all SSE event batching, transformation, and store writes globally

  // Track message updates
  useEffect(() => {
    // Monitor when messages change
  }, [messages]);

  // Effective busy state: parent-provided sessionIsActive takes precedence

  // ✅ ROBUST: Force complete stale streaming messages
  useEffect(() => {
    const streamingMessages = messages.filter((msg) => msg.isStreaming);

    if (streamingMessages.length > 0) {
      const now = Date.now();
      const staleMessages = streamingMessages.filter((msg) => {
        const messageAge = now - msg.createdAt;
        return messageAge > 30000; // 30 seconds
      });

      if (staleMessages.length > 0) {
        // Force complete stale streaming messages
        staleMessages.forEach((msg) => {
          const state = useEventStore.getState();
          const sessionEvents = state.bySession.get(sessionId) || [];

          sessionEvents.forEach((eventId) => {
            const event = state.byId.get(eventId);
            if (
              event &&
              event.kind === "message" &&
              event.id === msg.id &&
              event.partial
            ) {
              // Force completing stale message
              const updatedEvent = {
                ...event,
                partial: false,
                updatedAt: new Date().toISOString(),
              };
              useEventStore.getState().addEvent(updatedEvent);
            }
          });
        });
      }
    }
  }, [messages, sessionId]);

  // ✅ ROBUST: Periodic check to ensure streaming states don't get stuck
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useEventStore.getState();
      const sessionEvents = state.bySession.get(sessionId) || [];
      const now = Date.now();

      let foundStaleStreaming = false;

      sessionEvents.forEach((eventId) => {
        const event = state.byId.get(eventId);
        if (event && event.kind === "message" && event.partial) {
          const eventAge = now - new Date(event.createdAt).getTime();

          // If streaming for more than 45 seconds, force complete
          if (eventAge > 45000) {
            const updatedEvent = {
              ...event,
              partial: false,
              updatedAt: new Date().toISOString(),
            };
            useEventStore.getState().addEvent(updatedEvent);
            foundStaleStreaming = true;
          }
        }
      });

      // No action needed if no stale streaming states found
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  // ✅ WATCHDOG: Mark session as idle if no streaming messages detected
  useEffect(() => {
    const interval = setInterval(() => {
      const stillTyping = messages.some((m) => m.isStreaming);
      if (!stillTyping && sessionId) {
        useSessionStatusStore.getState().markIdle(sessionId);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [messages, sessionId]);

  // Note: formatMessageDate function moved to @/utils/chat/dateFormatting.ts

  // Note: isSameDay function moved to @/utils/chat/dateFormatting.ts

  // Note: shouldGroupMessages function moved to @/utils/chat/messageGrouping.ts

  // Apply conversation boundaries logic when refined mode is enabled
  const mergedMessages = useMemo(() => {
    if (refinedMode) {
      // Use optimized version with memoization and O(n) complexity
      const visibleMessages = getOptimizedVisibleMessages(messages);
      return visibleMessages;
    }

    return messages;
  }, [messages, refinedMode]);

  // Derive display messages for lazy rendering
  const displayMessages = useMemo(() => {
    if (renderLimit >= mergedMessages.length) return mergedMessages;
    return mergedMessages.slice(-renderLimit);
  }, [mergedMessages, renderLimit]);

  // Auto-scroll functions - now defined after mergedMessages is available
  const handleScroll = useCallback(
    (event: any) => {
      // Throttle with requestAnimationFrame
      if (scrollRafRef.current) return;

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;

        const { scrollTop, scrollHeight, clientHeight } = event.target;

        // More forgiving bottom detection (24px instead of 5px)
        const bottomTolerance = 24;
        const atBottom =
          scrollHeight - clientHeight <= scrollTop + bottomTolerance;

        // More forgiving scroll-up detection (50% instead of 30%)
        const scrollFromBottom = scrollHeight - clientHeight - scrollTop;
        const scrollUpThreshold = clientHeight * 0.5;
        const scrolledUpSignificantly = scrollFromBottom > scrollUpThreshold;

        // Input visibility logic
        const scrollDelta = scrollTop - lastScrollTop;
        const isScrollingUp = scrollDelta < 0;
        const isScrollingDown = scrollDelta > 0;

        if (Math.abs(scrollDelta) > 10) {
          // Only react to significant scroll
          if (isScrollingUp && !atBottom) {
            setShowTextInputArea(false);
          } else if (isScrollingDown || atBottom) {
            setShowTextInputArea(true);
          }
        }

        setLastScrollTop(scrollTop);

        console.log(
          `📜 [Scroll] Session: ${sessionId}, atBottom: ${atBottom}, scrollTop: ${scrollTop}`
        );

        setIsAtBottom(atBottom);
        setHasScrolledUp(scrolledUpSignificantly);

        // Less aggressive lazy loading (64px instead of 150px)
        if (
          scrollTop < 64 &&
          renderLimit < mergedMessages.length &&
          !loadingOlderRef.current
        ) {
          loadingOlderRef.current = true;
          setRenderLimit((prev) =>
            Math.min(prev + RENDER_BATCH_INCREMENT, mergedMessages.length)
          );
          setTimeout(() => {
            loadingOlderRef.current = false;
          }, 300); // Longer debounce
        }
      });
    },
    [sessionId, renderLimit, mergedMessages.length, lastScrollTop]
  );

  // Recompute groups based on displayMessages for lazy rendering
  const mergedMessageGroups = useMemo(() => {
    if (!displayMessages.length) {
      return [];
    }

    const groups: { date: Date; messages: ChatMessageType[] }[] = [];
    let currentDate: Date | null = null;
    let currentGroup: ChatMessageType[] = [];

    displayMessages.forEach((message) => {
      const messageTime = message.createdAt || Date.now();
      const messageDate = new Date(messageTime);
      messageDate.setHours(0, 0, 0, 0);

      if (!currentDate || !isSameDay(currentDate, messageDate)) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate!, messages: [...currentGroup] });
          currentGroup = [];
        }
        currentDate = messageDate;
      }

      currentGroup.push(message);
    });

    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [displayMessages, refinedMode]);

  // Handle message submission
  const handleSubmit = async (message: string) => {
    if (import.meta.env.DEV) {
      console.log("💥💥💥💥💥💥💥💥💥💥 Submitting message:", message);
    }
    if (!message.trim()) return;

    // If a custom onSubmit handler is provided, use it instead of the default logic
    if (customOnSubmit) {
      try {
        setLocalIsLoading(true);
        await customOnSubmit(message, images);
        setImages([]);
      } catch (error) {
        console.error("ChatMain custom handleSubmit error:", error);
      } finally {
        setLocalIsLoading(false);
      }
      return;
    }

    // Default submission logic for regular chat interface
    if (!sessionId || !auth.user?.id) {
      toast.error("Please sign in to send messages");
      return;
    }

    try {
      setLocalIsLoading(true);

      // Tools will be registered automatically via sendChatMessage tools parameter

      // Get effective overrides from selection context (agent config + model)
      const overrides = getAcsOverrides(acsOverrides);

      // Collect additional arguments from stores and context
      const byokStore = useBYOKStore.getState();
      const templateVariables = await createACSTemplateVariables();
      const useStoredKeys = byokStore.useStoredKeysPreference;

      if (import.meta.env.DEV) {
        console.log(
          "🚀 [ChatMainCanonicalLegacy] Sending message with resolved overrides:",
          {
            agentConfigName: overrides.agentConfigName,
            hasModelOverride: !!overrides.overrides?.model_id,
            modelId: overrides.overrides?.model_id,
            sessionId: sessionId.slice(0, 8) + "...",
            useStoredKeys,
            hasTemplateVariables: !!templateVariables,
          }
        );
      }

      // Use submitted images if provided, otherwise use component state images

      // Use shared helper for canonical message sending with extended parameters
      await sendChatMessage({
        sessionId,
        message,
        userId: auth.user.id,
        agentConfigName: overrides.agentConfigName,
        acsClient,
        acsOverrides: overrides.overrides,
        // Pass the new optional arguments
        templateVariables,
        useStoredKeys,
        // Provide empty defaults for other new parameters (can be enhanced later)
        modelApiKeys: {},
        overrides: {}, // This is for the new overrides parameter, not acsOverrides
        explicitModelId: undefined,
        roleModelOverrides: {},
        isBackgroundSession: false,
        autoMode: false, // Default to false unless explicitly set by user
        modelAutoMode: false, // Default to false unless explicitly set by user
        // Tools will default to core tools automatically: ['apply_patch', 'cat', 'tree', 'search_files', 'str_replace_editor', 'read_files', 'search_notes']
        images: [...images],
      });

      // Clear images after successful send
    } catch (error) {
      // Error handling is done in the helper
      console.error("ChatMain handleSubmit error:", error);
    } finally {
      setLocalIsLoading(false);
      setImages([]);
    }
  };

  // Handle keyboard shortcuts (optional - ChatInput handles Enter key internally)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ChatInput component now handles Enter key submission internally
    // This is just for any additional keyboard shortcuts if needed
  };

  // Handle message forking
  const handleFork = async (messageId: string) => {
    toast.info(
      `[ChatMain][handleFork][msg: ${messageId}] Forking not yet implemented in canonical mode`
    );
  };

  // Generate context-specific CSS classes
  const getContextClasses = () => {
    const baseClasses =
      "flex-1 flex flex-col overflow-hidden relative bg-black";

    if (renderContext === "mission-control") {
      console.log(
        "🎯 [ChatMainCanonicalLegacy] Applying Mission Control styles",
        { renderContext, sessionId }
      );
      return `${baseClasses} h-full max-h-full mission-control-chat`;
    }

    console.log("🎯 [ChatMainCanonicalLegacy] Applying default styles", {
      renderContext,
      sessionId,
    });
    return `${baseClasses} max-h-full`;
  };

  // Empty state - Apple style
  if (!sessionId) {
    return <ChatEmptyState onStartChat={() => setIsNewChatModalOpen(true)} />;
  }

  return (
    <div
      ref={mainContainerRef}
      className={getContextClasses()}
      id="chat-main-canonical-legacy"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-screen drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="bg-white/10 rounded-2xl p-8 border-2 border-dashed border-blue-400">
              <Image className="h-20 w-20 text-blue-400 mx-auto mb-4" />
              <p className="text-blue-400 font-medium text-xl mb-2">
                Drop images here
              </p>
              <p className="text-blue-300/80 text-sm">
                Supports JPG, PNG, GIF up to{" "}
                {Math.round(
                  parseInt(import.meta.env.VITE_MAX_PROMPT_SIZE || "15728640") /
                    1024 /
                    1024
                )}
                MB per prompt
              </p>
            </div>
          </div>
        </div>
      )}
      {!hideHeader && (
        <div className="flex-shrink-0">
          <ChatHeader sessionId={sessionId} />
        </div>
      )}

      {/* Tool Approval Panel - Shows pending tool approvals for user interaction */}
      <div className="flex-shrink-0">
        <ApprovalPanel
          sessionId={sessionId}
          className={cn(
            "py-4 border-b border-white/10",
            renderContext === "mission-control"
              ? "px-4" // Consistent with mission control spacing
              : "px-6 md:px-12" // Default generous spacing
          )}
        />
      </div>

      <PendingToolsDebugOverlay />

      {/* Message Display Area - Apple style with generous spacing */}
      <div className="relative flex-1 min-h-0">
        {/* Keep ScrollArea mounted; overlay will sit on top */}
        <ScrollArea
          className={cn(
            "overflow-hidden relative z-10 min-h-0",
            renderContext === "mission-control" && "mission-control-scroll-area"
          )}
          viewportRef={(node) => {
            if (node) {
              node.addEventListener("scroll", handleScroll);
              return () => node.removeEventListener("scroll", handleScroll);
            }
          }}
        >
          <div
            className={cn(
              "w-full max-w-full overflow-x-hidden transition-all duration-300",
              renderContext === "mission-control"
                ? "px-4 pt-4" // Mission control spacing
                : "px-6 md:px-12 pt-8", // Default spacing
              showTextInputArea
                ? "pb-[calc(8rem+env(safe-area-inset-bottom))]" // Space for input when visible
                : "pb-4" // Minimal padding when input is hidden
            )}
          >
            <ChatMessageList
              data-testid="chat-message-list"
              messages={displayMessages}
              mergedMessageGroups={mergedMessageGroups}
              refinedMode={refinedMode}
              handleFork={handleFork}
              formatMessageDate={formatMessageDate}
              shouldGroupMessages={shouldGroupMessages}
              isOptimizedFinalAssistantMessage={
                isOptimizedFinalAssistantMessage
              }
              getOptimizedFileOperationsForResponse={
                getOptimizedFileOperationsForResponse
              }
              shouldUseUnifiedRendering={shouldUseUnifiedRendering}
              renderUnifiedTimelineEvent={(event, index, events) =>
                renderUnifiedTimelineEvent(
                  event,
                  index,
                  events,
                  false,
                  refinedMode
                )
              }
            />

            {/* Typing indicator - shows during loading or waiting for AI */}
            <ChatTypingIndicator
              isVisible={effectiveActive}
              agentName="AI Assistant"
              showThinkingState={
                (messages.length > 0 &&
                  messages[messages.length - 1].thinking) ||
                false
              }
            />

            {/* Chat Scroll Anchor - invisible element at bottom for auto-scroll detection */}
            <ChatScrollAnchor
              isAtBottom={isAtBottom}
              onVisibilityChange={handleAnchorVisibilityChange}
              shouldAutoScroll={shouldAutoScroll}
              scrollToBottom={scrollToBottom}
            />
          </div>
        </ScrollArea>
        {/* Chat Loading Overlay - covers message list and input area */}
        <ChatLoadingOverlay
          context={renderContext}
          sessionId={sessionId}
          visible={Boolean(sessionId && isSessionHydrating)}
        />
      </div>

      {/* Scroll Button - shows "New messages" or "Back to latest" based on context */}
      <NewMessagesIndicator
        show={scrollButtonConfig.show}
        messageCount={scrollButtonConfig.messageCount}
        variant={scrollButtonConfig.variant}
        onClick={scrollToBottom}
        className={cn(
          "transition-all duration-300",
          images.length > 0 ? "!bottom-40" : "!bottom-24"
        )}
      />

      {/* Floating Images Display - Above Chat Input */}
      {images.length > 0 && (
        <div className="flex-shrink-0 sticky bottom-20 z-30 px-6 md:px-12 mb-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg bg-white/5 border border-white/20"
                  />
                  <button
                    onClick={() => removeImage(image)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="text-white text-xs leading-none">×</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Input - Responsive */}
      {!hideInput && (
        <div
          ref={chatInputRef}
          className={cn(
            "flex-shrink-0 sticky bottom-0 z-10 bg-black/80 backdrop-blur-sm border-t border-white/10",
            renderContext === "mission-control" && "mission-control-input-area"
          )}
        >
          {renderContext === "mission-control" &&
            typeof sessionIsActive === "boolean" && (
              <div className="absolute right-6 -top-10">
                <button
                  onClick={() => onToggleSessionActive?.(!effectiveActive)}
                  className={cn(
                    "px-2 py-1 text-xs rounded border",
                    effectiveActive
                      ? "bg-white/10 text-white/80 border-white/20"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                  )}
                >
                  {effectiveActive ? "Pause" : "Resume"}
                </button>
              </div>
            )}
          <LexicalChatInput
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            isTyping={effectiveActive}
            isLoading={effectiveActive}
            disabled={effectiveDisabled}
            placeholder="Message"
            codePathOverride={agentCwd}
            onImageUpload={handleImageUpload}
            images={images}
            onRemoveImage={removeImage}
          />
        </div>
      )}

      {/* Agent Profile Drawer */}
      <AnimatePresence>
        {isProfileOpen && (
          <AgentProfile
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            agentId={"canonical-agent"}
          />
        )}
      </AnimatePresence>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onCreateChat={handleModalSubmit}
      />

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebugPanel && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed top-0 right-0 h-full w-[600px] bg-gray-900 border-l border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Debug Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Debug Panel</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDebugPanel(false)}
                className="text-white/60 hover:text-white"
              >
                <span className="h-4 w-4">×</span>
              </Button>
            </div>

            {/* Debug Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Supabase Data Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white/80">
                    Supabase Data
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async (): Promise<void> => {
                      setDebugData((prev) => ({ ...prev, loading: true }));

                      try {
                        const { data, error } = await supabase
                          .from("chat_messages")
                          .select("*")
                          .eq("session_id", sessionId)
                          .order("timestamp", { ascending: true })
                          .limit(10);

                        if (!error && data) {
                          setDebugData((prev) => ({
                            ...prev,
                            supabaseData: data,
                            loading: false,
                          }));
                        } else {
                          setDebugData((prev) => ({ ...prev, loading: false }));
                          toast.error("Failed to fetch Supabase data");
                        }
                      } catch (err) {
                        setDebugData((prev) => ({ ...prev, loading: false }));
                        toast.error("Error fetching data");
                      }
                    }}
                    disabled={debugData.loading}
                    className="text-xs"
                  >
                    {debugData.loading ? "Loading..." : "Fetch DB"}
                  </Button>
                </div>

                <div className="bg-black/50 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                  {debugData.supabaseData.length === 0 ? (
                    <p className="text-white/40 text-xs">
                      Click "Fetch DB" to load data
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {debugData.supabaseData.map((row, idx) => (
                        <div
                          key={idx}
                          className="border border-white/10 rounded p-2 space-y-1"
                        >
                          <div className="text-xs text-white/60">
                            Message {idx + 1}
                          </div>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="text-white/40">ID:</span>{" "}
                              <span className="text-white/80 font-mono">
                                {row.id.substring(0, 8)}...
                              </span>
                            </div>
                            <div>
                              <span className="text-white/40">Role:</span>{" "}
                              <span className="text-white/80">{row.role}</span>
                            </div>
                            <div>
                              <span className="text-white/40">Content:</span>
                            </div>
                            <pre className="text-[10px] bg-black/30 p-2 rounded overflow-x-auto text-white/70">
                              {JSON.stringify(row.content, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Event Store Data Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white/80">
                    Event Store Data
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const state = useEventStore.getState();
                      let eventIds = state.bySession.get(sessionId) || [];
                      if (
                        eventIds.length === 0 &&
                        state.bySession.has("unknown")
                      ) {
                        eventIds = state.bySession.get("unknown") || [];
                      }

                      const events = eventIds
                        .map((id) => state.byId.get(id))
                        .filter(Boolean)
                        .slice(0, 10); // Just first 10 for display

                      setDebugData((prev) => ({ ...prev, storeData: events }));
                    }}
                    className="text-xs"
                  >
                    Load Store
                  </Button>
                </div>

                <div className="bg-black/50 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                  {debugData.storeData.length === 0 ? (
                    <p className="text-white/40 text-xs">
                      Click "Load Store" to load data
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {debugData.storeData.map((event: any, idx) => (
                        <div
                          key={idx}
                          className="border border-white/10 rounded p-2 space-y-1"
                        >
                          <div className="text-xs text-white/60">
                            Event {idx + 1}
                          </div>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="text-white/40">ID:</span>{" "}
                              <span className="text-white/80 font-mono">
                                {event.id.substring(0, 8)}...
                              </span>
                            </div>
                            <div>
                              <span className="text-white/40">Kind:</span>{" "}
                              <span className="text-white/80">
                                {event.kind}
                              </span>
                            </div>
                            <div>
                              <span className="text-white/40">Role:</span>{" "}
                              <span className="text-white/80">
                                {event.role}
                              </span>
                            </div>
                            <div>
                              <span className="text-white/40">Content:</span>
                            </div>
                            <pre className="text-[10px] bg-black/30 p-2 rounded overflow-x-auto text-white/70">
                              {JSON.stringify(event.content, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async (): Promise<void> => {
                    useEventStore.getState().clearAll();
                    clearDuplicateCache();

                    if (sessionId && !sessionId.startsWith("temp-")) {
                      setLocalIsLoading(true);
                      try {
                        await hydrateSession(sessionId);
                        loadEvents();
                        toast.success("Store cleared and re-hydrated");

                        // Reload debug data
                        const newState = useEventStore.getState();
                        let eventIds = newState.bySession.get(sessionId) || [];
                        if (
                          eventIds.length === 0 &&
                          newState.bySession.has("unknown")
                        ) {
                          eventIds = newState.bySession.get("unknown") || [];
                        }
                        const events = eventIds
                          .map((id) => newState.byId.get(id))
                          .filter(Boolean)
                          .slice(0, 10);
                        setDebugData((prev) => ({
                          ...prev,
                          storeData: events,
                        }));
                      } catch (err) {
                        toast.error("Failed to re-hydrate");
                      } finally {
                        setLocalIsLoading(false);
                      }
                    }
                  }}
                  className="w-full"
                  disabled={localIsLoading}
                >
                  Clear Store & Re-hydrate
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders when parent updates
// but the actual props that matter to this component haven't changed
const ChatMainCanonicalLegacy = React.memo(
  ChatMainCanonicalLegacyComponent,
  (prevProps, nextProps) => {
    // Only re-render if the props that actually matter have changed
    return (
      prevProps.sessionId === nextProps.sessionId &&
      prevProps.sidebarCollapsed === nextProps.sidebarCollapsed &&
      prevProps.renderContext === nextProps.renderContext &&
      prevProps.sessionIsActive === nextProps.sessionIsActive
    );
  }
);

export default ChatMainCanonicalLegacy;
