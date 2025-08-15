import { listen } from '@tauri-apps/api/event';
// eslint-disable-next-line import/no-unresolved
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { supabase } from './SupabaseClient';
import { isTauri } from '@/lib/isTauri';
import { useEffect } from 'react';
import { toast } from 'sonner';

// Add this to window for manual testing
declare global {
    interface Window {
        testDeepLink: (url: string) => void;
    }
}

export const useDeepLinkAuth = () => {
    useEffect(() => {
        if (!isTauri()) return; // web build – skip

        console.log('🔗 [useDeepLinkAuth] Setting up deep-link listener for desktop OAuth');
        console.log('🔗 [useDeepLinkAuth] isTauri() check passed - we are in Tauri environment');

        const handleDeepLinkUrl = async (url: string) => {
            console.log('🔗 [useDeepLinkAuth] Processing deep-link URL:', url);
            console.log('🔗 [useDeepLinkAuth] Event payload type:', typeof url);
            console.log('🔗 [useDeepLinkAuth] Raw payload:', JSON.stringify(url));
            
            // VISUAL DEBUG: Show toast for any deep link received
            toast.info('🔗 Deep Link Received!', {
                description: `URL: ${url}`,
                duration: 10000
            });

            // Log all orchestra:// links
            if (url.includes('orchestra://')) {
                console.log('📣 [useDeepLinkAuth] Detected orchestra:// deep link:', url);

                // For non-OAuth deep links, log but don't process further
                if (!url.includes('orchestra://auth-callback') && !url.includes('access_token') && !url.includes('code=')) {
                    console.log('🔗 [useDeepLinkAuth] Ignoring non-OAuth deep link:', url);
                    return;
                }
            } else {
                console.log('🔗 [useDeepLinkAuth] Ignoring non-orchestra deep link:', url);
                return;
            }

            // Debug: Log the successful deep-link reception
            console.log('🎉 [useDeepLinkAuth] OAuth deep-link authentication flow initiated successfully');

            try {
                // Parse the URL to extract tokens
                const urlObj = new URL(url);

                console.log('🔗 [useDeepLinkAuth] URL parsing details:', {
                    originalUrl: url,
                    protocol: urlObj.protocol,
                    host: urlObj.host,
                    pathname: urlObj.pathname,
                    search: urlObj.search,
                    hash: urlObj.hash
                });

                // Try fragment first (hash) - typical for implicit flow
                let params = new URLSearchParams(urlObj.hash.substring(1));
                let accessToken = params.get('access_token');
                let refreshToken = params.get('refresh_token');

                // If no tokens in fragment, try query parameters - typical for authorization code flow
                if (!accessToken && !refreshToken) {
                    console.log('🔗 [useDeepLinkAuth] No tokens in fragment, trying query parameters');
                    params = new URLSearchParams(urlObj.search);
                    accessToken = params.get('access_token');
                    refreshToken = params.get('refresh_token');
                }

                console.log('🔗 [useDeepLinkAuth] Extracted tokens:', {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    accessTokenLength: accessToken?.length || 0,
                    refreshTokenLength: refreshToken?.length || 0
                });

                console.log('🔗 [useDeepLinkAuth] All URL parameters:', {
                    hashParams: Object.fromEntries(new URLSearchParams(urlObj.hash.substring(1))),
                    searchParams: Object.fromEntries(new URLSearchParams(urlObj.search))
                });

                if (accessToken && refreshToken) {
                    // Set the session directly with the tokens
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (error) {
                        console.error('❌ [useDeepLinkAuth] Failed to set session:', error);
                        console.error('❌ [useDeepLinkAuth] Error details:', {
                            message: error.message,
                            status: error.status,
                            statusText: error.statusText
                        });
                        toast.error('Login failed', {
                            description: `Failed to complete Google authentication: ${error.message}`
                        });
                    } else {
                        console.log('✅ [useDeepLinkAuth] Successfully set session:', data);
                        console.log('✅ [useDeepLinkAuth] User details:', {
                            id: data.user?.id,
                            email: data.user?.email,
                            fullName: data.user?.user_metadata?.full_name
                        });
                        const userName = data.user?.user_metadata?.full_name || data.user?.email || 'User';
                        toast.success('🎉 LOGIN SUCCESS!', {
                            description: `Welcome back, ${userName}! Authentication completed.`,
                            duration: 8000
                        });
                    }
                } else {
                    // Fallback: try exchangeCodeForSession for authorization code flow
                    console.log('🔗 [useDeepLinkAuth] Attempting code exchange for session with URL:', url);
                    const { data, error } = await supabase.auth.exchangeCodeForSession(url);
                    if (error) {
                        console.error('❌ [useDeepLinkAuth] Failed to exchange code for session:', error);
                        console.error('❌ [useDeepLinkAuth] Code exchange error details:', {
                            message: error.message,
                            status: error.status,
                            statusText: error.statusText
                        });
                        toast.error('Login failed', {
                            description: `Failed to complete Google authentication: ${error.message}`
                        });
                    } else {
                        console.log('✅ [useDeepLinkAuth] Successfully exchanged code for session:', data);
                        console.log('✅ [useDeepLinkAuth] User details from code exchange:', {
                            id: data.user?.id,
                            email: data.user?.email,
                            fullName: data.user?.user_metadata?.full_name
                        });
                        const userName = data.user?.user_metadata?.full_name || data.user?.email || 'User';
                        toast.success('🎉 LOGIN SUCCESS!', {
                            description: `Welcome back, ${userName}! Authentication completed.`,
                            duration: 8000
                        });
                    }
                }
            } catch (error) {
                console.error('❌ [useDeepLinkAuth] Failed to process OAuth callback:', error);
                console.error('❌ [useDeepLinkAuth] Error details:', error);
                toast.error('Login failed', {
                    description: 'An unexpected error occurred during authentication. Please try again.'
                });
            }
        };

        const setupListener = async () => {
            try {
                console.log('🔗 [useDeepLinkAuth] Setting up SIMPLE FALLBACK deep-link listeners...');

                // SIMPLE FALLBACK: Use onOpenUrl directly from frontend (bypasses backend issues)
                const unlistenOnOpenUrl = await onOpenUrl(async (urls) => {
                    console.log('🔗 [SIMPLE FALLBACK] Received deep link URLs via onOpenUrl:', urls);
                    if (urls && urls.length > 0) {
                        const url = urls[0];
                        console.log('🔗 [SIMPLE FALLBACK] Processing URL:', url);
                        
                        // VISUAL DEBUG: Show that we received the deep link
                        toast.success('🔗 SIMPLE FALLBACK WORKED!', {
                            description: `Received: ${url}`,
                            duration: 10000
                        });
                        
                        // Handle the URL directly
                        await handleDeepLinkUrl(url);
                    }
                });

                // 1. Check for initial deep link when app starts (non-running scenario)
                try {
                    const initialUrls = await getCurrent();
                    if (initialUrls && initialUrls.length > 0) {
                        console.log('🔗 [useDeepLinkAuth] App started with initial deep link(s):', initialUrls);
                        toast.success('🔗 Initial Deep Link Found!', {
                            description: `Found: ${initialUrls[0]}`,
                            duration: 10000
                        });
                        await handleDeepLinkUrl(initialUrls[0]);
                    }
                } catch (err) {
                    console.warn('🔗 [useDeepLinkAuth] Failed to get initial deep link URLs:', err);
                }

                // 2. Failsafe: Listen for custom events emitted from Rust backend (if they work)
                const unlistenDeepLinkReceived = await listen<string>('deep-link-received', async ({ payload: url }) => {
                    console.log('🔗 [useDeepLinkAuth] Received "deep-link-received" event (backend fallback):', url);
                    await handleDeepLinkUrl(url);
                });

                const unlistenOAuthCallback = await listen<string>('oauth-callback', async ({ payload: url }) => {
                    console.log('🔗 [useDeepLinkAuth] Received "oauth-callback" event (backend fallback):', url);
                    await handleDeepLinkUrl(url);
                });

                const unlistenDeepLink = await listen<string>('deep-link', async ({ payload: url }) => {
                    console.log('🔗 [useDeepLinkAuth] Received "deep-link" event (backend fallback):', url);
                    await handleDeepLinkUrl(url);
                });

                console.log('✅ [useDeepLinkAuth] SIMPLE FALLBACK listeners registered successfully');
                
                // VISUAL DEBUG: Show that listeners are ready
                toast.success('🔗 SIMPLE FALLBACK Ready!', {
                    description: 'Using direct onOpenUrl approach',
                    duration: 5000
                });

                // Return cleanup function for all listeners
                return () => {
                    unlistenOnOpenUrl();
                    unlistenDeepLinkReceived();
                    unlistenOAuthCallback();
                    unlistenDeepLink();
                };
            } catch (error) {
                console.error('❌ [useDeepLinkAuth] Failed to setup SIMPLE FALLBACK listeners:', error);
                return () => {}; // Return no-op function
            }
        };

        let unlistenPromise: Promise<() => void> | null = null;

        setupListener()
            .then(unlisten => {
                unlistenPromise = Promise.resolve(unlisten);
            })
            .catch(error => {
                console.error('❌ [useDeepLinkAuth] Failed to setup deep-link listener:', error);
            });

        // Add manual test function to window for debugging
        if (typeof window !== 'undefined') {
            window.testDeepLink = (url: string) => {
                console.log('🧪 [Manual Test] Testing deep link:', url);
                handleDeepLinkUrl(url);
            };
        }

        return () => {
            if (unlistenPromise) {
                unlistenPromise.then(unlisten => unlisten()).catch(console.error);
            }
        };
    }, []);
};
