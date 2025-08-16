/**
 * Settings migration system
 * 
 * This module exports the migration runner and registers all migrations.
 */

import { migrationRunner } from './migrationRunner';

// Import all migrations
import { migration1to2 } from './migrations/01-initial-to-email-prefs';
import { migration2to3 } from './migrations/02-add-sound-enabled';

// Register all migrations
migrationRunner.registerMigration(migration1to2);
migrationRunner.registerMigration(migration2to3);

// Export the migration runner
export { migrationRunner };