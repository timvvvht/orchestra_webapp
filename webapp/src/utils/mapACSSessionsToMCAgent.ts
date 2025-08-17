import { SessionSummary } from "@/services/acs";
import { MissionControlAgent } from "@/stores/missionControlStore";

export const mapACSSessionsToMCAgent = (
  s: SessionSummary
): MissionControlAgent => {
  return {
    id: s.id,
    mission_title: s.name || "Untitled Chat",
    status: "active",
    last_message_at: s.last_message_at || s.created_at || null,
    created_at: s.created_at || new Date().toISOString(),
    agent_config_name: s.agent_config_name || null,
    model_id: s.model_id || null,
    latest_message_id: null,
    latest_message_role: null,
    latest_message_content: null,
    latest_message_timestamp: null,
    agent_cwd: s.agent_cwd || null,
    base_dir: s.base_dir || null,
    archived_at: null,
  };
};
