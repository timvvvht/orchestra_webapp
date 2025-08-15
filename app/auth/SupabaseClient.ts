import { createClient } from '@supabase/supabase-js';

// Validate Supabase environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 [SupabaseClient] Initializing with:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0
});

// Assert that required environment variables are present
if (!supabaseUrl) {
  console.error('❌ [SupabaseClient] FATAL: VITE_SUPABASE_URL is not set!');
  console.error('Please add VITE_SUPABASE_URL to your .env file');
  throw new Error('VITE_SUPABASE_URL is required but not set');
}

if (!supabaseAnonKey) {
  console.error('❌ [SupabaseClient] FATAL: VITE_SUPABASE_ANON_KEY is not set!');
  console.error('Please add VITE_SUPABASE_ANON_KEY to your .env file');
  throw new Error('VITE_SUPABASE_ANON_KEY is required but not set');
}

// Basic validation of URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('❌ [SupabaseClient] FATAL: VITE_SUPABASE_URL appears to be invalid!');
  console.error('Expected format: https://your-project.supabase.co');
  console.error('Received:', supabaseUrl);
  throw new Error('VITE_SUPABASE_URL appears to be invalid');
}

// Basic validation of anon key format (should be a JWT)
if (!supabaseAnonKey.startsWith('eyJ') || supabaseAnonKey.length < 100) {
  console.error('❌ [SupabaseClient] FATAL: VITE_SUPABASE_ANON_KEY appears to be invalid!');
  console.error('Expected: JWT token starting with "eyJ" and at least 100 characters');
  console.error('Received length:', supabaseAnonKey.length);
  console.error('Starts with eyJ:', supabaseAnonKey.startsWith('eyJ'));
  throw new Error('VITE_SUPABASE_ANON_KEY appears to be invalid');
}

console.log('✅ [SupabaseClient] Environment variables validated successfully');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test Supabase connection on initialization
export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 [SupabaseClient] Testing connection...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ [SupabaseClient] Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ [SupabaseClient] Connection test successful');
    console.log('📊 [SupabaseClient] Current session:', data.session ? 'Active' : 'None');
    return true;
  } catch (err) {
    console.error('❌ [SupabaseClient] Connection test error:', err);
    return false;
  }
};

// Auto-test connection in development
if (import.meta.env.DEV) {
  testSupabaseConnection().then(success => {
    if (!success) {
      console.warn('⚠️ [SupabaseClient] Connection test failed - check your Supabase configuration');
    }
  });
}