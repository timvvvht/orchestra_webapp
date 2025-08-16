import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getDefaultACSClient,
  type APIKeyProviderResponse,
} from "@/services/acs";

import { listApiKeys } from "@/services/byokApi";

/**
 * Zustand store for Bring-Your-Own-Key (BYOK) preferences & metadata
 */
export interface BYOKState {
  /**
   * Whether the frontend should instruct ACS to use keys that have been
   * previously stored via the /model-keys endpoints.
   *
   * Note: This preference does NOT guarantee a stored key actually exists –
   * it is purely a hint used when constructing /acs/converse requests.
   */
  useStoredKeysPreference: boolean;

  /**
   * Providers that currently have a key stored server-side. This list is loaded
   * from ACS via the list API (`/api/v1/model-keys/list`).
   */
  storedKeyProviders: string[];

  /** Loading flag while hitting ACS */
  isLoadingKeyProviders: boolean;

  /** Last error when interacting with ACS */
  keyProvidersError: string | null;

  /* ─────────────────── Actions ─────────────────── */
  /** Update local preference */
  setUseStoredKeysPreference: (pref: boolean) => void;

  /** Refresh provider list from ACS */
  fetchStoredKeyProviders: () => Promise<void>;

  /** Locally add a provider after successful key store */
  addStoredKeyProvider: (provider: string) => void;

  /** Locally remove a provider after successful deletion */
  removeStoredKeyProvider: (provider: string) => void;
}

export const useBYOKStore = create<BYOKState>()(
  persist(
    (set, get) => ({
      useStoredKeysPreference: true,
      storedKeyProviders: [],
      isLoadingKeyProviders: false,
      keyProvidersError: null,

      setUseStoredKeysPreference: (pref: boolean) => {
        set({ useStoredKeysPreference: pref });
      },
      fetchStoredKeyProviders: async () => {
        console.log("🏪 [byokStore] Starting fetchStoredKeyProviders...");

        const acsClient = getDefaultACSClient();

        // Debug: Check Supabase auth state and sync token if needed
        try {
          const {
            data: { session },
          } = await import("@/lib/supabaseClient").then((m) =>
            m.supabase.auth.getSession()
          );
          console.log("🔍 [byokStore] Supabase session check:", {
            hasSession: !!session,
            hasUser: !!session?.user,
            hasAccessToken: !!session?.access_token,
            accessTokenLength: session?.access_token?.length || 0,
            userId: session?.user?.id,
          });

          // If we have a Supabase session but ACS client isn't authenticated, sync the token
          if (session?.access_token && !acsClient.isAuthenticated()) {
            console.log(
              "🔄 [byokStore] Syncing Supabase token to ACS client..."
            );
            acsClient.setAuthToken(session.access_token);
          }
        } catch (error) {
          console.warn(
            "⚠️ [byokStore] Failed to check Supabase session:",
            error
          );
        }

        // First check if we have a token at all (race condition protection)
        const currentToken = acsClient.getAuthToken();
        if (!currentToken || currentToken === "") {
          console.warn(
            "⚠️ [byokStore] Auth token not ready, aborting API call"
          );
          set({
            keyProvidersError: "Auth not ready",
            isLoadingKeyProviders: false,
          });
          return;
        }

        // Check if client is authenticated
        if (!acsClient.isAuthenticated()) {
          console.warn(
            "⚠️ [byokStore] ACS client not authenticated, aborting API call"
          );
          set({
            keyProvidersError: "Authentication required",
            isLoadingKeyProviders: false,
          });
          return;
        }

        // Double-check that we have a valid token length
        if (currentToken.length < 10) {
          console.warn("⚠️ [byokStore] ACS client token appears invalid:", {
            tokenLength: currentToken.length,
          });
          set({
            keyProvidersError: "Invalid authentication token",
            isLoadingKeyProviders: false,
          });
          return;
        }

        console.log("🔍 [byokStore] ACS client state:", {
          clientExists: !!acsClient,
          isAuthenticated: acsClient.isAuthenticated(),
          authTokenLength: acsClient.getAuthToken()?.length || 0,
          authTokenStart:
            acsClient.getAuthToken()?.substring(0, 50) + "..." || "undefined",
        });

        set({ isLoadingKeyProviders: true, keyProvidersError: null });

        try {
          console.log("📡 [byokStore] Making API call to listAPIKeys...");
          const response = await listApiKeys();
          console.log("✅ [byokStore] API call successful:", {
            hasResponse: !!response,
            dataLength: response?.length || 0,
          });

          if (response && Array.isArray(response)) {
            const providers: string[] = response
              .filter((p: APIKeyProviderResponse) => p.has_key)
              .map((p: APIKeyProviderResponse) => p.provider_name);

            console.log("🔑 [byokStore] Processed providers:", providers);
            set({
              storedKeyProviders: providers,
              isLoadingKeyProviders: false,
            });
          } else {
            // Treat null/undefined response as empty list, not an error
            console.log("🔑 [byokStore] No providers data, setting empty list");
            set({ storedKeyProviders: [], isLoadingKeyProviders: false });
          }
        } catch (err: any) {
          console.error("❌ [byokStore] API call failed:", err);
          console.error("🔍 [byokStore] Error details:", {
            message: err?.message,
            status: err?.status,
            response: err?.response?.data,
            stack: err?.stack,
          });

          const msg =
            err instanceof Error ? err.message : "Failed to load providers";
          set({ keyProvidersError: msg, isLoadingKeyProviders: false });
        }
      },

      addStoredKeyProvider: (provider: string) => {
        const current = get().storedKeyProviders;
        if (!current.includes(provider)) {
          set({ storedKeyProviders: [...current, provider] });
        }
      },

      removeStoredKeyProvider: (provider: string) => {
        set({
          storedKeyProviders: get().storedKeyProviders.filter(
            (p) => p !== provider
          ),
        });
      },
    }),
    {
      name: "byok-preferences-storage",
      partialize: (state) => ({
        useStoredKeysPreference: state.useStoredKeysPreference,
        storedKeyProviders: state.storedKeyProviders,
      }),
    }
  )
);
