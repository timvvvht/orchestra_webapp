import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/auth/SupabaseClient';

const ANONYMOUS_USER_ID_KEY = 'anonymousUserId';
let currentAnonymousUserId: string | null = null;

/**
 * Ensures the anonymous user record exists in the Supabase 'users' table.
 * Called internally by getOrSetAnonymousUserId when a new ID is generated.
 */
const ensureAnonymousUserInDb = async (userId: string) => {
  try {
    // Upsert ensures the record is created if it doesn't exist,
    // and does nothing (or updates if you add more fields) if it does.
    const { error } = await supabase
      .from('users')
      .upsert({ id: userId, created_at: new Date().toISOString() }, { onConflict: 'id' });

    if (error) {
      console.error('[authUtils] Error ensuring anonymous user in DB:', error);
      // Depending on how critical this is, you might want to throw the error
      // or handle it more gracefully (e.g., allow app to continue but log persistently).
      // For MVP, logging might be sufficient if the main goal is just to have an ID.
    } else {
      console.log('[authUtils] Anonymous user record ensured/verified in DB:', userId);
    }
  } catch (e) {
    console.error('[authUtils] Exception during ensureAnonymousUserInDb:', e);
  }
};

/**
 * Retrieves the anonymous user ID from localStorage.
 * If not found, generates a new one, stores it, attempts to ensure it in the DB, and returns it.
 * This function also ensures that once an ID is fetched or generated in the app's lifecycle,
 * the same ID is returned for subsequent calls within that browser session, reducing localStorage access.
 */
export const getOrSetAnonymousUserId = (): string => {
    if (currentAnonymousUserId) {
        return currentAnonymousUserId;
    }

    let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
    if (!userId) {
        userId = uuidv4();
        localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);
        console.log('[authUtils] New anonymous user ID generated and stored in localStorage:', userId);
        // Ensure this new user exists in the DB.
        // This is an async operation but the function itself is sync to return the ID immediately.
        // The DB operation happens in the background.
        ensureAnonymousUserInDb(userId);
    } else {
        console.log('[authUtils] Retrieved anonymous user ID from localStorage:', userId);
        // Optionally, you could also call ensureAnonymousUserInDb(userId) here
        // to ensure consistency if the DB record was somehow deleted but localStorage persists.
        // For MVP, this might be overkill if the ID is primarily client-driven for now.
    }
    currentAnonymousUserId = userId;
    return userId;
};

/**
 * Gets the current anonymous user ID that has been initialized by getOrSetAnonymousUserId.
 * @returns The current anonymous user ID, or null if getOrSetAnonymousUserId has not been called.
 */
export const getCurrentAnonymousUserId = (): string | null => {
    if (!currentAnonymousUserId) {
        // This case should ideally not be hit if getOrSetAnonymousUserId is called early in app init.
        console.warn('[authUtils] getCurrentAnonymousUserId called before getOrSetAnonymousUserId. Attempting to initialize now.');
        // Attempt to initialize if called prematurely, though synchronous return might still be null if localStorage is slow/first time.
        // For robustness, ensure getOrSetAnonymousUserId is called at app startup.
        return getOrSetAnonymousUserId(); 
    }
    return currentAnonymousUserId;
};
