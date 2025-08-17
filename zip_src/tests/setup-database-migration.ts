/**
 * Database migration setup script for conversation forking
 * 
 * This script applies the conversation forking migration to the database
 * and verifies that all required SQL functions are created.
 */

import { supabase } from '@/services/supabase/supabaseClient';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Applies the conversation forking migration to the database
 */
export async function applyForkingMigration(): Promise<void> {
  try {
    console.log('🔄 Applying conversation forking migration...');
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'tools/database/supabase/migrations/add_conversation_forking.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error executing statement: ${error.message}`);
          throw error;
        }
      }
    }
    
    console.log('✅ Migration applied successfully');
  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    throw error;
  }
}

/**
 * Verifies that all required SQL functions exist and work
 */
export async function verifyForkingFunctions(): Promise<void> {
  console.log('🔍 Verifying forking SQL functions...');
  
  const functions = [
    'get_forked_conversation',
    'get_conversation_forks',
    'get_fork_ancestry'
  ];
  
  for (const functionName of functions) {
    try {
      // Test function exists by calling it with a dummy parameter
      const { error } = await supabase.rpc(functionName as any, {
        target_session_id: '00000000-0000-0000-0000-000000000000',
        session_id: '00000000-0000-0000-0000-000000000000'
      });
      
      // We expect no "function does not exist" error
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        throw new Error(`Function ${functionName} does not exist`);
      }
      
      console.log(`✅ Function ${functionName} exists`);
    } catch (error) {
      console.error(`❌ Function ${functionName} verification failed:`, error);
      throw error;
    }
  }
  
  console.log('✅ All forking functions verified');
}

/**
 * Verifies that the database schema includes forking columns
 */
export async function verifyForkingSchema(): Promise<void> {
  console.log('🔍 Verifying forking database schema...');
  
  try {
    // Test that forking columns exist by selecting them
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('parent_session_id, fork_message_id, display_title')
      .limit(1);
    
    if (error) {
      throw new Error(`Schema verification failed: ${error.message}`);
    }
    
    console.log('✅ Forking schema columns verified');
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    throw error;
  }
}

/**
 * Complete setup and verification of forking functionality
 */
export async function setupForkingDatabase(): Promise<void> {
  try {
    console.log('🚀 Setting up conversation forking database...');
    
    // First verify if schema already exists
    try {
      await verifyForkingSchema();
      console.log('ℹ️ Schema already exists, skipping migration');
    } catch {
      // Schema doesn't exist, apply migration
      await applyForkingMigration();
      await verifyForkingSchema();
    }
    
    // Verify functions
    await verifyForkingFunctions();
    
    console.log('🎉 Conversation forking database setup complete!');
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupForkingDatabase()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}