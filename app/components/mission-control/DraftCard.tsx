import React, { useCallback } from "react";
import { X } from "lucide-react";
import { DraftIssue, useDraftStore } from "@/stores/draftStore";
import { startNewChatForDraft } from "@/lib/chat/newChatHelper";
import { useAuth } from "@/auth/AuthContext";
import { getDefaultACSClient } from "@/services/acs";
import { useAgentConfigs } from "@/hooks/useAgentConfigs";
import { toast } from "sonner";

// Format time ago
const formatTimeAgo = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface DraftCardProps {
  draft: DraftIssue;
}

const DraftCard: React.FC<DraftCardProps> = ({ draft }) => {
  const { removeDraft } = useDraftStore();
  const auth = useAuth();
  const { agentConfigsArray } = useAgentConfigs();

  const handleSend = useCallback(async () => {
    if (!auth.user?.id) {
      toast.error("Please sign in to send messages");
      return;
    }

    try {
      const acsClient = getDefaultACSClient();
      const selectedAgentConfig = agentConfigsArray.find(
        (ac) => ac.id === draft.agentConfigId
      );
      const agentConfigName = selectedAgentConfig?.agent.name || "General";

      await startNewChatForDraft({
        draftText: draft.content,
        userId: auth.user.id,
        agentConfigName,
        acsClient,
        agentConfigId: draft.agentConfigId,
        sessionName: `Issue: ${draft.content.substring(0, 30)}...`,
        agentCwd: draft.codePath,
      });

      removeDraft(draft.id);
      toast.success("Draft sent to agent", {
        description: "Your task has been sent and a new session created",
      });
    } catch (error) {
      console.error("[DraftCard] Failed to send draft:", error);
      toast.error("Failed to send task", {
        description: "Please try again",
      });
    }
  }, [draft, auth.user?.id, agentConfigsArray, removeDraft]);

  const handleDelete = useCallback(() => {
    removeDraft(draft.id);
  }, [draft.id, removeDraft]);

  return (
    <div className="group relative mb-2">
      {/* Subtle border without gradient */}
      <div className="relative rounded-lg bg-white/[0.02] border border-white/[0.06] overflow-hidden group-hover:bg-white/[0.04] group-hover:border-white/[0.08] transition-[background-color,border-color] duration-150 will-change-[background-color,border-color]">
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/70 leading-relaxed line-clamp-2">
                {draft.content}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-white/30">Draft</span>
                <span className="text-xs text-white/20">
                  {formatTimeAgo(draft.createdAt)}
                </span>
              </div>
            </div>

            {/* Actions - visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSend();
                }}
                className="
                  px-2.5 py-1
                  text-xs font-medium
                  text-white/60 hover:text-white/80
                  bg-white/[0.08] hover:bg-white/[0.12]
                  rounded-md
                  transition-colors duration-150
                "
              >
                Send
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="
                  p-1
                  text-white/30 hover:text-white/50
                  hover:bg-white/10
                  rounded-md
                  transition-colors duration-150
                "
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftCard;
