// RIP ChatMainCanonicalLegacy

/**
 * ChatMainCanonicalLegacy - ChatMainLegacy style but using canonical event store
 *
 * This component replicates the exact styling and behavior of ChatMainLegacy
 * but fetches data from the canonical event store instead of the ACS context.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Button } from "@/components/ui/Button";
import ChatScrollAnchor from "./ChatScrollAnchor";
import NewMessagesIndicator from "./NewMessagesIndicator";
import SessionDetailDebug from "./SessionDetailDebug";
// import { Switch } from "@/components/ui/switch";
// import { Label } from "@/components/ui/label";
import { cn } from "cn-utility";
import { toast } from "sonner";
import { Square } from "lucide-react";
// import { Virtuoso } from 'react-virtuoso';

// Import Mission Control specific styles
import "./ChatMissionControl.css";

// Debug imports
import { usePendingToolsStore } from "@/stores/pendingToolsStore";

// Pending Tools Debug Overlay Component
const PendingToolsDebugOverlay: React.FC = () => {
  const { jobs } = usePendingToolsStore();
  const allJobs = Object.values(jobs);
  const [showFullJSON, setShowFullJSON] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  if (allJobs.length === 0) {
    return null; // Don't show overlay if no jobs
  }

  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  return (
    <div className="fixed top-4 right-4 bg-black/90 border border-white/20 rounded-lg p-4 max-w-lg max-h-[80vh] overflow-y-auto z-[9999]">
      <div className="text-white font-semibold mb-3 flex items-center justify-between">
        <span>🔧 Pending Tools Queue ({allJobs.length})</span>
        <button
          onClick={() => setShowFullJSON(!showFullJSON)}
          className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
        >
          {showFullJSON ? "Hide JSON" : "Show JSON"}
        </button>
      </div>

      <div className="space-y-3">
        {allJobs.map((job) => {
          const isExpanded = expandedJobs.has(job.id);
          return (
            <div key={job.id} className="bg-white/5 rounded p-3 text-sm">
              <div className="text-white font-medium mb-2 flex items-center justify-between">
                <span>{job.sse?.ji?.tool_name || "Unknown Tool"}</span>
                {showFullJSON && (
                  <button
                    onClick={() => toggleJobExpansion(job.id)}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                  >
                    {isExpanded ? "▼" : "▶"}
                  </button>
                )}
              </div>

              <div className="space-y-1 text-white/70">
                <div>
                  <span className="text-white/50">ID:</span> {job.id}
                </div>
                <div>
                  <span className="text-white/50">Status:</span>
                  <span
                    className={`ml-1 px-2 py-0.5 rounded text-xs ${
                      job.status === "waiting"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : job.status === "approved"
                          ? "bg-green-500/20 text-green-300"
                          : job.status === "rejected"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-gray-500/20 text-gray-300"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div>
                  <span className="text-white/50">Session:</span>{" "}
                  {job.sse?.session_id || "None"}
                </div>
                <div>
                  <span className="text-white/50">Is Test:</span>{" "}
                  {job.id.startsWith("test_") ? "Yes" : "No"}
                </div>
                <div>
                  <span className="text-white/50">Created:</span>{" "}
                  {new Date(job.createdAt).toLocaleTimeString()}
                </div>
                {!showFullJSON && job.sse?.ji && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-white/50 text-xs mb-1">
                      Job Instruction:
                    </div>
                    <div className="text-white/60 text-xs">
                      <div>Job ID: {job.sse.ji.job_id}</div>
                      <div>Tool Use ID: {job.sse.ji.tool_use_id || "None"}</div>
                      <div>Tool: {job.sse.ji.tool_name}</div>
                      {job.sse.ji.args && (
                        <div>
                          Args:{" "}
                          {JSON.stringify(job.sse.ji.args).substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showFullJSON && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-white/50 text-xs mb-1 flex items-center justify-between">
                      <span>Full Job Object:</span>
                    </div>
                    {isExpanded ? (
                      <pre className="text-white/60 text-xs bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(job, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-white/60 text-xs">
                        Click ▶ to expand full JSON
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
        This overlay shows all jobs in the pending tools store for debugging
        approval workflow.
      </div>
    </div>
  );
};

// ACS imports
import { useACSClient } from "@/hooks/acs-chat/useACSClient";
import { useAuth } from "@/auth/AuthContext";
import { useBYOKStore } from "@/stores/byokStore";
import { createACSTemplateVariables } from "@/utils/templateVariables";
import { sendChatMessage } from "@/utils/sendChatMessage";

// Types
import type {
  ChatMessage as ChatMessageType,
  ChatSession as ChatSessionType,
  ChatRole,
} from "@/types/chatTypes";

// Components
import AgentProfile from "./AgentProfile";
import ChatHeader from "./header/ChatHeader";
import NewChatModal from "./NewChatModal";
import QuantumWaveIndicator from "./QuantumWaveIndicator";
import { shouldUseUnifiedRendering } from "./UnrefinedModeTimelineRenderer";
import {
  renderUnifiedTimelineEvent,
  CombinedThinkBlockDisplay,
  ThinkBlockDisplay,
  AssistantMessageWithFileOps,
} from "./UnifiedTimelineRenderer";
import { LexicalChatInput } from "./LexicalChatInput";
import { MobileChatInput } from "./MobileChatInput";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import ChatEmptyState from "./ChatEmptyState";
import ChatTypingIndicator from "./ChatTypingIndicator";
import ChatMessageList from "./ChatMessageList";

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
import { useEventStore } from "@/stores/eventStores";
import { useSessionStatusStore } from "@/stores/sessionStatusStore";
import { clearDuplicateCache } from "@/stores/eventReducer";
import { hydrateSession } from "@/stores/eventBridges/historyBridge";
import { useChatUI } from "@/context/ChatUIContext";
import { useSelections, getAcsOverrides } from "@/context/SelectionContext";
import { supabase } from "@/auth/SupabaseClient";

// Approval imports
import { ApprovalPanel } from "@/components/approval/ApprovalPanel";

import { httpApi } from "@/api/httpApi";
import { cancelConversation } from "@/utils/cancelConversation";

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
  sessionId?: string; // Optional prop - falls back to URL params if not provided
  onSubmit?: (message: string) => Promise<void>; // Optional custom submit handler
  hideHeader?: boolean; // Optional prop to hide the ChatHeader component
  hideInput?: boolean; // Optional prop to hide the input area
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
  onSubmit: customOnSubmit,
  hideHeader = false,
  hideInput = false,
}) => {
  // Performance monitoring
  usePerformanceMonitor();

  // Debug overlay - track container size via ResizeObserver
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

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
  // Auth and ACS
  const auth = useAuth();
  const {
    acsClient,
    isInitialized: acsInitialized,
    initialize: initializeACS,
  } = useACSClient();

  // Chat UI context - must be declared early
  const chatUI = useChatUI();

  // Navigation hooks for URL cleanup
  const navigate = useNavigate();
  const location = useLocation();

  // SSE Streaming - REMOVED: Now handled by ChatEventOrchestrator
  // const {
  //   isConnected: sseConnected,
  //   connectStreaming,
  //   disconnectStreaming,
  //   onSSEEvent
  // } = useACSChatStreaming(acsClient);

  // State - inputMessage moved to ChatInput component for performance
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [refinedMode, setRefinedMode] = useState(false);

  // State for stream debug overlay
  const [streamDebugOverlayOpen, setStreamDebugOverlayOpen] = useState(false);

  // State for hydration debug overlay
  const [hydrationDebugOverlayOpen, setHydrationDebugOverlayOpen] =
    useState(false);

  // State for tool debug panel
  const [toolDebugOpen, setToolDebugOpen] = useState(false);

  // State for event tap debug overlay
  const [eventTapDebugOpen, setEventTapDebugOpen] = useState(false);

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

  // Local loading state for this component's operations
  const [localIsLoading, setLocalIsLoading] = useState(false);

  // Get loading state from chat context (for startConversation operations)
  const contextIsLoading = false; // chatUI doesn't have isLoading property

  // Combined loading state - true if either local or context is loading
  const isLoading = localIsLoading || contextIsLoading;

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

  // Lazy render state
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_BATCH);
  const loadingOlderRef = useRef(false);

  // Params and context - use prop sessionId if provided, otherwise fall back to URL params
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const sessionId = propSessionId ?? urlSessionId;
  const [searchParams] = useSearchParams();
  const selections = useSelections();
  const acsOverrides = selections; // Renaming variable for clarity

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
        console.log(
          "🧹 [ChatMainCanonicalLegacy] Cleaning up bootstrap query parameters"
        );
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
    const loadId = `load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!sessionId) {
      console.log(
        `⚠️ [ChatMain] [${loadId}] No sessionId provided, skipping event load`
      );
      return;
    }

    console.log(
      `📦 [ChatMain] [${loadId}] Loading events for session: ${sessionId}`
    );

    const state = useEventStore.getState();

    // Try session ID first, then 'unknown'
    let eventIds = state.bySession.get(sessionId) || [];
    console.log(
      `🔍 [ChatMain] [${loadId}] Found ${eventIds.length} events for session ${sessionId}`
    );

    if (eventIds.length === 0 && state.bySession.has("unknown")) {
      eventIds = state.bySession.get("unknown") || [];
      console.log(
        `🔍 [ChatMain] [${loadId}] Fallback to 'unknown' session: ${eventIds.length} events`
      );
    }

    const events = eventIds.map((id) => state.byId.get(id)).filter(Boolean);
    console.log(
      `🔍 [ChatMain] [${loadId}] Retrieved ${events.length} valid events from store`
    );

    // Convert to messages
    console.log(`🔄 [ChatMain] [${loadId}] Converting events to messages...`);
    const convertedMessages = convertEventsToMessages(events);
    console.log(
      `✅ [ChatMain] [${loadId}] Converted to ${convertedMessages.length} messages`
    );

    setMessages(convertedMessages);
    console.log(`✅ [ChatMain] [${loadId}] Messages set in component state`);
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
    const result = isAtBottom && !anchorVisible;
    console.log(
      `🔄 [AutoScroll] Session: ${sessionId}, shouldAutoScroll: ${result}, isAtBottom: ${isAtBottom}, anchorVisible: ${anchorVisible}, messageCount: ${messages.length}`
    );
    return result;
  }, [isAtBottom, anchorVisible, sessionId, messages.length]);

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
      `📜 [ChatMainCanonicalLegacy] Loading older messages before ${oldestEvent.timestamp}`
    );

    try {
      // This would typically call an API to get older messages
      // For now, we'll just log that the function was called
      // In a real implementation, you'd call something like:
      // const olderEvents = await getEventsBeforeTimestamp(sessionId, oldestEvent.timestamp, 20);
      // Then prepend them to the store

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
      initializeACS().catch((error: any) => {
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
      console.warn(
        "[ChatMain] initialMessage param detected but ignored (handled upstream)"
      );
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []); // run once

  // Auto-hydrate on session change
  useEffect(() => {
    if (sessionId && !sessionId.startsWith("temp-")) {
      setLocalIsLoading(true);

      const store = useEventStore.getState();

      // PERFORMANCE: No session clearing - keep all sessions cached for faster switching
      // Previous sessions remain in store for instant switching back
      console.log(
        `📦 [ChatMainCanonicalLegacy] Keeping previous sessions cached. Store has ${store.bySession.size} sessions.`
      );

      // Update the previous session ID
      previousSessionIdRef.current = sessionId;

      clearDuplicateCache();

      // ROBUSTNESS: Memory management - limit cache size
      const MAX_CACHED_SESSIONS = 20;
      const currentSessionCount = store.bySession.size;
      if (currentSessionCount > MAX_CACHED_SESSIONS) {
        console.log(
          `🧹 [ChatMainCanonicalLegacy] Cache size (${currentSessionCount}) exceeds limit (${MAX_CACHED_SESSIONS}), cleaning up old sessions`
        );

        // Get all sessions with their last access time (approximate)
        const sessionEntries = Array.from(store.bySession.entries());
        const sessionsWithAge = sessionEntries.map(([sessionId, eventIds]) => {
          let lastEventTime = 0;
          // Check last few events for most recent timestamp
          const recentEvents = eventIds.slice(-3);
          for (const eventId of recentEvents) {
            const event = store.byId.get(eventId);
            if (event?.timestamp) {
              const eventTime = new Date(event.timestamp).getTime();
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
            console.log(
              `🗑️ [ChatMainCanonicalLegacy] Removed old session ${oldSessionId} (${eventCount} events)`
            );
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
            const eventTime = new Date(event.timestamp).getTime();
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

      // ROBUSTNESS: Prevent race conditions
      if (
        activeHydrationRef.current &&
        activeHydrationRef.current !== sessionId
      ) {
        console.warn(
          `⚠️ [ChatMainCanonicalLegacy] Cancelling hydration for ${activeHydrationRef.current}, switching to ${sessionId}`
        );
      }

      if (isSessionAlreadyHydrated) {
        // Session already hydrated - skip hydrateSession and load events directly
        console.log(
          `🚀 [ChatMainCanonicalLegacy] Session ${sessionId} already hydrated, skipping re-hydration`
        );

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
          console.log(
            `⚡ [ChatMainCanonicalLegacy] Showing ${recentMessages.length} cached messages immediately`
          );
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
        console.log(
          `💧 [ChatMainCanonicalLegacy] Hydrating session ${sessionId} (${reason})`
        );

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
                .filter(Boolean);
              const convertedMessages = convertEventsToMessages(events);
              setMessages(convertedMessages);
              console.log(
                `✅ [ChatMainCanonicalLegacy] Successfully hydrated ${sessionId} with ${events.length} events`
              );
            } else {
              console.log(
                `🚫 [ChatMainCanonicalLegacy] Discarding hydration result for ${sessionId} (user switched to ${activeHydrationRef.current})`
              );
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
                .filter(Boolean);
              const convertedMessages = convertEventsToMessages(events);
              setMessages(convertedMessages);
              console.log(
                `🔄 [ChatMainCanonicalLegacy] Fallback: Loaded ${events.length} cached events for ${sessionId}`
              );
            }
          })
          .finally(() => {
            // ROBUSTNESS: Clear active hydration tracking
            if (activeHydrationRef.current === sessionId) {
              activeHydrationRef.current = null;
            }
            setLocalIsLoading(false);
          });
      }
    } else if (sessionId) {
      // Try to load events for temp sessions
      const state = useEventStore.getState();
      let eventIds = state.bySession.get(sessionId) || [];
      if (eventIds.length === 0 && state.bySession.has("unknown")) {
        eventIds = state.bySession.get("unknown") || [];
      }
      const events = eventIds.map((id) => state.byId.get(id)).filter(Boolean);
      const convertedMessages = convertEventsToMessages(events);
      setMessages(convertedMessages);
    }
  }, [sessionId, loadEvents]); // Added loadEvents dependency

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = useEventStore.subscribe(loadEvents);
    return unsubscribe;
  }, [loadEvents]);

  // Handle SSE events and update canonical store - REMOVED: Now handled by ChatEventOrchestrator
  // This entire ~350 line useEffect block has been moved to ChatEventOrchestrator
  // The orchestrator handles all SSE event batching, transformation, and store writes globally

  // Track message updates
  useEffect(() => {
    const updateId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📝 [ChatMain] [${updateId}] Messages updated:`, {
      sessionId: sessionId,
      messageCount: messages.length,
      messageIds: messages.map((m) => m.id),
      roles: messages.map((m) => m.role),
      streamingCount: messages.filter((m) => m.isStreaming).length,
    });
  }, [messages, sessionId]);

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
          const sessionEvents = sessionId
            ? state.bySession.get(sessionId) || []
            : [];

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
      const sessionEvents = sessionId
        ? state.bySession.get(sessionId) || []
        : [];
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
      const { scrollTop, scrollHeight, clientHeight } = event.target;
      const threshold = 5; // 5px tolerance for "at bottom"
      const atBottom = scrollHeight - clientHeight <= scrollTop + threshold;

      // Detect if user has scrolled up significantly (more than 30% from bottom)
      const scrollFromBottom = scrollHeight - clientHeight - scrollTop;
      const scrollUpThreshold = clientHeight * 0.3; // 30% of viewport height
      const scrolledUpSignificantly = scrollFromBottom > scrollUpThreshold;

      console.log(
        `📜 [Scroll] Session: ${sessionId}, atBottom: ${atBottom}, scrollTop: ${scrollTop}, scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight}`
      );

      setIsAtBottom(atBottom);
      setHasScrolledUp(scrolledUpSignificantly);

      // Lazy render: Load more messages when scrolling near top
      if (
        scrollTop < 150 &&
        renderLimit < mergedMessages.length &&
        !loadingOlderRef.current
      ) {
        loadingOlderRef.current = true;
        setRenderLimit((prev) =>
          Math.min(prev + RENDER_BATCH_INCREMENT, mergedMessages.length)
        );
        setTimeout(() => {
          loadingOlderRef.current = false;
        }, 200); // debounce guard
      }
    },
    [sessionId, renderLimit, mergedMessages.length]
  );

  // "AI is typing" if the session is currently marked as awaiting
  const isWaitingForAI = useSessionStatusStore((s) =>
    sessionId ? s.getStatus(sessionId) === "awaiting" : false
  );

  // Handle stop generating
  const handleStopGenerating = useCallback(async () => {
    if (!sessionId) return;
    try {
      await cancelConversation(sessionId);
    } catch (error: any) {
      console.error("Failed to cancel conversation", error);
    }
  }, [sessionId]);

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
    const submitId = `submit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚀 [ChatMain] [${submitId}] Message submission started:`, {
      messageLength: message?.length || 0,
      sessionId: sessionId,
      userId: auth.user?.id,
    });
    if (!message.trim()) return;

    // If a custom onSubmit handler is provided, use it instead of the default logic
    if (customOnSubmit) {
      try {
        setLocalIsLoading(true);
        await customOnSubmit(message);
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
      });
    } catch (error) {
      // Error handling is done in the helper
      console.error("ChatMain handleSubmit error:", error);
    } finally {
      setLocalIsLoading(false);
    }
  };

  // Handle message forking
  const handleFork = async (messageId: string) => {
    toast.info("Forking not yet implemented in canonical mode");
  };

  // Generate context-specific CSS classes - now always Mission Control
  const getContextClasses = () => {
    return "flex-1 flex flex-col overflow-hidden relative bg-black h-full max-h-full mission-control-chat";
  };

  // Empty state - Apple style
  if (!sessionId) {
    return <ChatEmptyState onStartChat={() => setIsNewChatModalOpen(true)} />;
  }

  return (
    <div ref={mainContainerRef} className={getContextClasses()} id="chat-main">
      {/* Subtle gradient overlay for depth */}
      {/* DEBUG SIZE OVERLAY */}
      {/* {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded z-[9999] pointer-events-none max-w-[200px] break-words">
          {containerSize.width}px × {containerSize.height}px
          <br />
          <span className={containerSize.height <= 945 ? 'text-green-400' : 'text-red-400'}>
            H: {containerSize.height <= 945 ? '✓ Normal' : '⚠ Expanded'}
          </span>
          <br />
          <span className={containerSize.width <= window.innerWidth ? 'text-green-400' : 'text-red-400'}>
            W: {containerSize.width <= window.innerWidth ? '✓ Normal' : '⚠ Overflow'}
          </span>
        </div>
      )} */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none" />

      {!hideHeader && (
        <div className="flex-shrink-0">
          <ChatHeader
            sessionId={sessionId}
            onToggleRefinedMode={setRefinedMode}
            hasMessages={messages.length > 0}
            // Pass down stream debug overlay props
            streamDebugOverlayOpen={streamDebugOverlayOpen}
            onToggleStreamDebugOverlay={setStreamDebugOverlayOpen}
            // Pass down hydration debug overlay props
            hydrationDebugOverlayOpen={hydrationDebugOverlayOpen}
            onToggleHydrationDebugOverlay={setHydrationDebugOverlayOpen}
            // Pass down tool debug panel props
            toolDebugOpen={toolDebugOpen}
            onToggleToolDebug={setToolDebugOpen}
            // Pass down event tap debug overlay props
            eventTapDebugOpen={eventTapDebugOpen}
            onToggleEventTapDebug={setEventTapDebugOpen}
          />
        </div>
      )}

      {/* Session Details Debug Component */}
      <div className="flex-shrink-0">
        <SessionDetailDebug />
      </div>

      {/* Tool Approval Panel - Shows pending tool approvals for user interaction */}
      <div className="flex-shrink-0">
        <ApprovalPanel
          sessionId={sessionId}
          className={cn(
            "py-4 border-b border-white/10",
            "px-4" // Mission Control spacing
          )}
        />
      </div>
      <ScrollArea
        className={cn(
          "flex-1 flex-shrink overflow-y-auto overflow-x-hidden relative z-10 min-h-0 [&>[data-radix-scroll-area-viewport]]:!h-full",
          "mission-control-scroll-area"
        )}
        onScrollCapture={handleScroll}
      >
        <div className="w-full max-w-full overflow-x-hidden px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
          <ChatMessageList
            data-testid="chat-message-list"
            messages={displayMessages as any}
            mergedMessageGroups={mergedMessageGroups}
            refinedMode={refinedMode}
            isDesktop={false}
            handleFork={handleFork}
            formatMessageDate={formatMessageDate}
            shouldGroupMessages={shouldGroupMessages}
            isOptimizedFinalAssistantMessage={isOptimizedFinalAssistantMessage}
            getOptimizedFileOperationsForResponse={
              getOptimizedFileOperationsForResponse
            }
            shouldUseUnifiedRendering={shouldUseUnifiedRendering}
            renderUnifiedTimelineEvent={(event: any, index: any, events: any) =>
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
            isVisible={isLoading || isWaitingForAI || false}
            agentName="AI Assistant"
            showThinkingState={
              (messages.length > 0 && messages[messages.length - 1].thinking) ||
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

      {/* Scroll Button - shows "New messages" or "Back to latest" based on context */}
      <NewMessagesIndicator
        show={scrollButtonConfig.show}
        messageCount={scrollButtonConfig.messageCount}
        variant={scrollButtonConfig.variant}
        onClick={scrollToBottom}
      />

      {/* Message Input - Responsive */}
      {!hideInput && (
        <div
          ref={chatInputRef}
          className={cn(
            "flex-shrink-0 sticky bottom-0 z-10 bg-black/80 backdrop-blur-sm border-t border-white/10",
            "mission-control-input-area"
          )}
        >
          <MobileChatInput
            onSendMessage={handleSubmit}
            onCancelButtonClick={handleStopGenerating}
            disabled={isTyping || isLoading || isWaitingForAI}
            placeholder="Message"
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

      {/* New Chat Modal 
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        chat={chatUI}
      />*/}

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
                        console.log(
                          "inline data: ",
                          JSON.stringify(data, null, 2)
                        );
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
                  disabled={isLoading}
                >
                  Clear Store & Re-hydrate
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layout Debug Overlay */}
      {/* <DebugOverlay
        scrollAreaRef={scrollAreaRef}
        chatInputRef={chatInputRef}
        mainContainerRef={mainContainerRef}
      /> */}

      {/* Message Test Controls */}
      {/* <MessageTestControls sessionId={sessionId} /> */}

      {/* SSE Debug Overlay */}
      {/* <SSEDebugOverlay /> */}

      {/* Event Tap Debug Overlay */}
      {/* <EventTapDebugOverlay
        open={eventTapDebugOpen}
        onClose={() => setEventTapDebugOpen(false)}
        sessionId={sessionId || ''}
      /> */}

      {/* Tool Event Debug Panel */}
      {/* <ToolEventDebugPanel
        open={toolDebugOpen}
        onClose={() => setToolDebugOpen(false)}
        messages={messages}
        sessionId={sessionId || ''}
      /> */}
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
      prevProps.sidebarCollapsed === nextProps.sidebarCollapsed
    );
  }
);

export default ChatMainCanonicalLegacy;
