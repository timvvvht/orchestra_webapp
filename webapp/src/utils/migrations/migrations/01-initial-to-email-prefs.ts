/**
 * Migration from version 1 to version 2
 * 
 * This migration adds the emailPreferences and deliveryPreferences objects
 * to the notification settings.
 */

import type { Settings } from '@/types/settings';
import type { SettingsMigration } from '../types';

/**
 * Migration from version 1 to version 2
 */
export const migration1to2: SettingsMigration = {
  fromVersion: 1,
  toVersion: 2,
  description: 'Add email and delivery preferences to notification settings',
  
  migrate: (settings: Settings): Settings => {
    // Create a deep copy of the settings object
    const newSettings = JSON.parse(JSON.stringify(settings)) as Settings;
    
    // Add emailPreferences if it doesn't exist
    if (!newSettings.notifications.emailPreferences) {
      newSettings.notifications.emailPreferences = {
        weeklySummary: true,
        productUpdates: true,
        marketing: false,
      };
    }
    
    // Add deliveryPreferences if it doesn't exist
    if (!newSettings.notifications.deliveryPreferences) {
      newSettings.notifications.deliveryPreferences = {
        batching: true,
        doNotDisturb: false,
        sound: 'default',
      };
    }
    
    return newSettings;
  },
};