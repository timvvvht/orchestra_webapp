/**
 * Messages Store - Zustand
 * 
 * Manages chat messages and SSE events with devtools integration.
 * Phase 1 of Zustand migration: messages-first approach.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import { enableMapSet } from 'immer';
import type { ChatMessage } from '@/types/chatTypes';
import type { UnifiedTimelineEvent } from '@/types/unifiedTimeline';
import type { SSEEvent } from '@/services/acs';
import { buildTimelineFromMessages } from '@/utils/timelineParser';

// Enable MapSet support for Immer (required for Set/Map in Zustand state)
enableMapSet();

interface MessagesState {
  // Core message data
  messages: ChatMessage[];
  sseEvents: SSEEvent[];
  
  // STEP 6: Safety net for event deduplication
  seenEventIds: Set<string>;
  
  // Loading states
  isLoading: boolean;
  hasStreamingMessage: boolean;
  
  // Actions for messages
  setMessages: (fn: (draft: ChatMessage[]) => void) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  
  // Actions for SSE events (debug)
  pushSseEvent: (event: SSEEvent) => void;
  clearSseEvents: () => void;
  
  // Loading state actions
  setLoading: (loading: boolean) => void;
  setStreamingMessage: (streaming: boolean) => void;
  
  // Bulk actions
  clear: () => void;
}

export const useMessagesStore = create<MessagesState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        messages: [],
        sseEvents: [],
        seenEventIds: new Set<string>(),
        isLoading: false,
        hasStreamingMessage: false,
        
        // Message actions
        setMessages: (fn) =>
          set((state) => {
            fn(state.messages);
          }, false, 'messages/setMessages'),
          
        addMessage: (message) =>
          set((state) => {
            state.messages.push(message);
          }, false, 'messages/addMessage'),
          
        updateMessage: (id, updates) =>
          set((state) => {
            const index = state.messages.findIndex(m => m.id === id);
            if (index !== -1) {
              Object.assign(state.messages[index], updates);
            }
          }, false, 'messages/updateMessage'),
          
        clearMessages: () =>
          set((state) => {
            state.messages = [];
          }, false, 'messages/clearMessages'),
          
        // SSE event actions (debug)
        pushSseEvent: (event) =>
          set((state) => {
            // STEP 6: Safety net - prevent same event_id from entering twice
            const eventId = (event as any).event_id || `${event.messageId}:${event.type}:${Date.now()}`;
            
            if (state.seenEventIds.has(eventId)) {
              console.debug('🚫 [MessagesStore] Duplicate event_id blocked:', eventId, event.type);
              return; // Don't add duplicate
            }
            
            state.seenEventIds.add(eventId);
            state.sseEvents.push(event);
            
            // Keep only last 200 events for performance
            if (state.sseEvents.length > 200) {
              state.sseEvents.shift();
            }
            
            // Clean up old event IDs to prevent memory leak
            if (state.seenEventIds.size > 500) {
              // Clear the set periodically to prevent unbounded growth
              state.seenEventIds.clear();
            }
          }, false, 'messages/pushSseEvent'),
          
        clearSseEvents: () =>
          set((state) => {
            state.sseEvents = [];
            state.seenEventIds.clear();
          }, false, 'messages/clearSseEvents'),
          
        // Loading state actions
        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }, false, 'messages/setLoading'),
          
        setStreamingMessage: (streaming) =>
          set((state) => {
            state.hasStreamingMessage = streaming;
          }, false, 'messages/setStreamingMessage'),
          
        // Bulk clear action
        clear: () =>
          set((state) => {
            state.messages = [];
            state.sseEvents = [];
            state.seenEventIds.clear();
            state.isLoading = false;
            state.hasStreamingMessage = false;
          }, false, 'messages/clear'),
      })),
      {
        name: 'orchestra-messages',
        version: 1,
        // No persistence yet - we'll enable this after testing
        partialize: () => ({}),
      }
    ),
    {
      name: 'Messages Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ---- MEMO SELECTOR  ----------------------------------------------
// Build timeline once per messages array identity (Zustand guarantees new identity
// when we write via Immer).
export const useTimeline = () =>
  useMessagesStore(
    // selector: derive timeline from messages
    ({ messages }) => {
      const timeline = buildTimelineFromMessages(messages);
      return timeline;
    },
    // equalityFn: shallow comparison to avoid re-render if timeline array content is consistent
    shallow
  );

// Selector hooks for performance optimization
export const useMessages = () => useMessagesStore(state => state.messages);
export const useSseEvents = () => useMessagesStore(state => state.sseEvents);
export const useMessagesLoading = () => useMessagesStore(state => state.isLoading);
export const useHasStreamingMessage = () => useMessagesStore(state => state.hasStreamingMessage);

// Computed selectors
export const useStreamingMessages = () => 
  useMessagesStore(state => 
    state.messages.filter(m => m.isStreaming)
  );

export const useMessageCount = () => 
  useMessagesStore(state => state.messages.length);

export const useTimelineCount = () => {
  const timeline = useTimeline();
  return timeline.length;
};