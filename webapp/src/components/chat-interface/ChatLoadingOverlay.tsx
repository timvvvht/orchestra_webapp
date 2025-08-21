// orchestra_webapp/webapp/src/components/chat-interface/ChatLoadingOverlay.tsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatLoadingOverlayProps {
  context?: "default" | "mission-control";
  sessionId?: string;
  visible: boolean;
}

const ChatLoadingOverlay: React.FC<ChatLoadingOverlayProps> = ({
  context = "default",
  sessionId,
  visible,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="chat-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            // Cover only the chat content area; keep DOM mounted to preserve scroll
            "absolute inset-0 z-30 flex items-center justify-center",
            "bg-black/70 backdrop-blur-sm"
          )}
          aria-busy
          aria-label="Loading conversation"
          data-testid="chat-loading-overlay"
        >
          <div
            className={cn(
              "flex flex-col items-center gap-3",
              context === "mission-control" ? "px-4" : "px-6 md:px-12"
            )}
          >
            {/* Simple spinner */}
            <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <div className="text-white/80 text-sm">
              Loading conversation…
              {import.meta.env.DEV && sessionId ? (
                <span className="ml-2 text-white/40">
                  (id: {sessionId.slice(0, 8)}…)
                </span>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatLoadingOverlay;
