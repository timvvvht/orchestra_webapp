// webapp/src/components/chat-interface/ChatMessage.tsx
import React, { useState } from "react";
import type {
  ChatMessage as ChatMessageType,
  TextPart,
} from "@/types/chatTypes";
import OptimizedTextPartDisplay from "./content-parts/OptimizedTextPartDisplay";

interface ChatMessageProps {
  message: ChatMessageType;
  isLastMessage: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onFork?: () => void; // Ignored in minimal version
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLastMessage,
  isFirstInGroup = true,
  isLastInGroup = true,
  showAvatar = true,
  showTimestamp = true,
}) => {
  // @ts-ignore
  const isUser = message.role === "user" || message.role === "User";

  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  // Collect text parts for rendering
  const textParts: TextPart[] = [];
  if (Array.isArray(message.content)) {
    message.content
      .filter((p): p is TextPart => p && p.type === "text")
      .forEach((p) => {
        if (p.text && p.text.trim()) textParts.push(p);
      });
  } else if (typeof (message as any).content === "string") {
    const s = (message as any).content as string;
    if (s.trim()) textParts.push({ type: "text", text: s });
  }

  if (textParts.length === 0 && !message.thinking) {
    return null;
  }

  // Extract text content from message for copying
  const getMessageText = () => {
    if (typeof message.content === "string") {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      return message.content
        .filter((part) => part.type === "text")
        .map((part) => (part as TextPart).text)
        .join("\n");
    }

    return "";
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    const text = getMessageText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyStatus("success");

      // Reset states after 2 seconds
      setTimeout(() => {
        setCopied(false);
        setCopyStatus("idle");
      }, 2000);
    } catch (err) {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  const bubbleBase =
    "relative inline-block max-w-[85%] break-words rounded-2xl px-4 py-2";
  const bubbleClasses = isUser
    ? `${bubbleBase} bg-blue-600 text-white group`
    : `${bubbleBase} bg-white/5 text-white border border-white/10 backdrop-blur group`;

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && showAvatar && isFirstInGroup ? (
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 mr-3 mt-1" />
      ) : !isUser ? (
        <div className="w-8 mr-3" />
      ) : null}

      <div className="flex-1 min-w-0">
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
          <div className={`chat-message ${bubbleClasses}`}>
            {/* Copy button */}
            {textParts.length > 0 && (
              <button
                onClick={handleCopy}
                title="Copy"
                className="absolute top-1 right-1 p-1 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            )}
            {/* Copy status indicator */}
            {copyStatus === "success" && (
              <div className="absolute -top-8 right-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                Copied!
              </div>
            )}
            {copyStatus === "error" && (
              <div className="absolute -top-8 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded">
                Failed
              </div>
            )}
            {textParts.length > 0 && (
              <div className="space-y-3">
                {textParts.map((part, i) => (
                  <OptimizedTextPartDisplay key={i} part={part} />
                ))}
              </div>
            )}
            {message.thinking && textParts.length === 0 && (
              <div className="text-xs opacity-70">Thinking…</div>
            )}
            {showTimestamp && isLastInGroup && (
              <div
                className={`text-[10px] mt-1 ${isUser ? "text-white/70 text-right" : "text-white/50"}`}
              >
                {message.createdAt
                  ? new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {isUser && showAvatar && isFirstInGroup ? (
        <div className="w-8 h-8 rounded-full bg-blue-600 ml-3 mt-1" />
      ) : isUser ? (
        <div className="w-8 ml-3" />
      ) : null}
    </div>
  );
};

export default React.memo(ChatMessage);
