/**
 * Settings migration runner
 * 
 * This module provides functionality to migrate settings from one version to another.
 * It maintains a registry of migrations and applies them in sequence to upgrade
 * settings to the latest version.
 */

import type { Settings } from '@/types/settings';
import type { SettingsMigration, MigrationRunner } from './types';
import { getPreference, setPreference } from '@/api/settingsApi';

/**
 * Implementation of the migration runner
 */
class SettingsMigrationRunner implements MigrationRunner {
  private migrations: SettingsMigration[] = [];
  
  /**
   * Register a migration
   * @param migration The migration to register
   */
  registerMigration(migration: SettingsMigration): void {
    this.migrations.push(migration);
    
    // Sort migrations by fromVersion to ensure they're applied in the correct order
    this.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }
  
  /**
   * Get the latest settings version
   * @returns The latest settings version
   */
  getLatestVersion(): number {
    if (this.migrations.length === 0) {
      return 1; // Initial version
    }
    
    // Find the highest toVersion
    return Math.max(...this.migrations.map(m => m.toVersion));
  }
  
  /**
   * Run migrations on the settings object
   * @param settings The settings object to migrate
   * @returns The migrated settings object
   */
  async migrateSettings(settings: Settings): Promise<Settings> {
    // If no version is set, assume it's the initial version
    const currentVersion = settings.version || 1;
    const latestVersion = this.getLatestVersion();
    
    // If already at the latest version, no migration needed
    if (currentVersion >= latestVersion) {
      return settings;
    }
    
    console.log(`Migrating settings from version ${currentVersion} to ${latestVersion}`);
    
    // Find migrations that need to be applied
    const applicableMigrations = this.migrations.filter(
      m => m.fromVersion >= currentVersion && m.toVersion <= latestVersion
    );
    
    // Apply migrations in sequence
    let migratedSettings = { ...settings };
    
    for (const migration of applicableMigrations) {
      console.log(`Applying migration: ${migration.description}`);
      migratedSettings = migration.migrate(migratedSettings);
      
      // Update the version after each migration
      migratedSettings.version = migration.toVersion;
      
      // Persist the migrated settings
      await setPreference('version', migratedSettings.version);
    }
    
    return migratedSettings;
  }
}

// Create and export a singleton instance
export const migrationRunner = new SettingsMigrationRunner();