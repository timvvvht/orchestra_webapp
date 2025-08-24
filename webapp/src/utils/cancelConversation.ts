/**
 * Simple utility to cancel a conversation via direct API call
 * No layers of abstraction - just a POST request to /acs/converse/cancel
 */

import { getDefaultACSClient } from "@/services/acs";
import { useSessionStatusStore } from "@/stores/sessionStatusStore";

export async function cancelConversation(sessionId: string): Promise<void> {
  console.log(
    "🚫 [CANCEL-UTIL] Starting conversation cancellation for session:",
    sessionId
  );

  if (!sessionId) {
    console.error("🚫 [CANCEL-UTIL] ❌ No session ID provided");
    throw new Error("Session ID is required to cancel conversation");
  }

  try {
    // Get the ACS client (has auth token and base URL configured)
    const acsClient = getDefaultACSClient();
    const httpClient = acsClient.getClient();

    console.log(
      "🚫 [CANCEL-UTIL] 📡 Making POST request to /acs/converse/cancel"
    );
    console.log("🚫 [CANCEL-UTIL] 📤 Request payload:", {
      session_id: sessionId,
    });

    // Make the direct POST request
    const response = await httpClient.post("/acs/converse/cancel", {
      session_id: sessionId,
    });

    console.log("🚫 [CANCEL-UTIL] ✅ SUCCESS! Conversation cancelled:", {
      sessionId,
      status: response.status,
      response: response.data,
      timestamp: new Date().toISOString(),
    });

    // Set up fallback timeout - if no server update within 3s, mark idle
    setTimeout(() => {
      const currentStatus = useSessionStatusStore
        .getState()
        .getStatus(sessionId);
      if (currentStatus.state === "cancelling") {
        console.log(
          "🚫 [CANCEL-UTIL] Fallback: No server update after cancel, marking idle"
        );
        useSessionStatusStore.getState().markIdle(sessionId, "cancel_fallback");
      }
    }, 3000);
  } catch (error) {
    console.error("🚫 [CANCEL-UTIL] ❌ FAILED to cancel conversation:", {
      sessionId,
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : "No stack trace",
      timestamp: new Date().toISOString(),
    });

    // Mark session as error on cancel failure
    useSessionStatusStore.getState().markError(sessionId, "cancel_error");

    // Re-throw with a user-friendly message
    throw new Error(
      `Failed to cancel conversation: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
