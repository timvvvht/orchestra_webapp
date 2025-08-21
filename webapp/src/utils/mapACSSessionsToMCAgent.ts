import { SessionSummary } from "@/services/acs";
import { MissionControlAgent } from "@/stores/missionControlStore";

// Extended session type that includes latest message data
export type ExtendedSessionSummary = SessionSummary & {
  latest_message_id?: string | null;
  latest_message_role?: string | null;
  latest_message_content?: any | null;
  latest_message_timestamp?: string | null;
  status?: string;
  archived_at?: string | null;
};

export const mapACSSessionsToMCAgent = (
  s: ExtendedSessionSummary
): MissionControlAgent => {
  return {
    id: s.id,
    mission_title: s.name || "Untitled Chat",
    status: s.status || "active",
    last_message_at: s.last_message_at || s.created_at || null,
    created_at: s.created_at || new Date().toISOString(),
    agent_config_name: s.agent_config_name || null,
    model_id: s.model_id || null,
    latest_message_id: s.latest_message_id || null,
    latest_message_role: s.latest_message_role || null,
    latest_message_content: s.latest_message_content || null,
    latest_message_timestamp: s.latest_message_timestamp || null,
    agent_cwd: s.agent_cwd || null,
    base_dir: s.base_dir || null,
    archived_at: s.archived_at || null,
  };
};
