import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import CheckpointPill from '~/webapp/src/components/chat-interface/CheckpointPill';

// Component imports
import ChatMessage from '~/webapp/src/components/chat-interface/ChatMessage';
import { UnrefinedModeTimelineRenderer } from './UnrefinedModeTimelineRenderer';
import { TouchMessage } from './TouchMessage';
import { AssistantMessageWithFileOps, DynamicToolStatusPill, renderUnifiedTimelineEvent, CombinedThinkBlockDisplay, FileOperationsSummary } from './UnifiedTimelineRenderer';
import ToolStatusPill from './content-parts/ToolStatusPill';
import { getOptimizedToolCallsForResponse } from '~/webapp/src/utils/optimizedMessageFiltering';
import { pairToolEventsAcrossMessages } from '~/webapp/src/utils/timelineHelpers';

// Custom hook for aggregated file operations
const useAggregatedFileOperations = (messages: any[], crossMessageToolEvents: any[]) => {
  return useMemo(() => {
    // Extract file operations from ALL tool events across ALL messages
    const allFileOps: any[] = [];
    
    // Process all assistant messages to extract file operations from their tool events
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    assistantMessages.forEach((message) => {
      // Get tool events for this message
      const messageEvents = crossMessageToolEvents.filter(event => {
        const messageIdentifier = message.id;
        const eventMessageId = event.metadata?.supabase?.messageId;
        if (eventMessageId === messageIdentifier) return true;
        if (event.type === 'tool_interaction') {
          const interaction = event as any;
          const callMessageId = interaction.data?.call?.rawData?.metadata?.supabase?.messageId;
          return callMessageId === messageIdentifier;
        }
        return false;
      });
      
      // Extract file operations from tool_interaction events
      messageEvents.forEach((event) => {
        if (event.type === 'tool_interaction') {
          const interaction = event as any;
          const { call, result } = interaction.data;
          
          if (call && result) {
            // Use the same extraction logic as UnrefinedModeTimelineRenderer
            const fileTools = ['str_replace_editor', 'create_file', 'write_file', 'read_files', 'search_files', 'cat', 'grep', 'mv', 'cp', 'tree'];
            
            if (call.name && fileTools.includes(call.name.toLowerCase())) {
              const params = call.parameters || call.input || call.arguments;
              
              let path: string | null = null;
              let opType: 'created' | 'modified' | 'deleted' | null = null;
              
              switch (call.name.toLowerCase()) {
                case 'str_replace_editor':
                  if (params?.path) path = params.path;
                  const cmd = String(params?.command || '').toLowerCase();
                  if (cmd === 'create') opType = 'created';
                  else if (cmd === 'str_replace' || cmd === 'insert' || cmd === 'append' || cmd === 'undo_edit') opType = 'modified';
                  break;
                case 'create_file':
                  if (params?.path) path = params.path;
                  opType = 'created';
                  break;
                case 'write_file':
                  if (params?.path) path = params.path;
                  opType = 'modified';
                  break;
                case 'read_files':
                  if (params?.files && Array.isArray(params.files) && params.files.length > 0) path = params.files[0];
                  else if (params?.file) path = params.file;
                  opType = 'modified';
                  break;
                case 'search_files':
                  if (params?.paths && Array.isArray(params.paths) && params.paths.length > 0) path = params.paths[0];
                  else if (params?.path) path = params.path;
                  opType = 'modified';
                  break;
                case 'cat':
                case 'grep':
                  if (params?.file) path = params.file;
                  opType = 'modified';
                  break;
                case 'mv':
                case 'cp':
                  if (params?.destination) path = params.destination;
                  else if (params?.source) path = params.source;
                  opType = 'created';
                  break;
                case 'tree':
                  if (params?.path) path = params.path;
                  opType = 'modified';
                  break;
              }
              
              if (path && opType) {
                const fileOp = {
                  type: opType,
                  path: String(path),
                  timestamp: call.timestamp || Date.now(),
                  success: true
                };
                allFileOps.push(fileOp);
              }
            }
          }
        }
      });
    });
    
    // Deduplicate by path + type
    const seen = new Set<string>();
    const deduped: any[] = [];
    allFileOps.forEach(op => {
      const key = `${op.path}-${op.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(op);
      }
    });
    
    return deduped;
  }, [messages, crossMessageToolEvents]);
};

// Memoized message components for better performance
const MemoizedChatMessage = React.memo(ChatMessage);
const MemoizedUnrefinedModeTimelineRenderer = React.memo(UnrefinedModeTimelineRenderer);
const MemoizedAssistantMessageWithFileOps = React.memo(AssistantMessageWithFileOps);
const MemoizedTouchMessage = React.memo(TouchMessage);

interface ChatMessageListProps {
  messages: any[];
  mergedMessageGroups: any[];
  refinedMode: boolean;
  isDesktop: boolean;
  handleFork: (messageId: string) => void;
  formatMessageDate: (date: Date) => string;
  shouldGroupMessages: (msg1: any, msg2: any) => boolean;
  isOptimizedFinalAssistantMessage: (message: any, messages: any[]) => boolean;
  getOptimizedFileOperationsForResponse: (messages: any[], messageId: string) => any[];

  shouldUseUnifiedRendering: (message: any) => boolean;
  renderUnifiedTimelineEvent: (event: any, index: number, events: any[]) => JSX.Element;
}

const ChatMessageList: React.FC<ChatMessageListProps> = React.memo(({
  messages,
  mergedMessageGroups,
  refinedMode,
  isDesktop,
  handleFork,
  formatMessageDate,
  shouldGroupMessages,
  isOptimizedFinalAssistantMessage,
  getOptimizedFileOperationsForResponse,
  shouldUseUnifiedRendering,
  renderUnifiedTimelineEvent
}) => {
  if (messages.length === 0) {
    return <></>;
  }

  // ─── Cross-message tool pairing ───────────────────────────────────────────
  const crossMessageToolEvents = useMemo(() => {
    // Get all assistant messages for cross-message tool pairing
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    return pairToolEventsAcrossMessages(assistantMessages);
  }, [messages]);

  // Extract to custom hook for better performance
  const aggregatedFileOperations = useAggregatedFileOperations(messages, crossMessageToolEvents);

  // ─── Tool-call cache; safe ‑ top-level hook ───────────────────────────────
  const toolCallsById = useMemo(() => {
    const out: Record<string, any[]> = {};
    // Only assistant messages can own tool calls
    messages
      .filter(m => m.role === 'assistant')
      .forEach(m => {
        try {
          out[m.id] = getOptimizedToolCallsForResponse(messages, m.id);
        } catch {
          out[m.id] = [];
        }
      });
    return out;
  }, [messages]);

  return (
    <>
      {/* <div>
        Merged message groups: {mergedMessageGroups.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`}>{groupIndex} {JSON.stringify(group)}</div>
        ))}
      </div> */}
      <div className="space-y-8">
        {mergedMessageGroups.map((group, groupIndex) => (
          <motion.div
            key={`group-${group.date.toISOString()}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Date separator - Apple style */}
            <div className="flex justify-center my-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10"
              >
                <span className="text-xs font-medium text-white/60">
                  {formatMessageDate(group.date)}
                </span>
              </motion.div>
            </div>

            {group.messages.map((message, messageIndex) => {
              const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
              const nextMessage = messageIndex < group.messages.length - 1 ? group.messages[messageIndex + 1] : null;

              const isFirstInGroup = !prevMessage || !shouldGroupMessages(message, prevMessage);
              const isLastInGroup = !nextMessage || !shouldGroupMessages(message, nextMessage);

              // Get file operations for final assistant messages in refined mode
              // ✅ PERFORMANCE: Use optimized version with memoization
              const isFinal = isOptimizedFinalAssistantMessage(message, messages);
              
              // CORRECT LOGIC: An assistant message is "final" if:
              // 1. It's followed by a user message, OR
              // 2. It's the very last message in the conversation
              const currentIndex = messages.findIndex(m => m.id === message.id);
              const nextMsg = currentIndex < messages.length - 1 ? messages[currentIndex + 1] : null;
              
              const isCorrectlyFinal = message.role === 'assistant' && (
                !nextMsg || // Last message in conversation
                nextMsg.role === 'user' // Followed by user message
              );
              
              const isLastMessageInConversation = currentIndex === messages.length - 1;
              
              // Use the correct final logic
              const shouldShowFileOps = false; // Hidden for now
              const fileOperations = shouldShowFileOps ? aggregatedFileOperations : [];


              // Lookup pre-computed tool calls (no hook here)
              const allToolCalls = toolCallsById[message.id] || [];

              // Note: Tool calls are now handled by ToolStatusPill hook automatically

              // Refined mode: Special handling for final assistant messages
              if (refinedMode && isFinal && message.role === 'assistant') {
                // Pre-computed above to satisfy React hook rules

                // Separate think tools from other tools
                const safeToolCalls = allToolCalls.filter(Boolean);          // strip undefined/null
                const thinkTools = safeToolCalls.filter(tc => tc.name === 'think');
                const nonThinkTools = safeToolCalls.filter(tc => tc.name !== 'think');

                return (
                  <></>
                  // <div key={message.id} className="min-h-[60px]">
                  //   {/* Non-think tools - ORIGINAL BEHAVIOR */}
  

                  //   {/* Final assistant message with integrated file operations */}
                  //   {/* <MemoizedAssistantMessageWithFileOps
                  //     message={message}
                  //     fileOperations={fileOperations}
                  //     onFork={() => handleFork(message.id)}
                  //     isLastMessage={groupIndex === mergedMessageGroups.length - 1 && messageIndex === group.messages.length - 1}
                  //     isFirstInGroup={isFirstInGroup}
                  //     isLastInGroup={isLastInGroup}
                  //     showAvatar={isFirstInGroup}
                  //     showTimestamp={isLastInGroup}
                  //     isStreaming={message.isStreaming || false}
                  //     refinedMode={refinedMode}
                  //   /> */}
                  // </div>
                );
              }

              // Render every assistant message via TimelineRenderer so intermediate
              // tool-calls / think blocks are visible even in unrefined mode.
              // Skip if already handled by refined mode special rendering above
              if (message.role === 'assistant' && !(refinedMode && isFinal)) {
                // Filter cross-message events that belong to this message
                const messageEvents = crossMessageToolEvents.filter(event => {
                  // Check if this event originated from this message
                  // Handle cases where message.id might be undefined by using message index as fallback
                  const messageIdentifier = message.id || `msg-${messageIndex}`;
                  const eventMessageId = event.metadata?.supabase?.messageId;

                  if (eventMessageId === messageIdentifier) {
                    return true;
                  }

                  // For tool_interaction events, assign to the message that contains the CALL
                  // This prevents the same tool_interaction from being rendered in multiple messages
                  if (event.type === 'tool_interaction') {
                    const interaction = event as any;
                    const callMessageId = interaction.data?.call?.rawData?.metadata?.supabase?.messageId;
                    // Only assign to the message that has the call, not the result
                    return callMessageId === messageIdentifier;
                  }
                  return false;
                });

                // If no timeline events after deduplication, check if message has actual text content
                if (messageEvents.length === 0) {
                  // Check if message has any text content (not just tool parts)
                  const hasTextContent = Array.isArray(message.content) && 
                    message.content.some(part => part.type === 'text' && part.text?.trim());
                  
                  // If message only contains tool parts (no text), don't render it
                  // The tool interactions are now handled by other messages due to deduplication
                  if (!hasTextContent) {
                    return null;
                  }

                  // Render messages that have actual text content
                  return (
                    <div key={message.id} className="min-h-[60px]">
                      <MemoizedChatMessage
                        message={message}
                        onFork={() => handleFork(message.id)}
                        isLastMessage={groupIndex === mergedMessageGroups.length - 1 && messageIndex === group.messages.length - 1}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        showAvatar={isFirstInGroup}
                        showTimestamp={isLastInGroup}
                      />
                    </div>
                  );
                }
                // if message.content.type == 'tool_result'
                if (message.content[0].type === 'tool_result') {
                  return null;
                }
                // Use timeline renderer for messages with events
                return (
                  <div key={message.id} className="min-h-[60px]">
                    {/* <>Message: {JSON.stringify(message)}</> */}
                    <MemoizedUnrefinedModeTimelineRenderer
                      message={message}
                      timelineEvents={messageEvents}
                      onFork={() => handleFork(message.id)}
                      isLastMessage={groupIndex === mergedMessageGroups.length - 1 && messageIndex === group.messages.length - 1}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      showAvatar={isFirstInGroup}
                      showTimestamp={isLastInGroup}
                      isStreaming={message.isStreaming || false}
                      refinedMode={refinedMode}
                      skipToolRendering={refinedMode && isFinal}
                      // Pass aggregated file operations only to final messages
                      aggregatedFileOperations={shouldShowFileOps ? aggregatedFileOperations : []}
                    />
                  </div>
                );
              }

              // Special handling for checkpoint messages
              if (message.type === 'checkpoint') {
                return (
                  <div key={message.id} className="flex justify-center my-4">
                    <CheckpointPill message={message} />
                  </div>
                );
              }

              // Use existing ChatMessage for non-assistant messages
              const chatMessageElement = (
                <MemoizedChatMessage
                  message={message}
                  isLastMessage={groupIndex === mergedMessageGroups.length - 1 && messageIndex === group.messages.length - 1}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  showAvatar={isFirstInGroup}
                  showTimestamp={isLastInGroup}
                  onFork={() => handleFork(message.id)}
                />
              );

              return (
                <div key={message.id} className="min-h-[60px]">
                  {isDesktop ? (
                    chatMessageElement
                  ) : (
                    <MemoizedTouchMessage
                      onReply={() => handleFork(message.id)}
                      onCopy={() => {
                        const textContent = message.content
                          .filter(c => c.type === 'text')
                          .map(c => c.text)
                          .join('\n');
                        navigator.clipboard.writeText(textContent);
                        toast.success('Message copied to clipboard');
                      }}
                    >
                      {chatMessageElement}
                    </MemoizedTouchMessage>
                  )}
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>
    </>
  );
});

ChatMessageList.displayName = 'ChatMessageList';

export default ChatMessageList;