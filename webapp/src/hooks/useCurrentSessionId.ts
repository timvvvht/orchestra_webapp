import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { useMissionControlStore } from "@/stores/missionControlStore";

export const useCurrentSessionId = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get the most recent session from the store
  const getSortedSessions = useMissionControlStore(
    (state) => state.getSortedSessions
  );
  const sessions = getSortedSessions();
  const mostRecentSession = sessions[0]; // First session is most recent due to sortSessionsByActivity

  // Use URL sessionId if available, otherwise fall back to most recent session
  const sessionId = urlSessionId || mostRecentSession?.id || null;

  useEffect(() => {
    if (sessionId) {
      setLoading(false);
      setError(null);
    }
  }, [sessionId]);

  return {
    sessionId,
    loading,
    error,
    mostRecentSession: mostRecentSession || null,
  };
};
