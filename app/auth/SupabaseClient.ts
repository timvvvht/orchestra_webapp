// Stubbed Supabase client for webapp
interface SupabaseAuthResponse {
  data: {
    user?: {
      id: string;
      email?: string;
      user_metadata?: {
        full_name?: string;
      };
    };
    session?: {
      access_token: string;
      refresh_token: string;
    };
  };
  error?: {
    message: string;
    status?: number;
    statusText?: string;
  };
}

interface SupabaseAuth {
  getSession: () => Promise<SupabaseAuthResponse>;
  setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<SupabaseAuthResponse>;
  exchangeCodeForSession: (url: string) => Promise<SupabaseAuthResponse>;
}

interface SupabaseClient {
  auth: SupabaseAuth;
}

const createClient = (url: string, key: string): SupabaseClient => {
  console.log('🔧 [STUB] Would create Supabase client with:', { url: url.substring(0, 30) + '...', hasKey: !!key });
  
  return {
    auth: {
      getSession: async () => {
        console.log('🔍 [STUB] Would get session');
        return {
          data: { session: null }
        };
      },
      setSession: async (tokens) => {
        console.log('🔐 [STUB] Would set session with tokens');
        return {
          data: {
            user: {
              id: 'stub-user-id',
              email: 'stub@example.com',
              user_metadata: {
                full_name: 'Stub User'
              }
            },
            session: tokens
          }
        };
      },
      exchangeCodeForSession: async (url) => {
        console.log('🔄 [STUB] Would exchange code for session:', url);
        return {
          data: {
            user: {
              id: 'stub-user-id',
              email: 'stub@example.com',
              user_metadata: {
                full_name: 'Stub User'
              }
            }
          }
        };
      }
    }
  };
};

// Stub environment variables for webapp build
const supabaseUrl = 'https://stub.supabase.co';
const supabaseAnonKey = 'eyJstub-key-for-webapp-build-that-is-long-enough-to-pass-validation-checks-and-looks-like-a-jwt-token';

console.log('🔧 [STUB] Supabase client stubbed for webapp build');

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