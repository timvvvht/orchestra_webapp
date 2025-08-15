import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    console.log("🔍 Testing Supabase connection...");
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Connection test failed:", error.message);
      return false;
    }

    console.log("✅ Connection test successful");
    return true;
  } catch (err) {
    console.error("❌ Connection test error:", err);
    return false;
  }
};
