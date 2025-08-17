import { supabase } from '@/auth/SupabaseClient';
import { ComponentType, SVGProps, useState } from 'react';
import type { Provider } from '@supabase/supabase-js';

// Define our supported providers
type SupportedProvider = 'google' | 'github';

interface ProviderMeta {
  /** human-readable */
  label: string;
  /** Hero/icon component */
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// Extract Google Icon into a separate named component for Fast Refresh compatibility
const GoogleIcon: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Extract GitHub Icon into a separate named component for Fast Refresh compatibility
const GitHubIcon: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path
      d="M12 0C5.371 0 0 5.371 0 12c0 5.303 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.011-1.04-.016-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.386-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.997.108-.776.419-1.305.762-1.605-2.665-.303-5.466-1.333-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.655 1.653.243 2.874.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.804 5.625-5.475 5.921.43.369.823 1.096.823 2.209 0 1.594-.015 2.877-.015 3.268 0 .319.216.694.825.576C20.565 21.795 24 17.297 24 12c0-6.629-5.371-12-12-12z"
    />
  </svg>
);

export const providerMeta: Record<SupportedProvider, ProviderMeta> = {
  google: {
    label: 'Google',
    Icon: GoogleIcon, // Reference the named component
  },
  github: {
    label: 'GitHub',
    Icon: GitHubIcon, // Reference the named component
  },
};

interface Props {
  provider: SupportedProvider;
  onSuccess?: () => void;
}

export const OAuthButton: React.FC<Props> = ({ provider, onSuccess }) => {
  const meta = providerMeta[provider];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('🔐 [OAuthButton] Rendering button for provider:', provider);

  const signIn = async () => {
    console.log('🚀 [OAuthButton] Sign in clicked for provider:', provider);
    console.log('🌐 [OAuthButton] Current origin:', window.location.origin);
    console.log('🔑 [OAuthButton] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('🔑 [OAuthButton] Supabase anon key present?:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    console.log('🛠  [OAuthButton] Supabase client instance:', supabase);
    setLoading(true);
    setError(null);
    
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.log('🔗 [OAuthButton] Attempting signInWithOAuth with provider:', provider, 'and redirectTo:', redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ [OAuthButton] Supabase OAuth error:', error);
        throw error;
      }

      console.log('✅ [OAuthButton] OAuth initiated successfully, data:', data);
      console.log('🔄 [OAuthButton] Redirecting to', provider, 'for authentication...');
      // User will be redirected to Google, then back to /auth/callback
    } catch (err) {
      console.error(`❌ [OAuthButton] Error signing in with ${provider}:`, err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        console.log('👆 [OAuthButton] Button clicked for provider:', provider);
        signIn();
      }}
      className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 hover:bg-gray-50"
      disabled={loading}
    >
      {loading ? (
        <span className="animate-pulse">Redirecting…</span>
      ) : (
        <>
          <meta.Icon width={20} height={20} />
          Sign in with {meta.label}
        </>
      )}
      {error && <span className="text-red-500 text-xs ml-1">{error}</span>}
    </button>
  );
};

export default OAuthButton;