/**
 * Settings types and interfaces for the Orchestra application.
 * These types define the structure of the application settings
 * that are persisted to the Tauri backend.
 */

/**
 * Theme settings interface
 */
export interface ThemeSettings {
  /**
   * Color scheme for the application
   */
  colorScheme: 'light' | 'dark' | 'system';
  
  /**
   * Accent color for UI elements
   */
  accentColor: 'green' | 'blue' | 'purple' | 'amber' | 'red';
  
  /**
   * Theme preset
   */
  themePreset: 'default' | 'contrast' | 'soft' | 'retro';
  
  /**
   * Whether to reduce motion in animations
   */
  reducedMotion: boolean;
  
  /**
   * Density of UI elements
   */
  interfaceDensity: 'compact' | 'comfortable' | 'spacious';
  
  /**
   * Font size throughout the app
   */
  fontSize: 'small' | 'medium' | 'large';
}

/**
 * Vault settings interface
 */
export interface VaultSettings {
  /**
   * Path to the Obsidian vault
   */
  path: string;
  
  /**
   * Whether the vault is connected
   */
  isConnected: boolean;
  
  /**
   * Whether to automatically sync the vault on startup
   */
  autoSyncOnStartup: boolean;
  
  /**
   * How often to sync the vault
   */
  syncInterval: string;
}

/**
 * Keyboard shortcut interface
 */
export interface KeyboardShortcut {
  /**
   * The action description
   */
  action: string;
  
  /**
   * Array of keys that make up the shortcut
   */
  keys: string[];
}

/**
 * Keyboard settings interface
 */
export interface KeyboardSettings {
  /**
   * Record of shortcut IDs to key combinations
   */
  shortcuts: Record<string, KeyboardShortcut>;
  
  /**
   * Record of category IDs to arrays of shortcut IDs
   */
  categories: Record<string, string[]>;
}

/**
 * Notification channel settings
 */
export interface NotificationChannels {
  /**
   * Whether to show notifications in the app
   */
  inApp: boolean;
  
  /**
   * Whether to send notifications via email
   */
  email: boolean;
  
  /**
   * Whether to send notifications to mobile devices
   */
  mobile: boolean;
}

/**
 * Email preferences for notifications
 */
export interface EmailPreferences {
  /**
   * Whether to send a weekly summary email
   */
  weeklySummary: boolean;
  
  /**
   * Whether to send emails about product updates
   */
  productUpdates: boolean;
  
  /**
   * Whether to send marketing emails
   */
  marketing: boolean;
}

/**
 * Delivery preferences for notifications
 */
export interface DeliveryPreferences {
  /**
   * Whether to batch multiple notifications together
   */
  batching: boolean;
  
  /**
   * Whether to pause notifications during specific hours
   */
  doNotDisturb: boolean;
  
  /**
   * The sound to play for notifications
   */
  sound: 'default' | 'gentle' | 'none';
  
  /**
   * Whether to play a sound for notifications
   */
  soundEnabled: boolean;
}

/**
 * Notification settings interface
 */
export interface NotificationSettings {
  /**
   * Whether each notification type is enabled
   */
  enabled: Record<string, boolean>;
  
  /**
   * Which channels are enabled for each notification type
   */
  channels: Record<string, NotificationChannels>;
  
  /**
   * Email-specific notification preferences
   */
  emailPreferences: EmailPreferences;
  
  /**
   * Delivery-specific notification preferences
   */
  deliveryPreferences: DeliveryPreferences;
}

/**
 * UI settings interface
 */
export interface UiSettings {
  /**
   * The UI mode (novice or pro)
   */
  mode: 'novice' | 'pro';
}

/**
 * Main settings interface that combines all sub-interfaces
 */
export interface Settings {
  /**
   * Theme settings
   */
  theme: ThemeSettings;
  
  /**
   * Vault settings
   */
  vault: VaultSettings;
  
  /**
   * Keyboard settings
   */
  keyboard: KeyboardSettings;
  
  /**
   * Notification settings
   */
  notifications: NotificationSettings;
  
  /**
   * UI settings
   */
  ui: UiSettings;
  
  /**
   * Default agent configuration ID
   * Used to determine which agent to use by default in new chats
   */
  defaultAgentId?: string;
  
  /**
   * Version of the settings schema
   * Used for migrations
   */
  version: number;
}