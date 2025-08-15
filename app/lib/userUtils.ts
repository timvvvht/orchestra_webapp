import { supabase } from '@/auth/SupabaseClient';

/**
 * Gets the current authenticated user ID from Supabase.
 * Throws an error if user is not authenticated, since Orchestra now requires auth.
 * @returns The authenticated user's ID
 * @throws Error if user is not authenticated
 */
export const getCurrentUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
  
  if (!user) {
    throw new Error('User not authenticated. Orchestra requires Google auth via Supabase.');
  }
  
  return user.id;
};

/**
 * Gets the current authenticated user ID synchronously from the current session.
 * Returns null if user is not authenticated.
 * @returns The authenticated user's ID or null
 */
export const getCurrentUserIdSync = (): string | null => {
  // Get the current session synchronously
  const session = supabase.auth.getSession();
  return session.data?.session?.user?.id || null;
};

/**
 * Ensures the user is authenticated and returns their ID.
 * Shows auth modal if user is not authenticated.
 * @returns The authenticated user's ID
 * @throws Error if user is not authenticated
 */
export const requireAuthenticatedUserId = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    // This should trigger the auth modal via the AuthContext
    throw new Error('Authentication required. Please log in with Google.');
  }
  return userId;
};