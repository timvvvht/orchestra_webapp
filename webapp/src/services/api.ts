/**
 * Saves an API key for a specific service using the backend.
 * @param service - The identifier for the service (e.g., 'llm.openai').
 * @param key - The API key string.
 */
export async function saveApiKey(service: string, key: string): Promise<void> {
    await window.__TAURI__.invoke('set_api_key', { service, key });
}

/**
 * Loads an API key for a specific service from the backend.
 * @param service - The identifier for the service (e.g., 'llm.openai').
 * @returns The API key string, or an empty string if not found.
 */
export async function loadApiKey(service: string): Promise<string> {
    // The backend command currently returns an empty string if the key is not found.
    // Consider updating backend to return null/undefined or throw an error for clearer distinction.
    return window.__TAURI__.invoke<string>('get_api_key', { service });
}
