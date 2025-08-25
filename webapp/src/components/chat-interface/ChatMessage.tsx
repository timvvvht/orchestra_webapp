// webapp/src/components/chat-interface/ChatMessage.tsx
import React, { useState } from "react";
import {
  ChatRole,
  type ChatMessage as ChatMessageType,
  type TextPart,
} from "@/types/chatTypes";
import OptimizedTextPartDisplay from "./content-parts/OptimizedTextPartDisplay";
import { Copy } from "lucide-react";
import { MicroToast } from "../ui/MicroToast";

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
  const isUser = message.role === ChatRole.User;

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
    if (!text) {
      console.log("[copy] no text to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      console.log("[copy] success, setting status to success");
      setCopied(true);
      setCopyStatus("success");

      // Reset states after 2 seconds
      setTimeout(() => {
        setCopied(false);
        setCopyStatus("idle");
      }, 2000);
    } catch (err) {
      console.log("[copy] error:", err);
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

      <div className="flex-1 min-w-0 relative">
        {/* Toast notification */}
        {textParts.length > 0 && (
          <div className="absolute top-0 right-6 z-10">
            <MicroToast status={copyStatus} type="copy" position="top" />
          </div>
        )}
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
          <div className={`chat-message ${bubbleClasses}`}>
            {/* Copy button */}
            {textParts.length > 0 && (
              <div className="absolute top-1 right-1 p-1">
                <button
                  onClick={handleCopy}
                  title=""
                  className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                </button>
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
