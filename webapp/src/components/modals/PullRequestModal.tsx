import React from "react";
import ReactDOM from "react-dom";
import { X, GitPullRequest } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "cn-utility";

interface GitHubPRModalProps {
  onClose: () => void;
  sessionId: string;
}

export const GitHubPRModal: React.FC<GitHubPRModalProps> = ({
  onClose,
  sessionId,
}) => {
  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            "relative w-full max-w-lg",
            "bg-black/90 backdrop-blur-2xl",
            "rounded-3xl shadow-2xl",
            "border border-white/20",
            "overflow-hidden"
          )}
        >
          {/* Content */}
          <div className="relative z-10 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-white/70" />
                <h2 className="text-xl font-medium text-white/90">
                  Create Pull Request
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <X className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
              </button>
            </div>

            {/* Form (stub) */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Session ID
                </label>
                <div className="text-sm text-white/70 font-mono bg-white/[0.03] border border-white/10 rounded-md px-3 py-2">
                  {sessionId}
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">
                  PR Title
                </label>
                <input
                  className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20"
                  placeholder="Describe your changes"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Description
                </label>
                <textarea
                  rows={5}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20"
                  placeholder="Add context, motivation, and any screenshots"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.08] border border-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: integrate with your PR creation flow
                  // e.g., call an API or SCM client then close
                  onClose();
                }}
                className="px-4 py-2 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 rounded-lg transition-colors"
              >
                Create PR
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
};
