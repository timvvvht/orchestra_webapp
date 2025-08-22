import { supabase } from './SupabaseClient';

// Simple config for the exchange endpoint
const getBaseUrl = () => {
    const baseUrl = import.meta.env.VITE_ACS_BASE_URL || 'https://orchestra-acs.fly.dev';
    console.log('🔧 [exchangeSupabaseSession] Using ACS Base URL:', baseUrl);
    console.log('🔧 [exchangeSupabaseSession] Environment variables:', {
        VITE_ACS_BASE_URL: import.meta.env.VITE_ACS_BASE_URL,
        MODE: import.meta.env.MODE,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD
    });
    return baseUrl;
};

export async function exchangeSupabaseSession() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession();
    if (error || !session) throw new Error('No Supabase session');

    const res = await fetch(`${getBaseUrl()}/api/v1/auth/oauth/exchange`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            provider: 'supabase',
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: {
                id: session.user.id,
                email: session.user.email
                // Removed extra fields that cause 422 errors:
                // - name, avatar, provider are not expected by ACS endpoint
            }
        })
    });

    if (!res.ok) throw new Error('ACS exchange failed');
    return (await res.json()).user;
}
