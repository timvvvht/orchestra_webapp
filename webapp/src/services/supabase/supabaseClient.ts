import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase'; // Assuming this is your generated DB types path

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error('CRITICAL: VITE_SUPABASE_URL is not set in your environment variables. Please check your .env file.');
}

if (!supabaseAnonKey) {
    throw new Error('CRITICAL: VITE_SUPABASE_ANON_KEY is not set in your environment variables. Please check your .env file.');
}

// Initialize and export the Supabase client
// The <Database> generic provides type safety for your Supabase interactions if types are generated
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Optional: Add a health check or utility functions if needed
// console.log('Supabase client initialized.'); // For debugging startup
// async function checkSupabaseConnection() {
//   try {
//     // Replace 'your_table_name' with a small, frequently accessed table if you have one.
//     // Or, if you don't have tables yet or prefer not to query, this check can be omitted.
//     const { error } = await supabase.from('agent_configs').select('id', { count: 'exact', head: true });
//     if (error) {
//       console.error('Supabase connection error during initial check:', error.message);
//     } else {
//       console.log('Successfully connected to Supabase and table check passed.');
//     }
//   } catch (e) {
//     console.error('Supabase client initialization or connection check error:', e);
//   }
// }
// checkSupabaseConnection(); // You might call this during app startup (e.g., in main.tsx)
