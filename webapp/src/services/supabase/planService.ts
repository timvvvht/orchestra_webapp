import { supabase } from './supabaseClient';
import { PlanRow } from '@/types/planTypes';

/**
 * Fetches all plans for a given session_id, ordered by updated_at descending
 * @param sessionId - The session ID to filter plans by
 * @returns Promise<PlanRow[]> - Array of plan rows
 * @throws Error if the query fails
 */
export async function getPlansBySession(sessionId: string): Promise<PlanRow[]> {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch plans for session ${sessionId}: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unexpected error fetching plans for session ${sessionId}: ${String(err)}`);
  }
}