import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    "[SupabaseClient] FATAL ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Supabase client not initialized. OAuth will not work.";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Create the real Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test Supabase connection on initialization
export const testSupabaseConnection = async () => {
  try {
    console.log("🔍 [SupabaseClient] Testing connection...");
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error(
        "❌ [SupabaseClient] Connection test failed:",
        error.message
      );
      return false;
    }

    console.log("✅ [SupabaseClient] Connection test successful");
    console.log(
      "📊 [SupabaseClient] Current session:",
      data.session ? "Active" : "None"
    );
    return true;
  } catch (err) {
    console.error("❌ [SupabaseClient] Connection test error:", err);
    return false;
  }
};

// Auto-test connection in development
if (import.meta.env.DEV) {
  testSupabaseConnection().then((success) => {
    if (!success) {
      console.warn(
        "⚠️ [SupabaseClient] Connection test failed - check your Supabase configuration"
      );
    }
  });
}
