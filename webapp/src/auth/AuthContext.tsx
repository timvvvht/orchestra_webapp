import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import React from "react";
import SecureAuthModal from "@/components/auth/SecureAuthModal";
import type { AuthResult } from "@/types/auth/AuthResult";
import { supabase } from "./SupabaseClient";
import { getDefaultACSClient } from "@/services/acs";
import { getSupabaseAccessToken } from "@/utils/getSupabaseAccessToken";

import { isTauri } from "@/lib/isTauri";
import { useDeepLinkAuth } from "./useDeepLinkAuth";

import { notifyAuthChange } from "@/services/GlobalServiceManager";

import { SignOutButton } from "@/components/SignOutButton";

type AuthCtx = {
  user: any | null;
  isAuthenticated: boolean;
  booted: boolean;
  showModal: boolean;
  setShowModal(v: boolean): void;
  loginGitHub(): Promise<AuthResult>;
  loginGoogle(): Promise<AuthResult>;
  loginEmailPassword(email: string, password: string): Promise<AuthResult>;
  signUpEmailPassword(email: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
};

const Ctx = createContext<AuthCtx>(null!);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log("🔍 [AuthProvider] Component rendering");
  const [user, setUser] = useState<any | null>(null);

  /* ────────────────────────────────
   *   debounce ACS cookie exchange
   * ──────────────────────────────── */
  const lastExchangedTokenRef = useRef<string | null>(null); // token we already exchanged
  const exchangeInFlightRef = useRef<Promise<void> | null>(null);
  const [booted, setBooted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Setup deep-link listener for desktop OAuth
  console.log("🔍 [AuthProvider] Setting up deep-link auth hook");
  useDeepLinkAuth();
  console.log("🔍 [AuthProvider] Deep-link auth hook setup complete");

  // Helper function to exchange Supabase session for ACS cookies
  const exchangeSupabaseSessionForACSCookies = useCallback(
    async (session: any) => {
      try {
        console.log(
          "[Auth] Attempting ACS cookie exchange with session for user:",
          session.user?.email
        );
        const acsClient = getDefaultACSClient();
        const response = await acsClient
          .getClient()
          .exchangeTokenWithACS(session);
        console.log("[Auth] ACS cookie exchange successful:", response);
      } catch (error) {
        console.warn("[Auth] ACS cookie exchange failed:", error);
        // Don't throw - graceful degradation to Bearer token auth
      }
    },
    []
  );

  useEffect(() => {
    console.log("🚀 [AuthContext] Initializing auth context...");

    const acsClient = getDefaultACSClient(); // Define once for the whole useEffect
    // Immediate seeding to prevent first-render race condition
    const seedToken = async () => {
      // console.log('🌱 [AuthContext] Starting immediate token seeding...');
      try {
        const { data } = await supabase.auth.getSession(); // data.session is what we need

        if (data.session) {
          const { token: accessToken } = getSupabaseAccessToken(data.session);
          if (accessToken) {
            const current = acsClient.getAuthToken();
            if (current !== accessToken) {
              console.log("🔑 [AuthContext] Initial seed token (filtered):", {
                len: accessToken.length,
                start: accessToken.substring(0, 50) + "...",
              });
              acsClient.setAuthToken(accessToken);

              // ✅ CRITICAL: Establish firehose connection
              // This must happen at app level to persist across navigation
              try {
                acsClient.streaming.connectPrivate(
                  data.session.user.id,
                  accessToken
                );
                console.log(
                  "🔥 [AuthContext] Initial firehose connection established"
                );
              } catch (error) {
                console.error(
                  "❌ [AuthContext] Failed to establish initial firehose connection:",
                  error
                );
              }

              // 🔌 Start SSE relay for authenticated user
              console.log(
                "[DEBUG notifyAuthChange] authenticated",
                data.session.user.id
              );
              notifyAuthChange(data.session.user.id);
            }
          }
          setUser(data.session.user); // Set user if session exists

          // Attempt ACS cookie exchange on initial session seeding
          await exchangeSupabaseSessionForACSCookies(data.session);
        } else {
          // console.log('🌱 [AuthContext] No initial Supabase session found during seeding.');
          // If there's no session, ensure user is null and ACS token is clear.
          // Though onAuthStateChange might also handle this, being explicit here is safe.
          acsClient.clearAuthToken();
          setUser(null);

          // 🔌 Start SSE relay for single-player mode when no authenticated user
          console.log(
            "[DEBUG notifyAuthChange] seeding with single-player-user"
          );
          console.log(
            "🔌 [AuthContext] Starting SSE relay for single-player mode"
          );
          notifyAuthChange("single-player-user");
        }
      } catch (error) {
        console.error("❌ [AuthContext] Error during token seeding:", error);
        // Ensure clean state on error
        acsClient.clearAuthToken();
        setUser(null);

        // 🔌 Start SSE relay for single-player mode even on error
        console.log(
          "[DEBUG notifyAuthChange] seeding with single-player-user (error fallback)"
        );
        console.log(
          "🔌 [AuthContext] Starting SSE relay for single-player mode (error fallback)"
        );
        notifyAuthChange("single-player-user");
      }
    };
    seedToken();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (evt, session) => {
        try {
          const timestamp = new Date().toISOString();
          console.log(
            `🔔 [AuthContext] [${timestamp}] *** SUPABASE AUTH EVENT: ${evt} ***`
          );
          console.log("🔍 [AuthContext] Session details:", {
            hasSession: !!session,
            hasUser: !!session?.user,
            hasAccessToken: !!session?.access_token,
            accessTokenLength: session?.access_token?.length,
            hasIdToken: !!(session as any)?.id_token,
            idTokenLength: (session as any)?.id_token?.length,
            hasRefreshToken: !!session?.refresh_token,
            userId: session?.user?.id,
            userEmail: session?.user?.email,
          });
          console.log(
            "🔍 [AuthContext] Current user state before processing:",
            {
              currentUser: user?.email || "null",
              currentUserId: user?.id || "null",
            }
          );

          if (
            evt === "SIGNED_IN" ||
            evt === "INITIAL_SESSION" ||
            evt === "TOKEN_REFRESHED"
          ) {
            console.log(
              `🔄 [AuthContext] Processing ${evt} event - setting user`
            );
            setUser(session?.user ?? null);
            console.log("✅ [AuthContext] User state updated:", {
              newUser: session?.user?.email || "null",
              newUserId: session?.user?.id || "null",
            });

            // Set ACS client auth token when user is authenticated
            if (session) {
              // Condition made more robust; getSupabaseAccessToken handles null session
              // This 'session' is from the onAuthStateChange callback parameters.
              // acsClient is defined at the top of the useEffect hook.
              const { token: accessToken } = getSupabaseAccessToken(session);
              if (accessToken) {
                const current = acsClient.getAuthToken();
                if (current !== accessToken) {
                  console.log(
                    "🔑 [AuthContext] Auth state change (filtered):",
                    {
                      event: evt,
                      len: accessToken.length,
                      start: accessToken.substring(0, 50) + "...",
                    }
                  );
                  acsClient.setAuthToken(accessToken);

                  // ✅ CRITICAL: Establish firehose connection for LocalToolOrchestrator
                  // This must happen at app level to persist across navigation
                  try {
                    acsClient.streaming.connectPrivate(
                      session.user.id,
                      accessToken
                    );
                    console.log(
                      "🔥 [AuthContext] Firehose connection established for LocalToolOrchestrator"
                    );
                  } catch (error) {
                    console.error(
                      "❌ [AuthContext] Failed to establish firehose connection:",
                      error
                    );
                  }

                  // 🔌 Start SSE relay for authenticated user
                  console.log(
                    "[DEBUG notifyAuthChange] authenticated",
                    session.user.id
                  );
                  notifyAuthChange(session.user.id);
                } else {
                  // token unchanged – skip redundant processing
                  console.log(
                    "[AuthContext] access_token unchanged, skipping setAuthToken"
                  );
                }
              } else {
                // Helper returned null token - clear ACS auth
                console.warn(
                  "⚠️ [AuthContext] No valid token found after filtering, clearing ACS auth"
                );
                acsClient.clearAuthToken();
              }

              // Attempt ACS cookie exchange for authenticated sessions (now with debouncing)
              // Note: 'accessToken' variable is expected to be in scope from a few lines above this block.
              if (
                accessToken &&
                accessToken === lastExchangedTokenRef.current
              ) {
                console.log(
                  "[Auth] Access token unchanged or already exchanged – skip ACS exchange"
                );
              } else if (accessToken && exchangeInFlightRef.current) {
                console.log("[Auth] Exchange already in flight – skip");
              } else if (accessToken) {
                // Only proceed if accessToken is valid and not caught by above guards
                console.log(
                  "[Auth] Attempting ACS cookie exchange with session for user (debounced):",
                  session.user?.email
                );
                const p = exchangeSupabaseSessionForACSCookies(session) // Existing function takes the whole session
                  .then(() => {
                    lastExchangedTokenRef.current = accessToken; // Mark success with the current token
                  })
                  .catch((err) => {
                    console.warn("[Auth] ACS exchange failed:", err);
                    // Consider if lastExchangedTokenRef.current should be cleared on failure
                    // to allow a retry with the same token if the error is transient.
                  })
                  .finally(() => {
                    exchangeInFlightRef.current = null; // Clear the in-flight guard
                  });
                exchangeInFlightRef.current = p; // Set the in-flight guard
                await p; // Await the promise as per patch instructions
              } else {
                // This case (session exists, but accessToken is falsy) implies no token to exchange.
                // The original code would also effectively skip the exchange.
                // console.log('[Auth] No valid access token in current session, skipping ACS exchange attempt.');
              }
            } else {
              // console.log('⚠️ [AuthContext] No access token in session for event:', evt);
            }
          }

          if (evt === "SIGNED_OUT") {
            setUser(null);

            // Clear ACS client auth token when user signs out
            // console.log('🔓 [AuthContext] Clearing ACS client auth token');

            // console.log('🔍 [AuthContext] ACS client before clearing:', {
            //   currentAuthToken: acsClient?.getAuthToken?.() || 'undefined'
            // });

            acsClient.clearAuthToken(); // Use clearAuthToken instead of setAuthToken('')

            // console.log('🔍 [AuthContext] ACS client after clearing:', {
            //   authToken: acsClient?.getAuthToken?.() || 'undefined'
            // });
            // console.log('✅ [AuthContext] ACS client token cleared');

            // 🔌 Start SSE relay for single-player mode when user signs out
            console.log(
              "[DEBUG notifyAuthChange] sign-out fallback single-player"
            );
            console.log(
              "🔌 [AuthContext] Starting SSE relay for single-player mode after sign out"
            );
            notifyAuthChange("single-player-user");
          }

          if (!booted) setBooted(true);
        } catch (error) {
          console.error(
            "🚨 [AuthContext] Error in auth state change handler:",
            error
          );
          console.error(
            "🚨 [AuthContext] Error stack:",
            error instanceof Error ? error.stack : "No stack"
          );
        }
      }
    );
    return () => sub.subscription.unsubscribe();
  }, [exchangeSupabaseSessionForACSCookies]);

  const loginGoogle = async (): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        console.error("Google login error:", error);
        return { success: false, error: error.message };
      }
      console.log("Google login initiated:", data);
      return { success: true };
    } catch (error: any) {
      console.error("Failed to initiate Google login:", error);
      return { success: false, error: error?.message || "Unknown error" };
    }
  };

  const loginGitHub = async (): Promise<AuthResult> => {
    try {
      // https://github.com/login/oauth/authorize?client_id=timvvvht.ai%40gmail.com&redirect_uri=https%3A%2F%2Fwurmfjxtyntxnstqbyms.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=user%3Aemail&state=eyJhbGciOiJIUzI1NiIsImtpZCI6IlRQRjRvTGNPVU5ZTm9IT1ciLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NTU0NTYwMTIsInNpdGVfdXJsIjoiaHR0cDovL2xvY2FsaG9zdDo1MTczL2F1dGgvY2FsbGJhY2siLCJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCIsImZ1bmN0aW9uX2hvb2tzIjpudWxsLCJwcm92aWRlciI6ImdpdGh1YiIsInJlZmVycmVyIjoiaHR0cDovL2xvY2FsaG9zdDo1MTczLyIsImZsb3dfc3RhdGVfaWQiOiIifQ.2MHkPqKGXhet5xBKnxH4-Ioj7WpB7KQ8mDQqCBRfxd4
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
      });
      //options: {
      //redirectTo: `${window.location.origin}/auth/callback`,
      //},
      if (error) {
        console.error("GitHub login error:", error);
        return { success: false, error: error.message };
      }
      console.log("GitHub login initiated:", data);
      return { success: true };
    } catch (error: any) {
      console.error("Failed to initiate GitHub login:", error);
      return { success: false, error: error?.message || "Unknown error" };
    }
  };

  const loginEmailPassword = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    console.log("🔐 [AuthContext] Starting email/password login", { email });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error("❌ [AuthContext] Email/password login error:", error);
        return { success: false, error: error.message };
      }
      if (data.session && data.user) {
        console.log("✅ [AuthContext] Email/password login successful", {
          userId: data.user.id,
          email: data.user.email,
        });
        setUser(data.user);
        return { success: true, user: data.user, session: data.session };
      }
      return { success: false, error: "No session or user returned" };
    } catch (error: any) {
      return { success: false, error: error?.message || "Unknown error" };
    }
  };

  const signUpEmailPassword = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    console.log("🔐 [AuthContext] Starting email/password sign up", { email });
    try {
      const isDesktop = isTauri();
      const ORCHESTRA_DEEP_LINK = "orchestra://auth-callback";
      const WEB_REDIRECT = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: isDesktop ? ORCHESTRA_DEEP_LINK : WEB_REDIRECT,
        },
      });
      if (error) {
        console.error("❌ [AuthContext] Email/password sign up error:", error);
        return { success: false, error: error.message };
      }
      if (data.user) {
        console.log("✅ [AuthContext] Email/password sign up successful", {
          userId: data.user.id,
          email: data.user.email,
          needsConfirmation: !data.session, // If no session, email confirmation is required
          confirmationSent: !!data.user && !data.session,
        });
        if (data.session) {
          setUser(data.user);
        }
        return { success: true, user: data.user, session: data.session };
      }
      return { success: false, error: "No user returned" };
    } catch (error: any) {
      return { success: false, error: error?.message || "Unknown error" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // For single-player mode, provide a default user when none exists
  const defaultUser = {
    id: "single-player-user",
    email: "user@localhost",
    user_metadata: {},
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <Ctx.Provider
      value={{
        user: user || defaultUser, // Use actual user or default for single-player
        isAuthenticated: !!user,
        booted,
        showModal,
        setShowModal,
        loginGoogle,
        loginGitHub,
        loginEmailPassword,
        signUpEmailPassword,
        logout,
      }}
    >
      <div className="min-h-[100vh] min-w-[100vw] flex flex-col items-center">
        <span className="text-xl text-white">{showModal}</span>
        {children}
        {user && <SignOutButton />}
        {showModal && (
          <SecureAuthModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
