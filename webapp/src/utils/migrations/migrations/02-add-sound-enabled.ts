/**
 * Migration from version 2 to version 3
 * 
 * This migration adds the soundEnabled property to the deliveryPreferences object
 * in the notification settings.
 */

import type { Settings } from '@/types/settings';
import type { SettingsMigration } from '../types';

/**
 * Migration from version 2 to version 3
 */
export const migration2to3: SettingsMigration = {
  fromVersion: 2,
  toVersion: 3,
  description: 'Add soundEnabled property to delivery preferences',
  
  migrate: (settings: Settings): Settings => {
    // Create a deep copy of the settings object
    const newSettings = JSON.parse(JSON.stringify(settings)) as Settings;
    
    // Add soundEnabled if it doesn't exist
    if (newSettings.notifications.deliveryPreferences) {
      if (newSettings.notifications.deliveryPreferences.soundEnabled === undefined) {
        // Default to true if sound is not 'none', false otherwise
        const sound = newSettings.notifications.deliveryPreferences.sound || 'default';
        newSettings.notifications.deliveryPreferences.soundEnabled = sound !== 'none';
      }
    }
    
    return newSettings;
  },
};