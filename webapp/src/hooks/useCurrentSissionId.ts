import { useEffect, useMemo, useState } from "react";
import { getAllChatSessions } from "@/services/supabase/chatService";

/**
 * Selects the most recent session for the current user.
 * Recency = highest lastUpdated (falls back to createdAt if missing).
 */
export function useCurrentSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllChatSessions()
      .then((sessions) => {
        if (cancelled) return;
        if (!sessions || sessions.length === 0) {
          setSessionId(null);
          setLoading(false);
          return;
        }
        // sessions already returned ordered by last_message_at DESC in chatService
        setSessionId(sessions[0].id);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({ sessionId, loading, error }),
    [sessionId, loading, error]
  );
}

export default useCurrentSessionId;
