import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/auth/SupabaseClient';
import { useAuth } from '@/auth/AuthContext';
import { MissionControlAgent } from '@/stores/missionControlStore';

export type SessionsFilter = 'active' | 'archived';

interface UseSessionsSnapshotReturn {
  sessions: MissionControlAgent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSessionsSnapshot = (filter: SessionsFilter = 'active'): UseSessionsSnapshotReturn => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MissionControlAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_mission_control_data', {
        user_id_param: user.id,
        status_filter: filter
      });

      if (rpcError) {
        console.error('[useSessionsSnapshot] RPC error:', rpcError);
        setError(rpcError.message);
        setSessions([]);
      } else if (data) {
        setSessions(data);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('[useSessionsSnapshot] Fetch exception:', err);
      setError('Failed to fetch sessions');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filter]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions
  };
};