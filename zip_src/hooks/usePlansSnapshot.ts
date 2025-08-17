import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/auth/SupabaseClient";
import { useAuth } from "@/auth/AuthContext";
import { Plan, PlansSnapshot } from "@/types/plans";

/**
 * Hook to fetch plans for given session IDs using direct Supabase query
 */
export const usePlansSnapshot = (sessionIds: string[]): PlansSnapshot => {
  const auth = useAuth();
  const user = auth?.user;
  const [plansBySession, setPlansBySession] = useState<Record<string, Plan>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!user?.id || sessionIds.length === 0) {
      setPlansBySession({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // console.log(`[plan] Fetching plans for ${sessionIds.length} sessions:`, sessionIds);

      const { data: plans, error: queryError } = await supabase
        .from("plans")
        .select(
          "id, session_id, title, status, markdown, current_version, created_at, updated_at"
        )
        .in("session_id", sessionIds);

      if (queryError) {
        // console.error('[plan] Query error:', queryError);
        setError(queryError.message);
        setPlansBySession({});
      } else if (plans) {
        // Convert array to session_id keyed object
        const plansMap = plans.reduce((acc, plan) => {
          acc[plan.session_id] = plan;
          return acc;
        }, {} as Record<string, Plan>);

        // console.log(`[plan] Fetched ${plans.length} plans:`, plans);
        // console.log(`[plan] Plans mapped by session_id:`, plansMap);
        setPlansBySession(plansMap);
      } else {
        // console.log('[plan] No plans returned from query');
        setPlansBySession({});
      }
    } catch (err) {
      console.error("[plan] Fetch exception:", err);
      setError("Failed to fetch plans");
      setPlansBySession({});
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, sessionIds]);

  // Fetch when sessionIds change
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plansBySession,
    isLoading,
    error,
    refetch: fetchPlans,
  };
};
