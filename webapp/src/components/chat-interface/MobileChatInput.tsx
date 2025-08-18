/**
 * MobileChatInput Component - Webapp Stub Implementation
 *
 * Simplified stub version of the mobile chat input for webapp migration.
 * Provides the basic interface optimized for mobile devices.
 *
 * TODO: Implement full mobile chat input functionality when needed
 */

import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Square } from "lucide-react";

interface MobileChatInputProps {
  onSendMessage?: (message: string) => void;
  onCancelButtonClick: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MobileChatInput: React.FC<MobileChatInputProps> = ({
  onSendMessage,
  onCancelButtonClick,
  placeholder = "Type your message...",
  disabled = false,
  className = "",
}) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <div
      className={`border border-gray-300 dark:border-gray-600 rounded-lg ${className}`}
    >
      <form onSubmit={handleSubmit} className="flex items-end">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 p-3 bg-transparent resize-none focus:outline-none min-h-[50px] max-h-24 text-base"
          rows={1}
          style={{ fontSize: "16px" }} // Prevent zoom on iOS
        />
        <div className="p-2 flex items-center justify-evenly">
          {/* Stop Generating Button */}
          <div className="px-4 py-2 border-b border-white/5">
            <Button
              onClick={onCancelButtonClick}
              variant="outline"
              size="sm"
              type="button"
              className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 rounded-full"
            >
              <Square className="w-3 h-3" />
            </Button>
          </div>
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>

      <div className="px-3 pb-2 text-xs text-gray-500 italic">
        Mobile-optimized input (webapp mode)
      </div>
    </div>
  );
};

export default MobileChatInput;
