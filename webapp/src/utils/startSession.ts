// app/utils/startSession.ts
import { supabase } from "@/services/supabase/client"; // adjust to your actual client import
import { getCurrentUserId } from "@/services/supabase/authService"; // if you have a helper
import { buildSessionMetadata } from "@/utils/buildSessionMetadata"; // ensure this constructs display fields
import { ACSClient } from "@/services/acs";

export async function startSession(...) {
  // 1) Create ACS session
  const createRes = await ACSClient.sessions.createSession({
    name,
    agent_config_id,
    origin: 'web', // Explicit origin for webapp
    // ...other fields
  });
  const realSessionId = createRes.data.id;

  // 2) Optionally update session in ACS (agent_cwd etc.)
  if (worktreeResult?.workspace_path) {
    await acsClient.sessions.updateSession(realSessionId, { agent_cwd: worktreeResult.workspace_path });
  }

  // 3) Insert into Supabase chat_sessions if not exists
  try {
    const currentUserId = await getCurrentUserId(); // or derived from supabase.auth.getUser()
    const metadata = buildSessionMetadata({
      id: realSessionId,
      name,
      // include agent_config_id, base_dir, any display fields
    });

    const insertData = {
      id: realSessionId,
      user_id: currentUserId,
      display_title: metadata.display_title || name || "Untitled",
      last_message_at: new Date().toISOString(),
      agent_config_id,
      // any other columns your schema expects (check app/types/supabase.ts & schema.ts)
    };

    const { error } = await supabase
      .from("chat_sessions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[startSession] Failed to upsert chat_sessions:", error);
    }
  } catch (e) {
    console.error("[startSession] Error ensuring chat_sessions entry:", e);
  }

  // 4) Optionally hydrate so it appears immediately in the event store
  try {
    await hydrateSession(realSessionId); // from app/stores/eventBridges/historyBridge.ts
  } catch (e) {
    console.warn("[startSession] Hydration failed (may have no messages yet):", e);
  }

  return realSessionId;
}