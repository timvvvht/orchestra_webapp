import { createClient, User, Session } from '@supabase/supabase-js';

/**
 * Centralised Supabase browser client for Orchestra
 *
 * Uses Vite env vars (import.meta.env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
    const errorMessage = '[supabaseClient] FATAL ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Supabase client not initialized. OAuth will not work.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Re-export common types for convenience
export type SupabaseUser = User;
export type SupabaseSession = Session;
