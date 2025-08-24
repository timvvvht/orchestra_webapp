import { useEffect, useMemo, useState } from "react";
import { getDefaultACSClient } from "@/services/acs";
import { useAgentConfigs } from "@/hooks/useAgentConfigs";

export interface SlashCommand {
  command: string;
  agent_config_name: string;
  description?: string | null;
  source: "server" | "agent";
}

/**
 * useSlashCommands
 * - Fetches curated server slash commands
 * - Merges with agent configs (as '/{agentName}')
 * - Provides filtered suggestions for a given query
 */
export function useSlashCommands() {
  const acsClient = getDefaultACSClient();
  const { agentConfigsArray } = useAgentConfigs();

  const [serverCommands, setServerCommands] = useState<SlashCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const resp = await acsClient.core.getSlashCommands();
        if (cancelled) return;
        if (resp?.data?.success) {
          console.log("[slashHook]", resp.data);
          setServerCommands(
            resp.data.commands.map((c: any) => ({
              ...c,
              source: "server" as const,
            }))
          );
        } else {
          setServerCommands([]);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to fetch slash commands");
        setServerCommands([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [acsClient]);

  // Build agent-derived slash commands (e.g., '/planner')
  const agentCommands = useMemo<SlashCommand[]>(() => {
    return (agentConfigsArray || []).map((cfg: any) => {
      const base = (cfg?.agent?.name || cfg?.name || "agent").toLowerCase();
      return {
        command: `/${base}`,
        agent_config_name:
          cfg?.agent?.name || cfg?.name || cfg?.id || "general",
        description: cfg?.description || null,
        source: "agent" as const,
      };
    });
  }, [agentConfigsArray]);

  const all = useMemo<SlashCommand[]>(() => {
    // Deduplicate by command (server wins)
    const map = new Map<string, SlashCommand>();
    for (const c of agentCommands) map.set(c.command, c);
    for (const c of serverCommands) map.set(c.command, c);
    return Array.from(map.values()).sort((a, b) =>
      a.command.localeCompare(b.command)
    );
  }, [serverCommands, agentCommands]);

  const filter = (rawQuery: string): SlashCommand[] => {
    const q = rawQuery.trim().toLowerCase();
    if (!q.startsWith("/")) return [];
    return all.filter((c) => c.command.toLowerCase().startsWith(q));
  };

  return {
    loading,
    error,
    all,
    filter,
  };
}
