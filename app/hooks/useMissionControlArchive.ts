import { useCallback } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/auth/SupabaseClient';
import { toast } from 'sonner';
import { useMissionControlStore } from '@/stores/missionControlStore';

/**
 * Hook for archiving and unarchiving sessions in Mission Control
 * Provides functions to archive/unarchive sessions and automatically refresh the UI
 */
export const useMissionControlArchive = () => {
  const { user } = useAuth();
  const { sessionRefetchCallback } = useMissionControlStore();

  const archiveSession = useCallback(async (sessionId: string) => {
    if (!user?.id) {
      toast.error('Authentication required');
      return false;
    }

    try {
      console.log(`[useMissionControlArchive] Archiving session ${sessionId}`);
      
      const { data, error } = await supabase.rpc('archive_session', {
        session_id_param: sessionId,
        user_id_param: user.id
      });

      if (error) {
        console.error('Archive session error:', error);
        toast.error('Failed to archive session');
        return false;
      }

      console.log(`[useMissionControlArchive] Session ${sessionId} archived successfully`);
      toast.success('Session archived');
      
      // Trigger UI refresh if callback is available
      if (sessionRefetchCallback) {
        console.log('[useMissionControlArchive] Triggering session refresh after archive');
        await sessionRefetchCallback();
      }
      
      return true;
    } catch (err) {
      console.error('Archive session exception:', err);
      toast.error('Failed to archive session');
      return false;
    }
  }, [user?.id, sessionRefetchCallback]);

  const unarchiveSession = useCallback(async (sessionId: string) => {
    if (!user?.id) {
      toast.error('Authentication required');
      return false;
    }

    try {
      console.log(`[useMissionControlArchive] Unarchiving session ${sessionId}`);
      
      const { data, error } = await supabase.rpc('unarchive_session', {
        session_id_param: sessionId,
        user_id_param: user.id
      });

      if (error) {
        console.error('Unarchive session error:', error);
        toast.error('Failed to restore session');
        return false;
      }

      console.log(`[useMissionControlArchive] Session ${sessionId} unarchived successfully`);
      toast.success('Session restored');
      
      // Trigger UI refresh if callback is available
      if (sessionRefetchCallback) {
        console.log('[useMissionControlArchive] Triggering session refresh after unarchive');
        await sessionRefetchCallback();
      }
      
      return true;
    } catch (err) {
      console.error('Unarchive session exception:', err);
      toast.error('Failed to restore session');
      return false;
    }
  }, [user?.id, sessionRefetchCallback]);

  return {
    archiveSession,
    unarchiveSession
  };
};