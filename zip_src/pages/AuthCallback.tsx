import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { exchangeSupabaseSession } from '@/auth/exchangeSupabaseSession';
import { supabase } from '@/auth/SupabaseClient';

export default function AuthCallback() {
  const { booted, user } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    if (!booted) return;

    const handleAuthCallback = async () => {
      // Prevent multiple attempts
      if (exchangeAttempted.current) {
        console.log('Auth callback already attempted, skipping...');
        return;
      }
      
      exchangeAttempted.current = true;

      try {
        // Check for email confirmation parameters first
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (tokenHash && type) {
          console.log('🔄 [AuthCallback] Processing email confirmation...', { type });
          
          // Handle email confirmation
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any, // Cast to handle EmailOtpType
          });

          if (error) {
            console.error('❌ [AuthCallback] Email confirmation error:', error);
            // Redirect to home page - the auth modal will show and display the error
            nav('/', { replace: true });
            return;
          }

          if (data.session) {
            console.log('✅ [AuthCallback] Email confirmed and user logged in:', data.session.user.email);
            
            // Attempt ACS exchange for email-confirmed users too
            try {
              await exchangeSupabaseSession();
              console.log('✅ [AuthCallback] ACS exchange successful after email confirmation');
            } catch (exchangeError) {
              console.warn('⚠️ [AuthCallback] ACS exchange failed after email confirmation:', exchangeError);
              // Continue anyway - user is still authenticated with Supabase
            }
            
            nav('/', { replace: true });
            return;
          } else {
            console.log('✅ [AuthCallback] Email confirmed but no session returned');
            nav('/', { replace: true });
            return;
          }
        }

        // Handle OAuth callback (existing logic)
        if (user) {
          console.log('🔄 [AuthCallback] Processing OAuth exchange...');
          
          await exchangeSupabaseSession();
          console.log('✅ [AuthCallback] OAuth exchange successful');
          nav('/', { replace: true });
        } else {
          console.log('⚠️ [AuthCallback] No user session found and no email confirmation parameters');
          nav('/', { replace: true });
        }

      } catch (error) {
        console.error('❌ [AuthCallback] Unexpected error during auth callback:', error);
        exchangeAttempted.current = false; // Reset flag on error
        nav('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [booted, user, nav, searchParams]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/60 text-sm">Finishing authentication…</p>
      </div>
    </div>
  );
}