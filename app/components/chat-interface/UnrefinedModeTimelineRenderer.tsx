// 🔄 UNIFIED TIMELINE RENDERER
// Renders messages with sophisticated unified timeline rendering for tools and file operations
// Hard migration: No feature flags, always uses unified rendering for tool-containing messages

import React from 'react';
import ChatMessage from '~/webapp/src/components/chat-interface/ChatMessage';
import { renderUnifiedTimelineEvent, FileOperationsSummary, DynamicToolStatusPill } from './UnifiedTimelineRenderer';
import { convertChatMessageToTimeline, extractFileOperation } from '~/webapp/src/utils/timelineParser';
import { pairToolEvents } from '~/webapp/src/utils/timelineHelpers';
import type { ChatMessage as ChatMessageType } from '~/webapp/src/types/chatTypes';
import type { UnifiedTimelineEvent, FileOperation } from '~/webapp/src/types/unifiedTimeline';


interface TimelineRendererProps {
  // Core message data
  message: ChatMessageType;

  // ChatMessage compatible props
  onFork?: (messageId: string) => void;
  isLastMessage?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;

  // Additional props for compatibility (not passed to ChatMessage)
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  isStreaming?: boolean;
  className?: string;
  refinedMode?: boolean;

  // Optional: pre-converted timeline events (for performance)
  timelineEvents?: UnifiedTimelineEvent[];

  // Fix for duplication: skip tool rendering when parent already handled it
  skipToolRendering?: boolean;

  // Aggregated file operations for final messages
  aggregatedFileOperations?: FileOperation[];
}

export function UnrefinedModeTimelineRenderer({
  message,
  timelineEvents: providedEvents,
  onFork,
  isLastMessage = false,
  isFirstInGroup = true,
  isLastInGroup = true,
  showAvatar = true,
  showTimestamp = true,
  // Additional props (not passed to ChatMessage)
  onEdit,
  onDelete,
  onRegenerate,
  isStreaming = false,
  className,
  refinedMode = false,
  skipToolRendering = false,
  aggregatedFileOperations = []
}: TimelineRendererProps) {

  // Convert message to timeline events if not provided
  let timelineEvents = providedEvents;

  // NEW: collapse tool_call+result → tool_interaction
  // Skip pairing if events are already pre-paired (from cross-message pairing)
  // if (!providedEvents) {
  //   // Convert message to timeline events first
  //   timelineEvents = convertChatMessageToTimeline(message);
  //   // Then pair the events
  //   timelineEvents = pairToolEvents(timelineEvents);
  //   console.log(`[UnrefinedModeTimelineRenderer] Converted and paired message events: ${timelineEvents.length}`);
  // } else {
  //   console.log(`[UnrefinedModeTimelineRenderer] Using provided pre-paired events: ${timelineEvents.length}`);
  // }

  // Defensive check for undefined events
  const validEvents = (timelineEvents || []).filter(e => e != null);


  // Separate text events from tool events
  const textEvents = validEvents.filter(event => event?.type === 'message');
  const toolEvents = validEvents.filter(event =>
    event?.type === 'tool_interaction' || event?.type === 'tool_call' || event?.type === 'tool_result'
  );


  // Extract file operations from tool events
  const fileOperations: FileOperation[] = [];

  // Extract file operations from tool_interaction events
  toolEvents.forEach(event => {
    if (event.type === 'tool_interaction') {
      const interaction = event as any;
      const { call, result } = interaction.data;

      if (call && result) {
        const fileOp = extractFileOperation(call, result);
        if (fileOp) {
          fileOperations.push(fileOp);
        }
      }
    }
  });




  // If there are only text events, use the existing ChatMessage component
  if (toolEvents.length === 0) {
    return (
      <ChatMessage
        message={message}
        onFork={onFork || (() => { })}
        isLastMessage={isLastMessage}
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
        showAvatar={showAvatar}
        showTimestamp={showTimestamp}
      />
    );
  }


  // Hybrid rendering: ChatMessage for text + sophisticated tool display
  return (
    <div className="space-y-3">
      {/* Render text content using existing ChatMessage if present */}
      {textEvents.length > 0 && (
        <>
          <ChatMessage
            message={message}
            onFork={onFork || (() => { })}
            isLastMessage={isLastMessage}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            showAvatar={showAvatar}
            showTimestamp={showTimestamp}
          />
        </>
      )}

      {/* Show sophisticated tool display */}
      {toolEvents.length > 0 && !skipToolRendering && (
        <div className="space-y-2">

          {/* Show dynamic tool status pill for all non-think tools - only in refined mode */}
          {refinedMode && (() => {
            const nonThinkTools = toolEvents
              .filter(e => e.type === 'tool_interaction')
              .map(e => (e as any).data.call)
              .filter(tc => tc && tc.name !== 'think');


            if (nonThinkTools.length > 0) {
              return (
                <div className="flex gap-3 mb-2">
                  <div className="w-8 flex-shrink-0" /> {/* Spacer for avatar alignment */}
                  <DynamicToolStatusPill toolCalls={nonThinkTools} isStreaming={isStreaming} />
                </div>
              );
            }
            return null;
          })()}

          {/* Render think blocks individually
          {(() => {
            const thinkEvents = toolEvents.filter(event => {
              if (event.type === 'tool_interaction') {
                const interaction = event as any;
                return interaction.data.call.name === 'think';
              } else if (event.type === 'tool_call') {
                const toolCall = event as any;
                return toolCall.data.name === 'think';
              } else if (event.type === 'tool_result') {
                // Check if this tool_result belongs to a think tool
                const toolResult = event as any;
                const toolCallId = toolResult.data.tool_use_id || toolResult.data.tool_call_id;
                // Find the corresponding tool_call to check if it's a think tool
                const correspondingCall = toolEvents.find(e =>
                  e.type === 'tool_call' && (e as any).data.id === toolCallId
                );
                return correspondingCall && (correspondingCall as any).data.name === 'think';
              }
              return false;
            });



            return thinkEvents.map((event, index) => {
              return (
                <>
                <div>{JSON.stringify(event.data?.name)}</div>
                  <div key={`think-${event.id}-${index}`}>
                    {renderUnifiedTimelineEvent(event, index, toolEvents, false, refinedMode)}
                  </div>
                </>
              );
            });
          })()} */}

          {/* Render individual tool interactions in unrefined mode */}
          {!refinedMode && (() => {
            // Render all tool events, including think tools
            // filter out where toolEvents == tool result
            return toolEvents.filter(e => e.type !== 'tool_result').map((event, index) => {
              return (
                <>
                  <div key={`${event.id}-${index}`}>
                    {renderUnifiedTimelineEvent(event, index, toolEvents, false, false)}
                  </div>
                </>
              );
            });
          })()}
        </div>
      )}

      {/* Show aggregated file operations summary for final messages */}
      {/* {false && aggregatedFileOperations.length > 0 && (
        <div className="mt-4">
          <FileOperationsSummary operations={aggregatedFileOperations} />
        </div>
      )} */}
    </div>
  );
}

// Helper function to check if a message should use unified rendering
export function shouldUseUnifiedRendering(message: ChatMessageType): boolean {

  if (!Array.isArray(message.content)) {
    return false;
  }

  // Recognise tool parts even if upstream code used legacy field names
  const hasTools = message.content.some(part => {
    if (part.type === 'tool_use' || part.type === 'tool_result') return true;
    // Legacy / alternate shapes coming from eventConversion or RowMapper
    if ('tool_use_id' in part || 'tool_use_id_for_output' in part) return true;
    return false;
  });

  return hasTools;
}

// Batch conversion utility for performance
export function convertMessagesToTimeline(messages: ChatMessageType[]): Map<string, UnifiedTimelineEvent[]> {
  const timelineMap = new Map<string, UnifiedTimelineEvent[]>();

  messages.forEach(message => {
    if (shouldUseUnifiedRendering(message)) {
      timelineMap.set(message.id, convertChatMessageToTimeline(message));
    }
  });

  return timelineMap;
}

export default UnrefinedModeTimelineRenderer;