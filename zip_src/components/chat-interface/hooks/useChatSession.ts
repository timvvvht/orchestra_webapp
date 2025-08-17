/**
 * useChatSession - Custom hook for managing chat session state and hydration
 * Extracted from ChatMainCanonicalLegacy to improve maintainability
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useEventStore } from '@/stores/eventStore';
import { clearDuplicateCache } from '@/stores/eventReducer';
import { hydrateSession } from '@/stores/eventBridges/historyBridge';
import { convertEventsToMessages } from '@/utils/chat';
import type { ChatMessage as ChatMessageType } from '@/types/chatTypes';

interface UseChatSessionProps {
  propSessionId?: string;
}

export const useChatSession = ({ propSessionId }: UseChatSessionProps = {}) => {
  // Get sessionId from props or URL params
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const sessionId = propSessionId ?? urlSessionId;

  // State
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [localIsLoading, setLocalIsLoading] = useState(false);

  // Refs for tracking
  const previousSessionIdRef = useRef<string | undefined>(undefined);
  const activeHydrationRef = useRef<string | null>(null);

  // Load events from canonical store
  const loadEvents = useCallback(() => {
    if (!sessionId) {
      return;
    }

    const state = useEventStore.getState();

    // Try session ID first, then 'unknown'
    let eventIds = state.bySession.get(sessionId) || [];
    if (eventIds.length === 0 && state.bySession.has('unknown')) {
      eventIds = state.bySession.get('unknown') || [];
    }

    const events = eventIds
      .map(id => state.byId.get(id))
      .filter(Boolean);

    // Convert to messages
    const convertedMessages = convertEventsToMessages(events);
    setMessages(convertedMessages);
  }, [sessionId]);

  // Auto-hydrate on session change
  useEffect(() => {
    if (sessionId && !sessionId.startsWith('temp-')) {
      setLocalIsLoading(true);

      const store = useEventStore.getState();

      // Update the previous session ID
      previousSessionIdRef.current = sessionId;

      clearDuplicateCache();

      // ROBUSTNESS: Memory management - limit cache size
      const MAX_CACHED_SESSIONS = 20;
      const currentSessionCount = store.bySession.size;
      if (currentSessionCount > MAX_CACHED_SESSIONS) {
        console.log(`🧹 [useChatSession] Cache size (${currentSessionCount}) exceeds limit (${MAX_CACHED_SESSIONS}), cleaning up old sessions`);
        
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
        const sessionsToRemove = sessionsWithAge.slice(0, currentSessionCount - MAX_CACHED_SESSIONS + 1);
        
        for (const { sessionId: oldSessionId, eventCount } of sessionsToRemove) {
          if (oldSessionId !== sessionId) { // Don't remove current session
            const eventIds = store.bySession.get(oldSessionId) || [];
            eventIds.forEach(eventId => {
              if (store.removeEvent) {
                store.removeEvent(eventId);
              }
            });
            console.log(`🗑️ [useChatSession] Removed old session ${oldSessionId} (${eventCount} events)`);
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
          if (event?.timestamp) {
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
      const isCacheFresh = hasSessionData && (cacheAge < CACHE_TTL_MS || mostRecentEventTime === 0);
      
      const isSessionAlreadyHydrated = hasSessionData && isCacheFresh;
      
      console.log(`🧠 [useChatSession] Cache analysis for ${sessionId}:`, {
        hasSessionData,
        mostRecentEventTime: mostRecentEventTime > 0 ? new Date(mostRecentEventTime).toISOString() : 'No timestamps',
        cacheAge: mostRecentEventTime > 0 ? `${Math.round(cacheAge / 1000)}s` : 'Unknown',
        isCacheFresh,
        isSessionAlreadyHydrated,
        activeHydration: activeHydrationRef.current
      });

      // ROBUSTNESS: Prevent race conditions
      if (activeHydrationRef.current && activeHydrationRef.current !== sessionId) {
        console.warn(`⚠️ [useChatSession] Cancelling hydration for ${activeHydrationRef.current}, switching to ${sessionId}`);
      }

      if (isSessionAlreadyHydrated) {
        // Session already hydrated - skip hydrateSession and load events directly
        console.log(`🚀 [useChatSession] Session ${sessionId} already hydrated, skipping re-hydration`);
        
        // PROGRESSIVE LOADING: Show cached data immediately, then load full context
        setLocalIsLoading(false); // Clear loading immediately for better UX
        
        // PHASE 1: Show cached messages immediately (bottom-up loading)
        const cachedEvents = store.bySession.get(sessionId) || [];
        if (cachedEvents.length > 0) {
          // Show last 20 messages immediately for instant feedback
          const recentEventIds = cachedEvents.slice(-20);
          const recentEvents = recentEventIds.map(id => store.byId.get(id)).filter(Boolean);
          const recentMessages = convertEventsToMessages(recentEvents);
          setMessages(recentMessages);
          console.log(`⚡ [useChatSession] Showing ${recentMessages.length} cached messages immediately`);
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
        const reason = !hasSessionData ? 'no cached data' : 'cache expired';
        console.log(`💧 [useChatSession] Hydrating session ${sessionId} (${reason})`);
        
        // ROBUSTNESS: Track active hydration to prevent races
        activeHydrationRef.current = sessionId;
        
        hydrateSession(sessionId)
          .then(() => {
            // ROBUSTNESS: Only proceed if this is still the active session
            if (activeHydrationRef.current === sessionId) {
              // Call loadEvents directly instead of relying on dependency
              const state = useEventStore.getState();
              let eventIds = state.bySession.get(sessionId) || [];
              if (eventIds.length === 0 && state.bySession.has('unknown')) {
                eventIds = state.bySession.get('unknown') || [];
              }
              const events = eventIds.map(id => state.byId.get(id)).filter(Boolean);
              const convertedMessages = convertEventsToMessages(events);
              setMessages(convertedMessages);
              console.log(`✅ [useChatSession] Successfully hydrated ${sessionId} with ${events.length} events`);
            } else {
              console.log(`🚫 [useChatSession] Discarding hydration result for ${sessionId} (user switched to ${activeHydrationRef.current})`);
            }
          })
          .catch(err => {
            console.error(`❌ [useChatSession] Hydration failed for ${sessionId}:`, err);
            
            // ROBUSTNESS: Only proceed if this is still the active session
            if (activeHydrationRef.current === sessionId) {
              // Try to load events anyway in case there's cached data
              const state = useEventStore.getState();
              let eventIds = state.bySession.get(sessionId) || [];
              if (eventIds.length === 0 && state.bySession.has('unknown')) {
                eventIds = state.bySession.get('unknown') || [];
              }
              const events = eventIds.map(id => state.byId.get(id)).filter(Boolean);
              const convertedMessages = convertEventsToMessages(events);
              setMessages(convertedMessages);
              console.log(`🔄 [useChatSession] Fallback: Loaded ${events.length} cached events for ${sessionId}`);
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
      if (eventIds.length === 0 && state.bySession.has('unknown')) {
        eventIds = state.bySession.get('unknown') || [];
      }
      const events = eventIds.map(id => state.byId.get(id)).filter(Boolean);
      const convertedMessages = convertEventsToMessages(events);
      setMessages(convertedMessages);
    }
  }, [sessionId, loadEvents]);

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = useEventStore.subscribe(loadEvents);
    return unsubscribe;
  }, [loadEvents]);

  return {
    sessionId,
    messages,
    setMessages,
    localIsLoading,
    setLocalIsLoading,
    loadEvents,
  };
};