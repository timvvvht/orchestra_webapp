/**
 * Types for the settings migration system
 */

import { Settings } from '@/types/settings';

/**
 * Interface for a settings migration
 */
export interface SettingsMigration {
  /**
   * The version this migration upgrades from
   */
  fromVersion: number;
  
  /**
   * The version this migration upgrades to
   */
  toVersion: number;
  
  /**
   * Description of the migration
   */
  description: string;
  
  /**
   * Function to migrate settings from one version to another
   * @param settings The settings object to migrate
   * @returns The migrated settings object
   */
  migrate: (settings: Settings) => Settings;
}

/**
 * Interface for the migration runner
 */
export interface MigrationRunner {
  /**
   * Run migrations on the settings object
   * @param settings The settings object to migrate
   * @returns The migrated settings object
   */
  migrateSettings: (settings: Settings) => Promise<Settings>;
  
  /**
   * Get the latest settings version
   * @returns The latest settings version
   */
  getLatestVersion: () => number;
  
  /**
   * Register a migration
   * @param migration The migration to register
   */
  registerMigration: (migration: SettingsMigration) => void;
}