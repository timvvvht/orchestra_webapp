/**
 * useChatSSE - Custom hook for managing SSE events and processing
 * Extracted from ChatMainCanonicalLegacy to improve maintainability
 */

import { useEffect, useCallback } from 'react';
import { useEventStore } from '@/stores/eventStore';
import { useSessionStatusStore } from '@/stores/sessionStatusStore';
import { onSSEEvent } from '@/utils/sse';
import { toUnifiedEvents } from '@/utils/eventConversion';
import { triggerScmCheckpoint } from '@/utils/scm';
import type { SSEEvent } from '@/types/sseTypes';

interface UseChatSSEProps {
  sessionId?: string;
  sseConnected: boolean;
  disconnectStreaming: () => void;
  loadEvents: () => void;
}

export const useChatSSE = ({ 
  sessionId, 
  sseConnected, 
  disconnectStreaming, 
  loadEvents 
}: UseChatSSEProps) => {
  
  // Handle SSE events and update canonical store
  useEffect(() => {
    if (!sessionId) return;

    // ✅ PERFORMANCE: SSE Event Batching System
    let eventBatch: SSEEvent[] = [];
    let batchTimer: NodeJS.Timeout | null = null;
    let lastEventTime = 0;

    // Adaptive batching - faster during high-frequency streaming, slower during idle
    const getBatchDelay = () => {
      const now = Date.now();
      const timeSinceLastEvent = now - lastEventTime;

      // If events are coming rapidly (< 200ms apart), use shorter batch delay
      if (timeSinceLastEvent < 200) {
        return 150; // Fast batching during active streaming
      }
      // If events are sparse (> 1s apart), use longer delay for efficiency
      if (timeSinceLastEvent > 1000) {
        return 500; // Slower batching during idle periods
      }
      // Default batching for normal activity
      return 300;
    };

    const processBatch = () => {
      if (eventBatch.length === 0) return;

      // Process all events in the batch
      const eventsToProcess = [...eventBatch];
      eventBatch = []; // Clear the batch

      // Group events by type for more efficient processing
      const eventsByType = eventsToProcess.reduce((acc, event) => {
        const type = event.type || 'unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(event);
        return acc;
      }, {} as Record<string, SSEEvent[]>);

      // Process each event type in batch
      Object.entries(eventsByType).forEach(([type, events]) => {
        events.forEach(event => processSSEEvent(event));
      });

      // Single UI update for the entire batch
      loadEvents();
    };

    const scheduleUIUpdate = () => {
      if (batchTimer) clearTimeout(batchTimer);

      const delay = getBatchDelay();
      batchTimer = setTimeout(() => {
        processBatch();
        batchTimer = null;
      }, delay);
    };

    // Extract event processing logic for batching
    const processSSEEvent = (event: SSEEvent) => {
      // Safety check: only process events for the current session
      if (!sessionId) {
        // Skip processing when no session is active
        if ((window as any).__SSE_DEBUG) {
          (window as any).__SSE_DEBUG.addLogEntry({
            type: 'error',
            data: 'No current session - ignoring SSE event'
          });
        }
        return;
      }

      if (event.sessionId && event.sessionId !== sessionId) {
        // not for this chat page
        if ((window as any).__SSE_DEBUG) {
          (window as any).__SSE_DEBUG.addLogEntry({
            type: 'filter',
            data: 'Event filtered - session mismatch',
            sessionId: event.sessionId
          });
        }
        return;
      }

      // Get session status helpers once
      const { markIdle, markAwaiting } = useSessionStatusStore.getState();

      // Helper to update session status
      const touchStatus = (idle: boolean) =>
        idle ? markIdle(sessionId) : markAwaiting(sessionId);

      // A) Handle explicit agent_status events (raw event)
      if (event.type === 'agent_status') {
        if (event.data?.status === 'session_idle') {
          touchStatus(true);  // mark idle
        } else if (event.data?.status === 'session_active') {
          triggerScmCheckpoint('start_of_convo', event.sessionId);
        }
        return; // no further processing needed for raw agent_status events
      }

      try {
        // Convert SSE event to unified timeline events
        const unifiedEvents = toUnifiedEvents(event);

        // Log unified events to debug overlay
        if ((window as any).__SSE_DEBUG) {
          unifiedEvents.forEach(unifiedEvent => {
            (window as any).__SSE_DEBUG.addLogEntry({
              type: 'unified',
              data: unifiedEvent,
              sessionId: event.sessionId,
              messageId: unifiedEvent.messageId || event.messageId
            });
          });
        }

        unifiedEvents.forEach(unifiedEvent => {
          // Handle completion signals to clear streaming state
          if (unifiedEvent.type === 'completion_signal') {
            // C) Mark session as idle on completion signal
            touchStatus(true);
            triggerScmCheckpoint('end_of_convo', unifiedEvent.sessionId);

            // Force clear all streaming states in the store
            const state = useEventStore.getState();
            const sessionEvents = state.bySession.get(sessionId) || [];

            sessionEvents.forEach(eventId => {
              const event = state.byId.get(eventId);
              if (event && event.kind === 'message' && event.partial) {
                // Clear streaming state for completed event
                const updatedEvent = {
                  ...event,
                  partial: false,
                  updatedAt: new Date().toISOString()
                };
                useEventStore.getState().addEvent(updatedEvent);
              }
            });

            // Trigger immediate UI update
            scheduleUIUpdate();
            return;
          }

          // Map unified event to canonical event format
          if (unifiedEvent.type === 'chunk') {
            // B) Mark session as active when receiving chunks
            touchStatus(false);

            // Handle streaming text chunks
            const chunkData = unifiedEvent as any;

            // Use messageId as the event ID so chunks get merged into the same event
            const eventId = chunkData.messageId || unifiedEvent.id;

            // Get existing event to merge with
            const existingEvent = useEventStore.getState().getEventById(eventId);

            if (existingEvent && existingEvent.kind === 'message') {
              // Merge chunk into existing message
              const existingText = existingEvent.content?.[0]?.type === 'text' ? existingEvent.content[0].text : '';

              const newText = existingText + (chunkData.delta || '');

              const updatedEvent = {
                ...existingEvent,
                content: [{ type: 'text', text: newText }],
                partial: chunkData.isStreaming !== false, // Update streaming status
                updatedAt: new Date().toISOString()
              };

              useEventStore.getState().addEvent(updatedEvent);

              // Log to debug overlay
              if ((window as any).__SSE_DEBUG) {
                (window as any).__SSE_DEBUG.addLogEntry({
                  type: 'store_add',
                  data: { action: 'merge_chunk', eventId, newTextLength: newText.length },
                  sessionId: event.sessionId,
                  messageId: chunkData.messageId
                });
              }
            } else {
              // Create new message event for first chunk
              const newEvent = {
                id: eventId,
                kind: 'message',
                role: chunkData.role || 'assistant',
                content: [{ type: 'text', text: chunkData.delta || '' }],
                createdAt: new Date(chunkData.createdAt || Date.now()).toISOString(),
                sessionId: sessionId,
                partial: chunkData.isStreaming !== false,
                source: 'sse' as const,
                messageId: chunkData.messageId
              };

              useEventStore.getState().addEvent(newEvent);

              // Log to debug overlay
              if ((window as any).__SSE_DEBUG) {
                (window as any).__SSE_DEBUG.addLogEntry({
                  type: 'store_add',
                  data: { action: 'create_chunk', eventId, deltaLength: (chunkData.delta || '').length },
                  sessionId: event.sessionId,
                  messageId: chunkData.messageId
                });
              }
            }
          } else if (unifiedEvent.type === 'message' || unifiedEvent.type === 'text') {
            const messageData = unifiedEvent.data as any;
            const textEvent = unifiedEvent as any;
            useEventStore.getState().addEvent({
              id: unifiedEvent.id,
              kind: 'message',
              role: textEvent.role || messageData?.role || 'assistant',
              content: messageData?.content || [{ type: 'text', text: textEvent.text || messageData?.text || '' }],
              createdAt: new Date(unifiedEvent.createdAt || unifiedEvent.timestamp).toISOString(),
              sessionId: sessionId,
              partial: textEvent.isStreaming || messageData?.isStreaming || false,
              source: 'sse' as const
            });
          } else if (unifiedEvent.type === 'tool_call') {
            const toolCallData = unifiedEvent as any;
            const toolEvent = {
              id: unifiedEvent.id,
              kind: 'tool_call',
              role: 'assistant',
              name: toolCallData.toolCall?.name,
              args: toolCallData.toolCall?.args || {},
              toolUseId: toolCallData.toolCall?.id,
              createdAt: new Date(unifiedEvent.createdAt).toISOString(),
              sessionId: sessionId,
              partial: false,
              source: 'sse' as const
            };

            useEventStore.getState().addEvent(toolEvent);

            // Log to debug overlay
            if ((window as any).__SSE_DEBUG) {
              (window as any).__SSE_DEBUG.addLogEntry({
                type: 'store_add',
                data: { action: 'tool_call', toolName: toolCallData.toolCall?.name },
                sessionId: event.sessionId,
                messageId: event.messageId
              });
            }
          } else if (unifiedEvent.type === 'tool_result') {
            const toolResultData = unifiedEvent as any;
            const resultEvent = {
              id: unifiedEvent.id,
              kind: 'tool_result',
              role: 'assistant',
              toolUseId: toolResultData.toolResult?.toolCallId,
              result: toolResultData.toolResult?.result,
              createdAt: new Date(unifiedEvent.createdAt).toISOString(),
              sessionId: sessionId,
              partial: false,
              source: 'sse' as const
            };

            useEventStore.getState().addEvent(resultEvent);

            // Log to debug overlay
            if ((window as any).__SSE_DEBUG) {
              (window as any).__SSE_DEBUG.addLogEntry({
                type: 'store_add',
                data: {
                  action: 'tool_result',
                  toolCallId: toolResultData.toolResult?.toolCallId,
                  success: toolResultData.toolResult?.success,
                  result: toolResultData.toolResult?.result,
                  error: toolResultData.toolResult?.error
                },
                sessionId: event.sessionId,
                messageId: event.messageId
              });
            }
          }
        });

        // Note: UI update will be handled by batch processing
      } catch (error) {
        // Error handling for failed event processing

        // Log error to debug overlay
        if ((window as any).__SSE_DEBUG) {
          (window as any).__SSE_DEBUG.addLogEntry({
            type: 'error',
            data: `Failed to process SSE event: ${error.message}`,
            sessionId: event.sessionId,
            messageId: event.messageId
          });
        }
      }
    };

    // Batched SSE Event Handler
    const handleSSEEvent = (event: SSEEvent) => {
      // Update last event time for adaptive batching
      lastEventTime = Date.now();

      // Log to debug overlay
      if ((window as any).__SSE_DEBUG) {
        (window as any).__SSE_DEBUG.addLogEntry({
          type: 'raw_sse',
          data: event,
          sessionId: event.sessionId,
          messageId: event.messageId
        });
      }

      // Add event to batch instead of processing immediately
      eventBatch.push(event);

      // Schedule batch processing
      scheduleUIUpdate();
    };

    const unsubscribe = onSSEEvent(handleSSEEvent);

    // Cleanup: disconnect SSE when component unmounts or session changes
    return () => {
      unsubscribe();
      if (batchTimer) clearTimeout(batchTimer);

      // Process any remaining events in the batch before cleanup
      if (eventBatch.length > 0) {
        processBatch();
      }

      if (sseConnected) {
        disconnectStreaming();
      }
    };
  }, [sessionId, sseConnected, disconnectStreaming, loadEvents]);
};