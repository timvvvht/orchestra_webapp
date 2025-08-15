// Type extensions for Supabase Auth Client
import { SupabaseClient } from '@supabase/supabase-js';

// Add getSessionFromUrl() method to the Supabase Auth Client
// This method is available in Supabase JS v2.50.0 and above
declare module '@supabase/supabase-js' {
  interface SupabaseAuthClient {
    /**
     * Get the session from the URL.
     * This is used to handle OAuth callbacks and recover sessions from URLs.
     * Available in Supabase JS v2.50.0 and above.
     */
    getSessionFromUrl(): Promise<{
      data: {
        session: any | null;
      };
      error: any | null;
    }>;
  }
}
