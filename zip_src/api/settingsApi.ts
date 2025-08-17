import { Store } from '@tauri-apps/plugin-store';
import { isTauri } from '@/utils/environment';
import { safeTauriInvoke } from '@/utils/tauriApi';

// Tauri v2+ pattern: Use async store loading instead of synchronous constructor
let storePromise: Promise<Store> | null = null;

/**
 * Gets the store instance, loading it asynchronously if needed
 * Returns null in web mode for fallback to localStorage
 */
async function getStore(): Promise<Store | null> {
    if (!isTauri()) {
        return null; // Web mode: use localStorage fallback
    }

    if (!storePromise) {
        // Tauri v2+ pattern: Use Store.load() instead of new Store()
        storePromise = Store.load('.settings.dat');
    }

    return storePromise;
}

/**
 * Browser-safe settings API with Tauri fallbacks
 * Provides graceful degradation for web mode
 */

// In-memory storage for web mode
let webModeStorage: Record<string, any> = {};

/**
 * Gets a preference from the settings store
 * In web mode, uses localStorage as fallback
 */
export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
    const store = await getStore();

    if (!store) {
        // Web mode: use localStorage
        try {
            const stored = localStorage.getItem(`orchestra_pref_${key}`);
            if (stored !== null) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn(`[Web Mode] Error reading preference ${key} from localStorage:`, error);
        }
        return defaultValue;
    }

    // Tauri mode: use backend
    try {
        const value = await store.get<T>(key);
        return value === null ? defaultValue : value;
    } catch (error) {
        console.error(`Error getting preference ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Sets a preference in the settings store
 * In web mode, uses localStorage as fallback
 */
export async function setPreference<T>(key: string, value: T): Promise<void> {
    console.log('[settingsApi] setPreference called:', { key, value });
    const store = await getStore();

    if (!store) {
        // Web mode: use localStorage
        try {
            console.log('[settingsApi] Writing to localStorage:', { key, value });
            localStorage.setItem(`orchestra_pref_${key}`, JSON.stringify(value));
            console.log('[settingsApi] localStorage setItem complete:', { key });
            return;
        } catch (error) {
            console.warn(`[Web Mode] Error saving preference ${key} to localStorage:`, error);
            return;
        }
    }

    // Tauri mode: use backend
    try {
        console.log('[settingsApi] Storing in Tauri Store:', { key, value });
        await store.set(key, value);
        await store.save(); // Persist the changes to disk
        console.log('[settingsApi] Store.save() completed:', { key });
    } catch (error) {
        console.error(`Error setting preference ${key}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Gets all theme settings
 */
export async function getThemeSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('theme', defaultValues);
}

/**
 * Sets all theme settings
 */
export async function setThemeSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('theme', settings);
}

/**
 * Gets all vault settings
 */
export async function getVaultSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('vault', defaultValues);
}

/**
 * Sets all vault settings
 */
export async function setVaultSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('vault', settings);
}

/**
 * Gets all keyboard settings
 */
export async function getKeyboardSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('keyboard', defaultValues);
}

/**
 * Sets all keyboard settings
 */
export async function setKeyboardSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('keyboard', settings);
}

/**
 * Gets all notification settings
 */
export async function getNotificationSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('notifications', defaultValues);
}

/**
 * Sets all notification settings
 */
export async function setNotificationSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('notifications', settings);
}

/**
 * Gets all UI settings
 */
export async function getUiSettings<T extends Record<string, any>>(defaultValues: T): Promise<T> {
    return getSettingsCategory('ui', defaultValues);
}

/**
 * Sets all UI settings
 */
export async function setUiSettings(settings: Record<string, any>): Promise<void> {
    return setSettingsCategory('ui', settings);
}

/**
 * Helper function to get all settings for a category
 */
async function getSettingsCategory<T extends Record<string, any>>(category: string, defaultValues: T): Promise<T> {
    if (!isTauri()) {
        // Web mode: try to get from localStorage
        try {
            const stored = localStorage.getItem(`orchestra_category_${category}`);
            if (stored !== null) {
                const parsed = JSON.parse(stored);
                return { ...defaultValues, ...parsed };
            }
        } catch (error) {
            console.warn(`[Web Mode] Error reading category ${category} from localStorage:`, error);
        }
        return defaultValues;
    }

    // Tauri mode: use backend
    try {
        console.log(`[getSettingsCategory] Getting settings for category: ${category}`);

        const result = await safeTauriInvoke<string>('get_pref', { key: category });

        if (result.success && result.data !== null && result.data !== undefined && result.data !== '') {
            try {
                const parsed = JSON.parse(result.data);
                console.log(`[getSettingsCategory] Parsed category '${category}':`, parsed);
                return { ...defaultValues, ...parsed };
            } catch (parseError) {
                console.warn(`Failed to parse JSON for category ${category}:`, parseError);
            }
        }

        // Try individual keys as fallback
        console.log(`[getSettingsCategory] Category '${category}' not found as object, trying individual keys...`);
        const categoryResult = { ...defaultValues };

        for (const [propName, defaultValue] of Object.entries(defaultValues)) {
            const key = `${category}.${propName}`;
            try {
                const keyResult = await safeTauriInvoke<string>('get_pref', { key });
                if (keyResult.success && keyResult.data !== null && keyResult.data !== undefined && keyResult.data !== '') {
                    try {
                        categoryResult[propName] = JSON.parse(keyResult.data);
                    } catch (parseError) {
                        categoryResult[propName] = keyResult.data;
                    }
                }
            } catch (error) {
                console.error(`Error getting individual key ${key}:`, error);
            }
        }

        return categoryResult;
    } catch (error) {
        console.error(`Error getting ${category} settings:`, error);
        return defaultValues;
    }
}

/**
 * Helper function to set all settings for a category
 */
async function setSettingsCategory(category: string, settings: Record<string, any>): Promise<void> {
    if (!isTauri()) {
        // Web mode: save to localStorage
        try {
            localStorage.setItem(`orchestra_category_${category}`, JSON.stringify(settings));
            return;
        } catch (error) {
            console.warn(`[Web Mode] Error saving category ${category} to localStorage:`, error);
            return;
        }
    }

    // Tauri mode: use backend
    try {
        const processedSettings = processValueForStorage(settings);
        const result = await safeTauriInvoke('set_pref', { key: category, value: processedSettings });

        if (!result.success) {
            // Fallback: try setting individual settings
            const prefixedSettings: Record<string, any> = {};
            Object.entries(settings).forEach(([key, value]) => {
                prefixedSettings[`${category}.${key}`] = value;
            });
            await setPreferences(prefixedSettings);
        }
    } catch (error) {
        console.error(`Error setting ${category} settings:`, error);
        throw error;
    }
}

/**
 * Sets multiple preferences
 */
export async function setPreferences(preferences: Record<string, any>): Promise<void> {
    const promises = Object.entries(preferences).map(([key, value]) => setPreference(key, value));
    await Promise.all(promises);
}

/**
 * Gets an API key from the secrets store
 * In web mode, returns null (API keys not supported in browser)
 */
export async function getApiKey(service: string): Promise<string | null> {
    if (!isTauri()) {
        console.warn(`[Web Mode] API key access for ${service} not supported in browser mode`);
        return null;
    }

    try {
        const result = await safeTauriInvoke<string>('get_api_key', { service });
        if (result.success && result.data && result.data.trim() !== '') {
            return result.data;
        }
        return null;
    } catch (error) {
        console.error(`Error getting API key for ${service}:`, error);
        return null;
    }
}

/**
 * Sets an API key in the secrets store
 * In web mode, shows warning (API keys not supported in browser)
 */
export async function setApiKey(service: string, apiKey: string): Promise<void> {
    if (!isTauri()) {
        console.warn(`[Web Mode] API key storage for ${service} not supported in browser mode`);
        return;
    }

    try {
        const result = await safeTauriInvoke('set_api_key', { service, key: apiKey });
        if (!result.success) {
            throw new Error(result.error || 'Failed to set API key');
        }
        console.log(`API: Set API key for ${service}`);
    } catch (error) {
        console.error(`Error setting API key for ${service}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Gets the proposed default vault path from the backend
 * In web mode, returns a sensible default
 */
export async function getDefaultVaultPath(): Promise<string> {
    if (!isTauri()) {
        return '~/Documents/Orchestra'; // Web mode default
    }

    try {
        const result = await safeTauriInvoke<string>('get_default_vault_path');
        if (result.success && result.data) {
            return result.data;
        }
        return '~/Documents/Orchestra'; // Fallback
    } catch (error) {
        console.error('Error getting default vault path:', error);
        return '~/Documents/Orchestra';
    }
}

/**
 * Ensures a directory exists at the given path
 * In web mode, this is a no-op
 */
export async function ensureDirectoryExists(path: string): Promise<void> {
    if (!isTauri()) {
        console.warn(`[Web Mode] Directory creation for ${path} not supported in browser mode`);
        return;
    }

    try {
        const result = await safeTauriInvoke('ensure_directory_exists', { pathStr: path });
        if (!result.success) {
            throw new Error(result.error || 'Failed to ensure directory exists');
        }
    } catch (error) {
        console.error(`Error ensuring directory exists at ${path}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Gets all preferences from the store
 * In web mode, returns localStorage data
 */
export async function getAllStoredPreferences(): Promise<Record<string, any>> {
    if (!isTauri()) {
        // Web mode: collect all Orchestra preferences from localStorage
        const result: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('orchestra_')) {
                try {
                    const value = localStorage.getItem(key);
                    if (value !== null) {
                        const cleanKey = key.replace('orchestra_pref_', '').replace('orchestra_category_', '');
                        result[cleanKey] = JSON.parse(value);
                    }
                } catch (error) {
                    console.warn(`Error parsing localStorage item ${key}:`, error);
                }
            }
        }
        return result;
    }

    // Tauri mode: use backend
    try {
        const result = await safeTauriInvoke<string>('get_all_prefs');
        if (result.success && result.data && result.data.trim() !== '') {
            return JSON.parse(result.data);
        }
        return {};
    } catch (error) {
        console.error('Error getting all stored preferences:', error);
        return {};
    }
}

/**
 * Helper function to process values for storage
 */
function processValueForStorage(value: any): any {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value !== 'object') {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value.map(item => processValueForStorage(item));
    }

    const processed: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
        processed[key] = processValueForStorage(val);
    }

    return processed;
}
