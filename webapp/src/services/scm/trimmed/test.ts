/**
 * Test Script for Orchestra SCM
 * Tests checkpoint, revert, and diff functionality in /Users/tim/Code/A2A
 */

import * as path from 'path';
import * as fs from 'fs';
import { OrchestraSCM } from './OrchestraSCM';

async function runTests() {
  console.log('🧪 Testing Orchestra SCM...\n');
  
  const testDir = '/Users/tim/Code/A2A';
  const scm = await OrchestraSCM.create();
  
  try {
    // Test 1: Create initial checkpoint
    console.log('📝 Test 1: Creating initial checkpoint...');
    
    // Create a test file
    const testFile = path.join(testDir, 'test-scm.txt');
    await fs.promises.writeFile(testFile, 'Initial content\nLine 2\n', 'utf8');
    
    const checkpoint1 = await scm.checkpoint(testDir, 'Initial checkpoint');
    console.log(`✅ Created checkpoint: ${checkpoint1}`);
    
    // Test 2: Modify file and create second checkpoint
    console.log('\n📝 Test 2: Modifying file and creating second checkpoint...');
    
    await fs.promises.writeFile(testFile, 'Modified content\nLine 2\nLine 3 added\n', 'utf8');
    
    const checkpoint2 = await scm.checkpoint(testDir, 'Added line 3');
    console.log(`✅ Created checkpoint: ${checkpoint2}`);
    
    // Test 3: Get diff between checkpoints
    console.log('\n📝 Test 3: Getting diff between checkpoints...');
    
    const diff = await scm.diff(testDir, checkpoint1, checkpoint2);
    console.log('✅ Diff output:');
    console.log(diff);
    
    // Test 4: Get history
    console.log('\n📝 Test 4: Getting commit history...');
    
    const history = await scm.history(testDir, 10);
    console.log(`✅ Found ${history.length} commits:`);
    history.forEach((commit, i) => {
      console.log(`  ${i + 1}. ${commit.hash.substring(0, 8)} - ${commit.message}`);
    });
    
    // Test 5: Revert to first checkpoint
    console.log('\n📝 Test 5: Reverting to first checkpoint...');
    
    await scm.revert(testDir, checkpoint1);
    
    const revertedContent = await fs.promises.readFile(testFile, 'utf8');
    console.log('✅ File content after revert:');
    console.log(revertedContent);
    
    // Test 6: Create another checkpoint after revert
    console.log('\n📝 Test 6: Creating checkpoint after revert...');
    
    await fs.promises.writeFile(testFile, 'Initial content\nLine 2\nNew line after revert\n', 'utf8');
    
    const checkpoint3 = await scm.checkpoint(testDir, 'Added line after revert');
    console.log(`✅ Created checkpoint: ${checkpoint3}`);
    
    // Test 7: Get current commit
    console.log('\n📝 Test 7: Getting current commit...');
    
    const currentCommit = await scm.getCurrentCommit(testDir);
    console.log(`✅ Current commit: ${currentCommit}`);
    
    // Test 8: Get file at specific commit
    console.log('\n📝 Test 8: Getting file content at specific commit...');
    
    const fileAtCommit = await scm.getFileAtCommit(testDir, checkpoint2, testFile);
    console.log('✅ File content at checkpoint2:');
    console.log(fileAtCommit);
    
    // Test 9: Test no-changes scenario
    console.log('\n📝 Test 9: Testing no-changes checkpoint...');
    
    const noChangesResult = await scm.checkpoint(testDir, 'No changes');
    console.log(`✅ No changes result: ${noChangesResult}`);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    scm.dispose();
    
    // Remove test file
    try {
      const testFile = path.join(testDir, 'test-scm.txt');
      await fs.promises.unlink(testFile);
      console.log('\n🧹 Cleaned up test file');
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };