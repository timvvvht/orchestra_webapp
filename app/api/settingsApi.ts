/**
 * Settings API - Webapp Implementation
 * 
 * This is a webapp-only implementation that uses localStorage instead of Tauri's store system.
 * Provides the same interface as the desktop version but without Tauri dependencies.
 */

/**
 * Gets a preference from localStorage
 */
export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const stored = localStorage.getItem(`orchestra_pref_${key}`);
        if (stored !== null) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn(`Error reading preference ${key} from localStorage:`, error);
    }
    return defaultValue;
}

/**
 * Sets a preference in localStorage
 */
export async function setPreference<T>(key: string, value: T): Promise<void> {
    console.log('[settingsApi] setPreference called:', { key, value });
    try {
        console.log('[settingsApi] Writing to localStorage:', { key, value });
        localStorage.setItem(`orchestra_pref_${key}`, JSON.stringify(value));
        console.log('[settingsApi] localStorage setItem complete:', { key });
    } catch (error) {
        console.warn(`Error saving preference ${key} to localStorage:`, error);
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
    try {
        const stored = localStorage.getItem(`orchestra_category_${category}`);
        if (stored !== null) {
            const parsed = JSON.parse(stored);
            return { ...defaultValues, ...parsed };
        }
    } catch (error) {
        console.warn(`Error reading category ${category} from localStorage:`, error);
    }
    return defaultValues;
}

/**
 * Helper function to set all settings for a category
 */
async function setSettingsCategory(category: string, settings: Record<string, any>): Promise<void> {
    try {
        localStorage.setItem(`orchestra_category_${category}`, JSON.stringify(settings));
    } catch (error) {
        console.warn(`Error saving category ${category} to localStorage:`, error);
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
 * Gets an API key - Not supported in webapp for security reasons
 */
export async function getApiKey(service: string): Promise<string | null> {
    console.warn(`API key access for ${service} not supported in webapp mode`);
    return null;
}

/**
 * Sets an API key - Not supported in webapp for security reasons
 */
export async function setApiKey(service: string, apiKey: string): Promise<void> {
    console.warn(`API key storage for ${service} not supported in webapp mode`);
}

/**
 * Gets the proposed default vault path
 */
export async function getDefaultVaultPath(): Promise<string> {
    return '~/Documents/Orchestra'; // Webapp default
}

/**
 * Ensures a directory exists - No-op in webapp
 */
export async function ensureDirectoryExists(path: string): Promise<void> {
    console.warn(`Directory creation for ${path} not supported in webapp mode`);
}

/**
 * Gets all preferences from localStorage
 */
export async function getAllStoredPreferences(): Promise<Record<string, any>> {
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