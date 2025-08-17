import { safeTauriInvoke } from '@/utils/tauriApi';

/**
 * Gets a preference from the settings store
 *
 * @param key - The preference key (dot notation supported, e.g., 'theme.colorScheme')
 * @param defaultValue - Default value to return if the preference doesn't exist
 * @returns The preference value or the default value
 */
export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const result = await safeTauriInvoke<string>('get_pref', { key });
        if (result === null || result === undefined || result === '') {
            return defaultValue;
        }

        // Parse JSON string returned by Rust
        try {
            const parsed = JSON.parse(result);
            return parsed;
        } catch (parseError) {
            // If JSON parsing fails, return the raw string (for backward compatibility)
            console.warn(`Failed to parse JSON for preference ${key}:`, parseError);
            return result as unknown as T;
        }
    } catch (error) {
        console.error(`Error getting preference ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Gets multiple preferences from the settings store at once
 *
 * @param keys - Array of preference keys
 * @param defaultValues - Object with default values for each key
 * @returns Object with values for each key
 */
export async function getPreferences<T extends Record<string, any>>(keys: string[], defaultValues: T): Promise<T> {
    const result = { ...defaultValues };
    console.log(`[getPreferences] Getting preferences for keys:`, keys);
    console.log(`[getPreferences] Default values:`, defaultValues);

    try {
        // Process keys in parallel for better performance
        const promises = keys.map(async key => {
            try {
                const value = await safeTauriInvoke<string>('get_pref', { key });
                console.log(`[getPreferences] Value for key '${key}':`, value);

                if (value !== null && value !== undefined && value !== '') {
                    // Parse JSON string returned by Rust
                    try {
                        const parsed = JSON.parse(value);
                        console.log(`[getPreferences] Parsed value for key '${key}':`, parsed);
                        // Use dot notation to set nested properties
                        setNestedProperty(result, key, parsed);
                    } catch (parseError) {
                        // If JSON parsing fails, use the raw string
                        console.warn(`Failed to parse JSON for preference ${key}:`, parseError);
                        setNestedProperty(result, key, value);
                    }
                } else {
                    console.log(`[getPreferences] Key '${key}' returned empty/null value`);
                }
            } catch (error) {
                console.error(`Error getting preference ${key}:`, error);
                // Keep default value for this key
            }
        });

        await Promise.all(promises);
        console.log(`[getPreferences] Final result:`, result);
        return result;
    } catch (error) {
        console.error('Error getting preferences:', error);
        return result;
    }
}

/**
 * Sets a preference in the settings store
 *
 * @param key - The preference key (dot notation supported, e.g., 'theme.colorScheme')
 * @param value - The value to set
 * @returns A promise that resolves when the operation is complete
 */
export async function setPreference<T>(key: string, value: T): Promise<void> {
    try {
        // Handle complex objects by serializing them if needed
        const processedValue = processValueForStorage(value);
        await safeTauriInvoke('set_pref', { key, value: processedValue });
    } catch (error) {
        console.error(`Error setting preference ${key}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Sets multiple preferences in the settings store at once
 *
 * @param preferences - Object with key-value pairs to set
 * @returns A promise that resolves when the operation is complete
 */
export async function setPreferences(preferences: Record<string, any>): Promise<void> {
    try {
        // Process keys in parallel for better performance
        const promises = Object.entries(preferences).map(async ([key, value]) => {
            try {
                const processedValue = processValueForStorage(value);
                await safeTauriInvoke('set_pref', { key, value: processedValue });
            } catch (error) {
                console.error(`Error setting preference ${key}:`, error);
                throw new Error(error instanceof Error ? error.message : String(error));
            }
        });

        await Promise.all(promises);
    } catch (error) {
        console.error('Error setting preferences:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Gets all theme settings
 *
 * @param defaultValues - Default theme settings
 * @returns Theme settings
 */
export async function getThemeSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('theme', defaultValues);
}

/**
 * Sets all theme settings
 *
 * @param settings - Theme settings to set
 * @returns A promise that resolves when the operation is complete
 */
export async function setThemeSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('theme', settings);
}

/**
 * Gets all vault settings
 *
 * @param defaultValues - Default vault settings
 * @returns Vault settings
 */
export async function getVaultSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('vault', defaultValues);
}

/**
 * Sets all vault settings
 *
 * @param settings - Vault settings to set
 * @returns A promise that resolves when the operation is complete
 */
export async function setVaultSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('vault', settings);
}

/**
 * Gets all keyboard settings
 *
 * @param defaultValues - Default keyboard settings
 * @returns Keyboard settings
 */
export async function getKeyboardSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('keyboard', defaultValues);
}

/**
 * Sets all keyboard settings
 *
 * @param settings - Keyboard settings to set
 * @returns A promise that resolves when the operation is complete
 */
export async function setKeyboardSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('keyboard', settings);
}

/**
 * Gets all notification settings
 *
 * @param defaultValues - Default notification settings
 * @returns Notification settings
 */
export async function getNotificationSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('notifications', defaultValues);
}

/**
 * Sets all notification settings
 *
 * @param settings - Notification settings to set
 * @returns A promise that resolves when the operation is complete
 */
export async function setNotificationSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('notifications', settings);
}

/**
 * Gets all UI settings
 *
 * @param defaultValues - Default UI settings
 * @returns UI settings
 */
export async function getUiSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('ui', defaultValues);
}

/**
 * Sets all UI settings
 *
 * @param settings - UI settings to set
 * @returns A promise that resolves when the operation is complete
 */
export async function setUiSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('ui', settings);
}

/**
 * Helper function to get all settings for a category
 *
 * @param category - Settings category
 * @param defaultValues - Default values for the category
 * @returns Settings for the category
 */
async function getSettingsCategory<T extends Record<string, any>>(category: string, defaultValues: T): Promise<T> {
    try {
        console.log(`[getSettingsCategory] Getting settings for category: ${category}`);

        // Get all settings for the category
        const result = await safeTauriInvoke<string>('get_pref', { key: category });
        console.log(`[getSettingsCategory] Result for category '${category}':`, result);

        // If the category exists, parse and return it with defaults merged
        if (result !== null && result !== undefined && result !== '') {
            try {
                const parsed = JSON.parse(result);
                console.log(`[getSettingsCategory] Parsed category '${category}':`, parsed);
                return { ...defaultValues, ...parsed };
            } catch (parseError) {
                console.warn(`Failed to parse JSON for category ${category}:`, parseError);
            }
        }

        // Otherwise, try to get individual settings
        console.log(`[getSettingsCategory] Category '${category}' not found as object, trying individual keys...`);
        const keys = Object.keys(defaultValues).map(key => `${category}.${key}`);
        console.log(`[getSettingsCategory] Individual keys to fetch:`, keys);

        // Create a new object with default values
        const categoryResult = { ...defaultValues };

        // Fetch each key individually
        for (const key of keys) {
            try {
                const value = await safeTauriInvoke<string>('get_pref', { key });
                console.log(`[getSettingsCategory] Individual key '${key}' value:`, value);

                if (value !== null && value !== undefined && value !== '') {
                    try {
                        const parsed = JSON.parse(value);
                        // Extract the property name from the full key (e.g., 'vault.path' -> 'path')
                        const propName = key.split('.').pop()!;
                        categoryResult[propName] = parsed;
                        console.log(`[getSettingsCategory] Set ${propName} to:`, parsed);
                    } catch (parseError) {
                        console.warn(`Failed to parse JSON for key ${key}:`, parseError);
                        const propName = key.split('.').pop()!;
                        categoryResult[propName] = value;
                    }
                }
            } catch (error) {
                console.error(`Error getting individual key ${key}:`, error);
            }
        }

        console.log(`[getSettingsCategory] Final category result for '${category}':`, categoryResult);
        return categoryResult;
    } catch (error) {
        console.error(`Error getting ${category} settings:`, error);
        return defaultValues;
    }
}

/**
 * Helper function to set all settings for a category
 *
 * @param category - Settings category
 * @param settings - Settings to set
 * @returns A promise that resolves when the operation is complete
 */
async function setSettingsCategory(category: string, settings: Record<string, any>): Promise<void> {
    try {
        // Process settings for storage
        const processedSettings = processValueForStorage(settings);

        // Try to set the entire category at once
        await safeTauriInvoke('set_pref', { key: category, value: processedSettings });
    } catch (error) {
        console.error(`Error setting ${category} settings:`, error);

        // If setting the entire category fails, try setting individual settings
        const prefixedSettings: Record<string, any> = {};
        Object.entries(settings).forEach(([key, value]) => {
            prefixedSettings[`${category}.${key}`] = value;
        });

        await setPreferences(prefixedSettings);
    }
}

/**
 * Delete a preference from the settings store
 *
 * @param key - The preference key to delete
 * @returns A promise that resolves when the operation is complete
 */
export async function deletePreference(key: string): Promise<void> {
    try {
        await invoke('delete_pref', { key });
    } catch (error) {
        console.error(`Error deleting preference ${key}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Delete multiple preferences from the settings store
 *
 * @param keys - Array of preference keys to delete
 * @returns A promise that resolves when the operation is complete
 */
export async function deletePreferences(keys: string[]): Promise<void> {
    try {
        // Process keys in parallel for better performance
        const promises = keys.map(async key => {
            try {
                await safeTauriInvoke('delete_pref', { key });
            } catch (error) {
                console.error(`Error deleting preference ${key}:`, error);
                throw new Error(error instanceof Error ? error.message : String(error));
            }
        });

        await Promise.all(promises);
    } catch (error) {
        console.error('Error deleting preferences:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Check if a preference exists in the settings store
 *
 * @param key - The preference key to check
 * @returns A promise that resolves to true if the preference exists, false otherwise
 */
export async function hasPreference(key: string): Promise<boolean> {
    try {
        return await safeTauriInvoke<boolean>('has_pref', { key });
    } catch (error) {
        console.error(`Error checking preference ${key}:`, error);
        return false;
    }
}

/**
 * Clear all preferences in the settings store
 *
 * @returns A promise that resolves when the operation is complete
 */
export async function clearPreferences(): Promise<void> {
    try {
        await safeTauriInvoke('clear_prefs');
    } catch (error) {
        console.error('Error clearing preferences:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Gets all preferences from the Tauri plugin store
 *
 * @returns A promise that resolves to an object containing all stored preferences
 */
export async function getAllStoredPreferences(): Promise<Record<string, any>> {
    try {
        const result = await safeTauriInvoke<string>('get_all_prefs');
        // Parse the JSON string returned by the Rust command
        if (result && result.trim() !== '') {
            return JSON.parse(result);
        }
        return {};
    } catch (error) {
        console.error('Error getting all stored preferences:', error);
        return {};
    }
}

/**
 * Helper function to set a nested property using dot notation
 *
 * @param obj - Object to set property on
 * @param path - Path to property using dot notation
 * @param value - Value to set
 */
function setNestedProperty(obj: Record<string, any>, path: string, value: any): void {
    console.log(`[setNestedProperty] Setting ${path} to:`, value);
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    console.log(`[setNestedProperty] Result object after setting ${path}:`, obj);
}

/**
 * Helper function to process values for storage
 * Handles complex objects, circular references, etc.
 *
 * @param value - Value to process
 * @returns Processed value safe for storage
 */
function processValueForStorage(value: any): any {
    // Handle null and undefined
    if (value === null || value === undefined) {
        return value;
    }

    // Handle primitive types (string, number, boolean)
    if (typeof value !== 'object') {
        return value;
    }

    // Handle Date objects
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(item => processValueForStorage(item));
    }

    // Handle objects
    const processed: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
        processed[key] = processValueForStorage(val);
    }

    return processed;
}

/**
 * Gets an API key from the secrets store
 *
 * @param service - The service name (e.g., 'openai', 'anthropic')
 * @returns The API key or null if not found
 */
export async function getApiKey(service: string): Promise<string | null> {
    try {
        // Make sure we're using the correct Tauri command
        // This already correctly uses 'get_api_key' which is handled by our new SecretsManager
        const result = await safeTauriInvoke<string>('get_api_key', { service });
        // Return null for empty strings to maintain the expected interface
        return result && result.trim() !== '' ? result : null;
    } catch (error) {
        console.error(`Error getting API key for ${service}:`, error);
        return null;
    }
}

/**
 * Sets an API key in the secrets store
 *
 * @param service - The service name (e.g., 'openai', 'anthropic')
 * @param apiKey - The API key to store
 * @returns A promise that resolves when the operation is complete
 */
export async function setApiKey(service: string, apiKey: string): Promise<void> {
    try {
        // Make sure we're using the correct Tauri command
        // This already correctly uses 'set_api_key' which is handled by our new SecretsManager
        await safeTauriInvoke('set_api_key', { service, key: apiKey });
        // Don't log the actual API key for security reasons
        console.log(`API: Set API key for ${service}`);
    } catch (error) {
        console.error(`Error setting API key for ${service}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

// Add these functions:

/**
 * Gets the proposed default vault path from the backend.
 * @returns A promise that resolves to the default vault path string.
 */
export async function getDefaultVaultPath(): Promise<string> {
    try {
        const result = await safeTauriInvoke<string>('get_default_vault_path');
        // safeTauriInvoke<string> returns a string directly, not an object with .success/.data
        if (result && result !== 'DefaultVaultPathError') {
            console.log('🏠 [getDefaultVaultPath] Retrieved vault path:', result);
            return result;
        }
        console.warn('🏠 [getDefaultVaultPath] No valid vault path returned from backend');
        return 'DefaultVaultPathError';
    } catch (error) {
        console.error('🏠 [getDefaultVaultPath] Error getting default vault path:', error);
        // Fallback path if backend call fails, though ideally backend should always provide one.
        // This path might not be platform-agnostic if hardcoded here.
        return 'DefaultVaultPathError';
    }
}

/**
 * Ensures a directory exists at the given path. Creates it if it doesn't.
 * @param path - The absolute path of the directory to ensure.
 * @returns A promise that resolves when the operation is complete.
 */
export async function ensureDirectoryExists(path: string): Promise<void> {
    try {
        await safeTauriInvoke('ensure_directory_exists', { pathStr: path });
    } catch (error) {
        console.error(`Error ensuring directory exists at ${path}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}
