// webapp/src/components/chat-interface/ChatMessageList.tsx
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import CheckpointPill from "./CheckpointPill";
import ChatMessage from "./ChatMessage";
import { UnrefinedModeTimelineRenderer } from "./UnrefinedModeTimelineRenderer";
import TouchMessage from "./TouchMessage";
import { AssistantMessageWithFileOps } from "./UnifiedTimelineRenderer";
import { getOptimizedToolCallsForResponse } from "@/utils/optimizedMessageFiltering";
import { pairToolEventsAcrossMessages } from "@/utils/timelineHelpers";

// Custom hook for aggregated file operations
const useAggregatedFileOperations = (
  messages: any[],
  crossMessageToolEvents: any[]
) => {
  return useMemo(() => {
    // Extract file operations from ALL tool events across ALL messages
    const allFileOps: any[] = [];

    // Process all assistant messages to extract file operations from their tool events
    const assistantMessages = messages.filter((m) => m.role === "assistant");

    assistantMessages.forEach((message) => {
      // Get tool events for this message
      const messageEvents = crossMessageToolEvents.filter((event) => {
        const messageIdentifier = message.id;
        const eventMessageId = event.metadata?.supabase?.messageId;
        if (eventMessageId === messageIdentifier) return true;
        if (event.type === "tool_interaction") {
          const interaction = event as any;
          const callMessageId =
            interaction.data?.call?.rawData?.metadata?.supabase?.messageId;
          return callMessageId === messageIdentifier;
        }
        return false;
      });

      // Extract file operations from tool_interaction events
      messageEvents.forEach((event) => {
        if (event.type === "tool_interaction") {
          const interaction = event as any;
          const { call, result } = interaction.data;

          if (call && result) {
            // Use the same extraction logic as UnrefinedModeTimelineRenderer
            const fileTools = [
              "str_replace_editor",
              "create_file",
              "write_file",
              "read_files",
              "search_files",
              "cat",
              "grep",
              "mv",
              "cp",
              "tree",
            ];

            if (call.name && fileTools.includes(call.name.toLowerCase())) {
              const params = call.parameters || call.input || call.arguments;

              let path: string | null = null;
              let opType: "created" | "modified" | "deleted" | null = null;

              switch (call.name.toLowerCase()) {
                case "str_replace_editor":
                  if (params?.path) path = params.path;
                  const cmd = String(params?.command || "").toLowerCase();
                  if (cmd === "create") opType = "created";
                  else if (
                    cmd === "str_replace" ||
                    cmd === "insert" ||
                    cmd === "append" ||
                    cmd === "undo_edit"
                  )
                    opType = "modified";
                  break;
                case "create_file":
                  if (params?.path) path = params.path;
                  opType = "created";
                  break;
                case "write_file":
                  if (params?.path) path = params.path;
                  opType = "modified";
                  break;
                case "read_files":
                  if (
                    params?.files &&
                    Array.isArray(params.files) &&
                    params.files.length > 0
                  )
                    path = params.files[0];
                  else if (params?.file) path = params.file;
                  opType = "modified";
                  break;
                case "search_files":
                  if (
                    params?.paths &&
                    Array.isArray(params.paths) &&
                    params.paths.length > 0
                  )
                    path = params.paths[0];
                  else if (params?.path) path = params.path;
                  opType = "modified";
                  break;
                case "cat":
                case "grep":
                  if (params?.file) path = params.file;
                  opType = "modified";
                  break;
                case "mv":
                case "cp":
                  if (params?.destination) path = params.destination;
                  else if (params?.source) path = params.source;
                  opType = "created";
                  break;
                case "tree":
                  if (params?.path) path = params.path;
                  opType = "modified";
                  break;
              }

              if (path && opType) {
                const fileOp = {
                  type: opType,
                  path: String(path),
                  timestamp: call.timestamp || Date.now(),
                  success: true,
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
    allFileOps.forEach((op) => {
      const key = `${op.path}-${op.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(op);
      }
    });

    return deduped;
  }, [messages, crossMessageToolEvents]);
};

interface ChatMessageListProps {
  messages: any[];
  mergedMessageGroups: any[];
  refinedMode: boolean;
  handleFork: (messageId: string) => void;
  formatMessageDate: (date: Date) => string;
  shouldGroupMessages: (msg1: any, msg2: any) => boolean;
  isOptimizedFinalAssistantMessage: (message: any, messages: any[]) => boolean;
  getOptimizedFileOperationsForResponse: (
    messages: any[],
    messageId: string
  ) => any[];
  shouldUseUnifiedRendering: (message: any) => boolean;
  renderUnifiedTimelineEvent: (
    event: any,
    index: number,
    events: any[]
  ) => React.ReactNode;
}

// Memoized helpers
const MemoizedChatMessage = React.memo(ChatMessage as any);
const MemoizedUnrefinedModeTimelineRenderer = React.memo(
  UnrefinedModeTimelineRenderer as any
);
const MemoizedAssistantMessageWithFileOps = React.memo(
  AssistantMessageWithFileOps as any
);

export default function ChatMessageList({
  messages,
  mergedMessageGroups,
  refinedMode,
  handleFork,
  formatMessageDate,
  shouldGroupMessages,
  isOptimizedFinalAssistantMessage,
  getOptimizedFileOperationsForResponse,
  shouldUseUnifiedRendering,
  renderUnifiedTimelineEvent,
}: ChatMessageListProps) {
  if (!messages || messages.length === 0) return <></>;

  const crossMessageToolEvents = useMemo(() => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    return pairToolEventsAcrossMessages(assistantMessages);
  }, [messages]);

  // Extract to custom hook for better performance
  const aggregatedFileOperations = useAggregatedFileOperations(
    messages,
    crossMessageToolEvents
  );

  const toolCallsById = useMemo(() => {
    const out: Record<string, any[]> = {};
    messages
      .filter((m) => m.role === "assistant")
      .forEach((m) => {
        try {
          out[m.id] = getOptimizedToolCallsForResponse(messages, m.id);
        } catch {
          out[m.id] = [];
        }
      });
    return out;
  }, [messages]);

  return (
    <div className="space-y-8">
      {mergedMessageGroups.map((group: any, groupIndex: number) => (
        <motion.div
          key={`group-${group.date?.toISOString?.() || groupIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Date separator */}
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

          {group.messages.map((message: any, messageIndex: number) => {
            const prevMessage =
              messageIndex > 0 ? group.messages[messageIndex - 1] : null;
            const nextMessage =
              messageIndex < group.messages.length - 1
                ? group.messages[messageIndex + 1]
                : null;

            const isFirstInGroup =
              !prevMessage || !shouldGroupMessages(message, prevMessage);
            const isLastInGroup =
              !nextMessage || !shouldGroupMessages(message, nextMessage);
            const isFinal = isOptimizedFinalAssistantMessage(message, messages);

            const currentIndex = messages.findIndex(
              (m: any) => m.id === message.id
            );
            const nextMsg =
              currentIndex < messages.length - 1
                ? messages[currentIndex + 1]
                : null;
            const isCorrectlyFinal =
              message.role === "assistant" &&
              (!nextMsg || nextMsg.role === "user");

            const shouldShowFileOps = false;
            const fileOperations: any[] = [];

            const allToolCalls = toolCallsById[message.id] || [];

            if (refinedMode && isFinal && message.role === "assistant") {
              return (
                <></>
                // <div key={message.id} className="min-h-[60px]">
                //   <MemoizedAssistantMessageWithFileOps
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
                //   />
                // </div>
              );
            }

            if (message.role === "assistant" && !(refinedMode && isFinal)) {
              const messageEvents = crossMessageToolEvents.filter(
                (event: any) => {
                  const messageIdentifier = message.id || `msg-${messageIndex}`;
                  const eventMessageId = event.metadata?.supabase?.messageId;
                  if (eventMessageId === messageIdentifier) return true;
                  if (event.type === "tool_interaction") {
                    const callMessageId =
                      event.data?.call?.rawData?.metadata?.supabase?.messageId;
                    return callMessageId === messageIdentifier;
                  }
                  return false;
                }
              );

              if (messageEvents.length === 0) {
                const hasTextContent =
                  Array.isArray(message.content) &&
                  message.content.some(
                    (p: any) => p.type === "text" && p.text?.trim()
                  );
                if (!hasTextContent) return null;

                const node = (
                  <MemoizedChatMessage
                    message={message}
                    onFork={() => handleFork(message.id)}
                    isLastMessage={
                      groupIndex === mergedMessageGroups.length - 1 &&
                      messageIndex === group.messages.length - 1
                    }
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    showAvatar={isFirstInGroup}
                    showTimestamp={isLastInGroup}
                  />
                );
                return (
                  <div key={message.id} className="min-h-[60px]">
                    <TouchMessage
                      onReply={() => handleFork(message.id)}
                      onCopy={() => {
                        const textContent = (
                          Array.isArray(message.content) ? message.content : []
                        )
                          .filter((c: any) => c.type === "text")
                          .map((c: any) => c.text)
                          .join("\n");
                        if (textContent) {
                          navigator.clipboard
                            .writeText(textContent)
                            .then(() =>
                              toast.success("Message copied to clipboard")
                            );
                        }
                      }}
                    >
                      {node}
                    </TouchMessage>
                  </div>
                );
              }

              if (
                Array.isArray(message.content) &&
                message.content[0]?.type === "tool_result"
              ) {
                return null;
              }

              return (
                <div key={message.id} className="min-h-[60px]">
                  <MemoizedUnrefinedModeTimelineRenderer
                    message={message}
                    timelineEvents={messageEvents}
                    onFork={() => handleFork(message.id)}
                    isLastMessage={
                      groupIndex === mergedMessageGroups.length - 1 &&
                      messageIndex === group.messages.length - 1
                    }
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    showAvatar={isFirstInGroup}
                    showTimestamp={isLastInGroup}
                    isStreaming={message.isStreaming || false}
                    refinedMode={refinedMode}
                    skipToolRendering={refinedMode && isFinal}
                    aggregatedFileOperations={[]}
                  />
                </div>
              );
            }

            if (message.type === "checkpoint") {
              return (
                <div key={message.id} className="flex justify-center my-4">
                  <CheckpointPill message={message} />
                </div>
              );
            }

            const chatMessageElement = (
              <MemoizedChatMessage
                message={message}
                isLastMessage={
                  groupIndex === mergedMessageGroups.length - 1 &&
                  messageIndex === group.messages.length - 1
                }
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                showAvatar={isFirstInGroup}
                showTimestamp={isLastInGroup}
                onFork={() => handleFork(message.id)}
              />
            );

            return (
              <div key={message.id} className="min-h-[60px]">
                <TouchMessage
                  onReply={() => handleFork(message.id)}
                  onCopy={() => {
                    const textContent = (
                      Array.isArray(message.content) ? message.content : []
                    )
                      .filter((c: any) => c.type === "text")
                      .map((c: any) => c.text)
                      .join("\n");
                    if (textContent) {
                      navigator.clipboard
                        .writeText(textContent)
                        .then(() =>
                          toast.success("Message copied to clipboard")
                        );
                    }
                  }}
                >
                  {chatMessageElement}
                </TouchMessage>
              </div>
            );
          })}
        </motion.div>
      ))}
    </div>
  );
}
