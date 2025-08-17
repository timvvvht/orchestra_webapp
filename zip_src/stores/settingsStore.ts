
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { debounce } from 'lodash-es';
import { 
  getPreference, 
  setPreference, 
  getThemeSettings,
  setThemeSettings,
  getVaultSettings,
  setVaultSettings,
  getKeyboardSettings,
  setKeyboardSettings,
  getNotificationSettings,
  setNotificationSettings,
  getUiSettings,
  setUiSettings,
  setPreferences,
  deletePreference
} from '@/api/settingsApi';
import { migrationRunner } from '@/utils/migrations';
import {
  Settings,
  ThemeSettings,
  VaultSettings,
  KeyboardSettings,
  NotificationSettings,
  UiSettings,
} from '@/types/settings';

import { getPlatformDefaults } from '@/utils/platform';

/**
 * Base default settings values
 * These will be customized based on the platform
 */
const baseDefaultSettings: Settings = {
  theme: {
    colorScheme: 'dark',
    accentColor: 'green',
    themePreset: 'default',
    reducedMotion: false,
    interfaceDensity: 'comfortable',
    fontSize: 'medium',
  },
  vault: {
    path: '',
    isConnected: false,
    autoSyncOnStartup: true,
    syncInterval: 'Every 15 minutes',
  },
  keyboard: {
    shortcuts: {},
    categories: {},
  },
  notifications: {
    enabled: {
      mission_complete: true,
      agent_approval: true,
      system_update: false,
      api_limit: true,
    },
    channels: {
      mission_complete: { inApp: true, email: true, mobile: true },
      agent_approval: { inApp: true, email: false, mobile: true },
      system_update: { inApp: true, email: false, mobile: false },
      api_limit: { inApp: true, email: true, mobile: false },
    },
    emailPreferences: {
      weeklySummary: true,
      productUpdates: true,
      marketing: false,
    },
    deliveryPreferences: {
      batching: true,
      doNotDisturb: false,
      sound: 'default',
      soundEnabled: true,
    },
  },
  ui: {
    mode: 'novice',
  },
  defaultAgentId: 'fac79f2c-b312-4ea9-a88a-751ae2be9169', // Default agent ID
  version: 1,
};

/**
 * Default settings with platform-specific customizations
 * This is initialized asynchronously when the store is created
 */
let defaultSettings: Settings = { ...baseDefaultSettings };

// Initialize platform-specific defaults
(async () => {
  try {
    defaultSettings = await getPlatformDefaults(baseDefaultSettings);
    console.log('Platform-specific default settings loaded');
  } catch (error) {
    console.error('Failed to load platform-specific defaults:', error);
  }
})();

/**
 * Settings store state interface
 */
interface SettingsState {
  // Settings data
  settings: Settings;
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: string | null;
  
  // Theme settings actions
  setThemeSetting: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => Promise<void>;
  setThemeSettings: (settings: Partial<ThemeSettings>) => Promise<void>;
  
  // Vault settings actions
  setVaultSetting: <K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) => Promise<void>;
  setVaultSettings: (settings: Partial<VaultSettings>) => Promise<void>;
  
  // Keyboard settings actions
  setKeyboardSetting: <K extends keyof KeyboardSettings>(key: K, value: KeyboardSettings[K]) => Promise<void>;
  setKeyboardSettings: (settings: Partial<KeyboardSettings>) => Promise<void>;
  
  // Notification settings actions
  setNotificationSetting: <K extends keyof NotificationSettings | string[]>(key: K, value: any) => Promise<void>;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  
  // UI settings actions
  setUiSetting: <K extends keyof UiSettings>(key: K, value: UiSettings[K]) => Promise<void>;
  setUiSettings: (settings: Partial<UiSettings>) => Promise<void>;
  
  // Initialize settings
  initSettings: () => Promise<void>;
  
  // Reset settings
  resetSettings: (category?: keyof Settings) => Promise<void>;
}

/**
 * Settings store
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: defaultSettings,
      isLoading: false,
      error: null,
      
      // Theme settings actions
      setThemeSetting: async <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            theme: {
              ...state.settings.theme,
              [key]: value,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save to backend with debouncing
          await setPreference(`theme.${key}`, value);
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          console.error('[settingsStore] setVaultSetting failed', { key, value, error });
            set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save theme setting: ${error}`,
          });
        }
      },
      
      setThemeSettings: async (themeSettings: Partial<ThemeSettings>) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            theme: {
              ...state.settings.theme,
              ...themeSettings,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save settings to backend using category-specific method
          await setThemeSettings({
            ...get().settings.theme,
            ...themeSettings,
          });
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save theme settings: ${error}`,
          });
        }
      },
      
      // Debounced version of setThemeSettings for rapid changes
      debouncedSetThemeSettings: debounce(async (themeSettings: Partial<ThemeSettings>) => {
        await get().setThemeSettings(themeSettings);
      }, 300),
      
      // Vault settings actions
      setVaultSetting: async <K extends keyof VaultSettings>(key: K, value: VaultSettings[K]) => {
        console.log('[settingsStore] setVaultSetting called', { key, value, type: typeof value });
        
        // Defensive check for path setting to prevent [object Object] storage
        let processedValue = value;
        if (key === 'path' && typeof value !== 'string') {
          console.warn('[settingsStore] Vault path is not a string, attempting to extract:', { value, type: typeof value });
          
          if (typeof value === 'object' && value !== null) {
            // Try to extract string path from object
            if ('path' in value && typeof (value as any).path === 'string') {
              processedValue = (value as any).path as VaultSettings[K];
              console.log('[settingsStore] Extracted path from object:', processedValue);
            } else if ('data' in value && typeof (value as any).data === 'string') {
              processedValue = (value as any).data as VaultSettings[K];
              console.log('[settingsStore] Extracted data from object:', processedValue);
            } else {
              console.error('[settingsStore] Could not extract string path from object:', value);
              processedValue = '' as VaultSettings[K];
            }
          } else {
            // Convert to string as fallback
            processedValue = String(value) as VaultSettings[K];
            console.log('[settingsStore] Converted value to string:', processedValue);
          }
        }
        
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            vault: {
              ...state.settings.vault,
              [key]: processedValue,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save to backend
          console.log('[settingsStore] Calling setPreference for vault:', { key, value: processedValue });
          await setPreference(`vault.${key}`, processedValue);
          console.log('[settingsStore] setPreference completed:', { key, value: processedValue });
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          console.error('[settingsStore] setVaultSetting failed', { key, value: processedValue, error });
          set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save vault setting: ${error}`,
          });
        }
      },
      
      setVaultSettings: async (vaultSettings: Partial<VaultSettings>) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            vault: {
              ...state.settings.vault,
              ...vaultSettings,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save settings to backend using category-specific method
          await setVaultSettings({
            ...get().settings.vault,
            ...vaultSettings,
          });
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save vault settings: ${error}`,
          });
        }
      },
      
      // Debounced version of setVaultSettings for rapid changes
      debouncedSetVaultSettings: debounce(async (vaultSettings: Partial<VaultSettings>) => {
        await get().setVaultSettings(vaultSettings);
      }, 300),
      
      // Keyboard settings actions
      setKeyboardSetting: async <K extends keyof KeyboardSettings>(key: K, value: KeyboardSettings[K]) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            keyboard: {
              ...state.settings.keyboard,
              [key]: value,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save to backend
          await setPreference(`keyboard.${key}`, value);
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save keyboard setting: ${error}`,
          });
        }
      },
      
      setKeyboardSettings: async (keyboardSettings: Partial<KeyboardSettings>) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            keyboard: {
              ...state.settings.keyboard,
              ...keyboardSettings,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save settings to backend using category-specific method
          await setKeyboardSettings({
            ...get().settings.keyboard,
            ...keyboardSettings,
          });
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save keyboard settings: ${error}`,
          });
        }
      },
      
      // Debounced version of setKeyboardSettings for rapid changes
      debouncedSetKeyboardSettings: debounce(async (keyboardSettings: Partial<KeyboardSettings>) => {
        await get().setKeyboardSettings(keyboardSettings);
      }, 300),
      
      // Notification settings actions
      setNotificationSetting: async <K extends keyof NotificationSettings | string[]>(key: K, value: any) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        
        if (Array.isArray(key)) {
          // Handle nested paths like ['email', 'weeklySummary']
          const [category, setting] = key;
          
          set(state => {
            // Create a deep copy of notifications to avoid mutation
            const updatedNotifications = { ...state.settings.notifications };
            
            // Ensure the category exists
            if (!updatedNotifications[category]) {
              updatedNotifications[category] = {};
            }
            
            // Update the specific setting
            updatedNotifications[category] = {
              ...updatedNotifications[category],
              [setting]: value
            };
            
            return {
              settings: {
                ...state.settings,
                notifications: updatedNotifications,
              },
              isLoading: true,
              error: null,
            };
          });
          
          try {
            // Save to backend with dot notation path
            await setPreference(`notifications.${category}.${setting}`, value);
            set({ isLoading: false });
          } catch (error) {
            // Revert on error
            set({
              settings: previousSettings,
              isLoading: false,
              error: `Failed to save notification setting: ${error}`,
            });
            throw error;
          }
        } else {
          // Handle direct key setting (original behavior)
          set(state => ({
            settings: {
              ...state.settings,
              notifications: {
                ...state.settings.notifications,
                [key as keyof NotificationSettings]: value,
              },
            },
            isLoading: true,
            error: null,
          }));
          
          try {
            // Save to backend
            await setPreference(`notifications.${key}`, value);
            set({ isLoading: false });
          } catch (error) {
            // Revert on error
            set({
              settings: previousSettings,
              isLoading: false,
              error: `Failed to save notification setting: ${error}`,
            });
            throw error;
          }
        }
      },
      
      setNotificationSettings: async (notificationSettings: Partial<NotificationSettings>) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            notifications: {
              ...state.settings.notifications,
              ...notificationSettings,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save settings to backend using category-specific method
          await setNotificationSettings({
            ...get().settings.notifications,
            ...notificationSettings,
          });
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save notification settings: ${error}`,
          });
        }
      },
      
      // Debounced version of setNotificationSettings for rapid changes
      debouncedSetNotificationSettings: debounce(async (notificationSettings: Partial<NotificationSettings>) => {
        await get().setNotificationSettings(notificationSettings);
      }, 300),
      
      // UI settings actions
      setUiSetting: async <K extends keyof UiSettings>(key: K, value: UiSettings[K]) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            ui: {
              ...state.settings.ui,
              [key]: value,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save to backend
          await setPreference(`ui.${key}`, value);
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save UI setting: ${error}`,
          });
        }
      },
      
      setUiSettings: async (uiSettings: Partial<UiSettings>) => {
        // Update local state optimistically
        const previousSettings = get().settings;
        set(state => ({
          settings: {
            ...state.settings,
            ui: {
              ...state.settings.ui,
              ...uiSettings,
            },
          },
          isLoading: true,
          error: null,
        }));
        
        try {
          // Save settings to backend using category-specific method
          await setUiSettings({
            ...get().settings.ui,
            ...uiSettings,
          });
          set({ isLoading: false });
        } catch (error) {
          // Revert on error
          set({
            settings: previousSettings,
            isLoading: false,
            error: `Failed to save UI settings: ${error}`,
          });
        }
      },
      
      // Debounced version of setUiSettings for rapid changes
      debouncedSetUiSettings: debounce(async (uiSettings: Partial<UiSettings>) => {
        await get().setUiSettings(uiSettings);
      }, 300),
      
      // Initialize settings
      initSettings: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Load settings from backend using category-specific methods
          const loadedSettings: Partial<Settings> = {};
          
          // Load theme settings
          loadedSettings.theme = await getThemeSettings(defaultSettings.theme);
          
          // Load vault settings
          loadedSettings.vault = await getVaultSettings(defaultSettings.vault);
          
          // TEMPORARY FIX: Ensure vault.path is loaded correctly
          // Check if vault.path exists as a direct key
          const directVaultPath = await getPreference('vault.path', '');
          if (directVaultPath && !loadedSettings.vault.path) {
            console.log('[settingsStore] Found vault.path as direct key:', directVaultPath);
            loadedSettings.vault.path = directVaultPath;
          }
          
          // Load keyboard settings
          loadedSettings.keyboard = await getKeyboardSettings(defaultSettings.keyboard);
          
          // Load notification settings
          loadedSettings.notifications = await getNotificationSettings(defaultSettings.notifications);
          
          // Load UI settings
          loadedSettings.ui = await getUiSettings(defaultSettings.ui);
          
          // Load version
          const version = await getPreference('version', defaultSettings.version);
          
          // Merge loaded settings with defaults
          const mergedSettings = {
            ...defaultSettings,
            ...loadedSettings,
            version,
          };
          
          // Run migrations if needed
          const migratedSettings = await migrationRunner.migrateSettings(mergedSettings);
          
          set({
            settings: migratedSettings,
            isLoading: false,
          });
        } catch (error) {
          // Use defaults on error
          set({
            settings: defaultSettings,
            isLoading: false,
            error: `Failed to load settings: ${error}`,
          });
        }
      },
      
      // Load settings with debouncing
      debouncedInitSettings: debounce(async () => {
        await get().initSettings();
      }, 300),
      
      
      // Reset settings
      resetSettings: async (category?: keyof Settings) => {
        set({ isLoading: true, error: null });
        
        if (category) {
          // Reset specific category
          set(state => ({
            settings: {
              ...state.settings,
              [category]: defaultSettings[category],
            },
          }));
          
          try {
            // Save reset category to backend using category-specific methods
            switch (category) {
              case 'theme':
                await setThemeSettings(defaultSettings.theme);
                break;
              case 'vault':
                await setVaultSettings(defaultSettings.vault);
                break;
              case 'keyboard':
                await setKeyboardSettings(defaultSettings.keyboard);
                break;
              case 'notifications':
                await setNotificationSettings(defaultSettings.notifications);
                break;
              case 'ui':
                await setUiSettings(defaultSettings.ui);
                break;
              default:
                await setPreference(category, defaultSettings[category]);
            }
            set({ isLoading: false });
          } catch (error) {
            set({ 
              isLoading: false,
              error: `Failed to reset ${category} settings: ${error}` 
            });
          }
        } else {
          // Reset all settings
          set({ settings: defaultSettings });
          
          try {
            // Save all reset settings to backend using setPreferences
            await setPreferences({
              theme: defaultSettings.theme,
              vault: defaultSettings.vault,
              keyboard: defaultSettings.keyboard,
              notifications: defaultSettings.notifications,
              ui: defaultSettings.ui,
              version: defaultSettings.version
            });
            set({ isLoading: false });
          } catch (error) {
            set({ 
              isLoading: false,
              error: `Failed to reset all settings: ${error}` 
            });
          }
        }
      },
      
      // Reset settings with confirmation
      confirmAndResetSettings: async (category?: keyof Settings) => {
        // This would typically show a confirmation dialog
        // For now, we'll just call resetSettings directly
        await get().resetSettings(category);
      },
    }),
    {
      name: 'settings-storage',
      // Only persist the settings object, not the loading state or error
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
