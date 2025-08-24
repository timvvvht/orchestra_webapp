// webapp/src/components/chat-interface/UnrefinedModeTimelineRenderer.tsx
import React from 'react';
import ChatMessage from '@/components/chat-interface/ChatMessage';
import { renderUnifiedTimelineEvent, /* FileOperationsSummary, */ DynamicToolStatusPill } from './UnifiedTimelineRenderer';
import type { ChatMessage as ChatMessageType } from '@/types/chatTypes';
import type { UnifiedTimelineEvent, FileOperation } from '@/types/unifiedTimeline';

interface TimelineRendererProps {
  message: ChatMessageType;
  onFork?: (messageId: string) => void;
  isLastMessage?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  isStreaming?: boolean;
  className?: string;
  refinedMode?: boolean;
  timelineEvents?: UnifiedTimelineEvent[];
  skipToolRendering?: boolean;
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
  isStreaming = false,
  refinedMode = false,
  skipToolRendering = false,
  aggregatedFileOperations = []
}: TimelineRendererProps) {
  const validEvents = (providedEvents || []).filter(Boolean);
  const textEvents = validEvents.filter((e) => (e as any)?.type === 'message');
  const toolEvents = validEvents.filter((e) =>
    (e as any)?.type === 'tool_interaction' || (e as any)?.type === 'tool_call' || (e as any)?.type === 'tool_result'
  );

  if (toolEvents.length === 0) {
    return (
      <ChatMessage
        message={message}
        onFork={onFork || (() => {})}
        isLastMessage={isLastMessage}
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
        showAvatar={showAvatar}
        showTimestamp={showTimestamp}
      />
    );
  }

  return (
    <div className="space-y-3">
      {textEvents.length > 0 && (
        <ChatMessage
          message={message}
          onFork={onFork || (() => {})}
          isLastMessage={isLastMessage}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          showAvatar={showAvatar}
          showTimestamp={showTimestamp}
        />
      )}

      {toolEvents.length > 0 && !skipToolRendering && (
        <div className="space-y-2">
          {refinedMode && (() => {
            const nonThinkTools = toolEvents
              .filter((e: any) => e.type === 'tool_interaction')
              .map((e: any) => e.data.call)
              .filter((tc: any) => tc && tc.name !== 'think');
            return nonThinkTools.length > 0 ? (
              <div className="flex gap-3 mb-2">
                <div className="w-8 flex-shrink-0" />
                <DynamicToolStatusPill toolCalls={nonThinkTools} isStreaming={isStreaming} />
              </div>
            ) : null;
          })()}

          {/* Unrefined: render all tool events (skip raw tool_result rows) */}
          {!refinedMode && toolEvents
            .filter((e: any) => e.type !== 'tool_result')
            .map((event: any, index: number) => (
              <div key={`${event.id}-${index}`}>{renderUnifiedTimelineEvent(event, index, toolEvents as any, false, false)}</div>
            ))}
        </div>
      )}

      {/* Optional aggregated file operations (disabled by default) */}
      {/* {aggregatedFileOperations.length > 0 && (
        <div className="mt-4">
          <FileOperationsSummary operations={aggregatedFileOperations} />
        </div>
      )} */}
    </div>
  );
}

export function shouldUseUnifiedRendering(message: ChatMessageType): boolean {
  if (!Array.isArray((message as any).content)) return false;
  return (message as any).content.some((part: any) => part?.type === 'tool_use' || part?.type === 'tool_result' || 'tool_use_id' in part || 'tool_use_id_for_output' in part);
}

export default UnrefinedModeTimelineRenderer;

