/**
 * SCMManager Usage Examples
 * 
 * This file demonstrates how to use the refactored SCMManager
 * with different backends and configurations.
 */

import { SCMManager } from '../SCMManager';

// ============================================================================
// BASIC USAGE - Auto-detect backend
// ============================================================================

export async function basicUsageExample() {
  console.log('=== Basic SCMManager Usage ===');
  
  // Create SCMManager with auto-detection
  const scm = new SCMManager();
  
  console.log(`Using backend: ${scm.getBackendType()}`);
  console.log(`Real backend: ${scm.isRealBackend()}`);
  
  const cwd = '/Users/tim/Code/orchestra';
  
  try {
    // Check if repository exists
    const hasRepo = await scm.hasRepository(cwd);
    console.log(`Repository exists: ${hasRepo}`);
    
    // Initialize if needed
    if (!hasRepo) {
      await scm.initializeRepository(cwd);
      console.log('Repository initialized');
    }
    
    // Create a checkpoint
    const commitHash = await scm.checkpoint(cwd, 'Example checkpoint from refactored SCMManager');
    console.log(`Created checkpoint: ${commitHash}`);
    
    // Get history
    const history = await scm.getHistory(cwd, 5);
    console.log(`Found ${history.length} commits:`);
    history.forEach((commit, i) => {
      console.log(`  ${i + 1}. ${commit.hash.substring(0, 8)} - ${commit.message}`);
    });
    
    // Get current commit
    const currentCommit = await scm.getCurrentCommit(cwd);
    console.log(`Current commit: ${currentCommit?.substring(0, 8)}`);
    
  } catch (error) {
    console.error('SCM operation failed:', error);
  } finally {
    scm.dispose();
  }
}

// ============================================================================
// FORCE RUST BACKEND - For Tauri environments
// ============================================================================

export async function forceRustBackendExample() {
  console.log('=== Force Rust Backend Example ===');
  
  // Force Rust/Tauri backend
  const scm = new SCMManager({ 
    forceBackend: 'rust',
    allowMockFallback: false // Fail if Rust backend not available
  });
  
  console.log(`Using backend: ${scm.getBackendType()}`);
  
  const cwd = '/Users/tim/Code/orchestra';
  
  try {
    // This will use the Rust SCM implementation via Tauri IPC
    const commitHash = await scm.checkpoint(cwd, 'Checkpoint from Rust backend');
    console.log(`Rust backend created checkpoint: ${commitHash}`);
    
    // Get diff between last two commits
    const history = await scm.getHistory(cwd, 2);
    if (history.length >= 2) {
      const diff = await scm.diff(cwd, history[1].hash, history[0].hash);
      console.log('Diff between last two commits:');
      console.log(diff.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('Rust backend operation failed:', error);
    console.log('Make sure you are running in a Tauri environment');
  } finally {
    scm.dispose();
  }
}

// ============================================================================
// FORCE NODE.JS BACKEND - For Node.js environments
// ============================================================================

export async function forceNodeBackendExample() {
  console.log('=== Force Node.js Backend Example ===');
  
  // Force Node.js backend with custom options
  const scm = new SCMManager({ 
    forceBackend: 'nodejs',
    gitPath: 'git', // Custom git path if needed
    userAgent: 'Orchestra-SCM-Example/1.0.0'
  });
  
  console.log(`Using backend: ${scm.getBackendType()}`);
  
  const cwd = '/Users/tim/Code/orchestra';
  
  try {
    // This will use Node.js child_process to execute git commands
    const commitHash = await scm.checkpoint(cwd, 'Checkpoint from Node.js backend');
    console.log(`Node.js backend created checkpoint: ${commitHash}`);
    
    // Demonstrate revert functionality
    const history = await scm.getHistory(cwd, 3);
    if (history.length >= 2) {
      const previousCommit = history[1].hash;
      console.log(`Reverting to previous commit: ${previousCommit.substring(0, 8)}`);
      
      // Note: Be careful with revert in real usage!
      // await scm.revert(cwd, previousCommit);
      console.log('(Revert commented out for safety)');
    }
    
  } catch (error) {
    console.error('Node.js backend operation failed:', error);
  } finally {
    scm.dispose();
  }
}

// ============================================================================
// MOCK BACKEND - For testing and development
// ============================================================================

export async function mockBackendExample() {
  console.log('=== Mock Backend Example ===');
  
  // Force mock backend for testing
  const scm = new SCMManager({ 
    forceBackend: 'mock'
  });
  
  console.log(`Using backend: ${scm.getBackendType()}`);
  console.log(`Real backend: ${scm.isRealBackend()}`);
  
  const cwd = '/any/path/works/with/mock';
  
  try {
    // All operations will be mocked
    const hasRepo = await scm.hasRepository(cwd);
    console.log(`Mock repository exists: ${hasRepo}`);
    
    const commitHash = await scm.checkpoint(cwd, 'Mock checkpoint');
    console.log(`Mock checkpoint created: ${commitHash}`);
    
    const history = await scm.getHistory(cwd);
    console.log(`Mock history has ${history.length} commits`);
    
    const diff = await scm.diff(cwd, 'abc123', 'def456');
    console.log('Mock diff output:');
    console.log(diff);
    
  } catch (error) {
    console.error('Mock backend operation failed:', error);
  } finally {
    scm.dispose();
  }
}

// ============================================================================
// BACKEND SWITCHING - Dynamic backend changes
// ============================================================================

export async function backendSwitchingExample() {
  console.log('=== Backend Switching Example ===');
  
  // Start with auto-detection
  const scm = new SCMManager();
  console.log(`Initial backend: ${scm.getBackendType()}`);
  
  const cwd = '/Users/tim/Code/orchestra';
  
  try {
    // Try with initial backend
    let history = await scm.getHistory(cwd, 1);
    console.log(`${scm.getBackendType()} backend found ${history.length} commits`);
    
    // Switch to mock backend
    scm.switchBackend('mock');
    console.log(`Switched to: ${scm.getBackendType()}`);
    
    history = await scm.getHistory(cwd, 1);
    console.log(`${scm.getBackendType()} backend found ${history.length} commits`);
    
    // Switch back to auto-detected backend
    if (scm.getBackendType() !== 'Mock') {
      // Already using real backend
    } else {
      // Try to switch to a real backend
      try {
        scm.switchBackend('rust');
        console.log(`Switched to: ${scm.getBackendType()}`);
      } catch (error) {
        console.log('Rust backend not available, staying with mock');
      }
    }
    
  } catch (error) {
    console.error('Backend switching example failed:', error);
  } finally {
    scm.dispose();
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export async function runAllExamples() {
  console.log('🚀 Running SCMManager Examples\n');
  
  await basicUsageExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await mockBackendExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await backendSwitchingExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Only run these if in appropriate environments
  try {
    await forceRustBackendExample();
  } catch (error) {
    console.log('Skipping Rust backend example (not in Tauri environment)');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    await forceNodeBackendExample();
  } catch (error) {
    console.log('Skipping Node.js backend example (not in Node environment)');
  }
  
  console.log('\n✅ All examples completed!');
}

// Uncomment to run examples
// runAllExamples().catch(console.error);