/**
 * Front-end helper wrapper around ACS Model-Key endpoints.
 * This keeps BYOK logic centralised and avoids every component from
 * touching the ACS SDK directly.
 */
import { getDefaultACSClient } from "@/services/acs";
import type { APIKeyProviderResponse, APIKeyResponse } from "@/services/acs";

const acsClient = () => getDefaultACSClient();

/** Store / update an API key for a provider. */
export async function storeApiKey(
  providerName: string,
  apiKey: string,
  keyAlias?: string
): Promise<boolean> {
  try {
    const client = acsClient();
    if (!client.isAuthenticated()) {
      console.error("[BYOK] storeApiKey failed: Client not authenticated");
      return false;
    }

    const res = await client.models.storeAPIKey(providerName, apiKey, keyAlias);
    return res.data.success;
  } catch (err) {
    console.error("[BYOK] storeApiKey failed:", err);
    throw err; // Re-throw to allow UI to handle specific error messages
  }
}

/**
 * Get list of providers that have *any* key record. A provider may return
 * `has_key: false` (placeholder) – caller can filter if needed.
 */
export async function listApiKeys(): Promise<APIKeyProviderResponse[] | null> {
  try {
    const client = acsClient();
    if (!client.isAuthenticated()) {
      console.error("[BYOK] listApiKeys failed: Client not authenticated");
      return null;
    }

    const res = await client.models.listAPIKeys();
    return res.data;
  } catch (err) {
    console.error("[BYOK] listApiKeys failed:", err);
    throw err; // Re-throw to allow caller to handle errors
  }
}

/** Delete a stored API key for a provider */
export async function deleteApiKey(providerName: string): Promise<boolean> {
  try {
    const client = acsClient();
    if (!client.isAuthenticated()) {
      console.error("[BYOK] deleteApiKey failed: Client not authenticated");
      return false;
    }

    const res = await client.models.deleteAPIKey(providerName);
    return res.data.success;
  } catch (err) {
    console.error("[BYOK] deleteApiKey failed:", err);
    throw err; // Re-throw to allow UI to handle specific error messages
  }
}
