/**
 * Integration Tests for SimpleSCMManager
 * 
 * Tests the 3 core functionalities:
 * 1. checkpoint() - Create commits
 * 2. diff() - Generate diffs
 * 3. revert() - Revert to commits
 */

import { SimpleSCMManager } from '../SimpleSCMManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SimpleSCMManager Integration Tests', () => {
  let scmManager: SimpleSCMManager;
  let testWorkspace: string;

  beforeEach(() => {
    scmManager = new SimpleSCMManager();
    // Create a temporary test workspace
    testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'scm-test-'));
  });

  afterEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  describe('Repository Initialization', () => {
    test('should initialize .orchestra repository on first use', async () => {
      // Create a test file
      const testFile = path.join(testWorkspace, 'test.txt');
      fs.writeFileSync(testFile, 'Hello World');

      // First checkpoint should initialize the repo
      const hash = await scmManager.checkpoint(testWorkspace, 'Initial commit');

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('no-changes');
      expect(scmManager.hasRepository(testWorkspace)).toBe(true);
      
      // Check that .orchestra directory exists
      const orchestraDir = path.join(testWorkspace, '.orchestra');
      expect(fs.existsSync(orchestraDir)).toBe(true);
      expect(fs.existsSync(path.join(orchestraDir, '.git'))).toBe(true);
    });

    test('should reuse existing repository', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testWorkspace, 'file1.txt'), 'Content 1');
      const hash1 = await scmManager.checkpoint(testWorkspace, 'First commit');

      // Create second commit
      fs.writeFileSync(path.join(testWorkspace, 'file2.txt'), 'Content 2');
      const hash2 = await scmManager.checkpoint(testWorkspace, 'Second commit');

      expect(hash1).not.toBe(hash2);
      expect(scmManager.hasRepository(testWorkspace)).toBe(true);
    });
  });

  describe('Checkpoint Functionality', () => {
    test('should create checkpoint with new files', async () => {
      // Create test files
      fs.writeFileSync(path.join(testWorkspace, 'file1.txt'), 'Hello');
      fs.writeFileSync(path.join(testWorkspace, 'file2.txt'), 'World');

      const hash = await scmManager.checkpoint(testWorkspace, 'Add test files');

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('no-changes');
      expect(hash.length).toBe(40); // Git SHA-1 hash length
    });

    test('should create checkpoint with modified files', async () => {
      // Initial commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Original content');
      const hash1 = await scmManager.checkpoint(testWorkspace, 'Initial');

      // Modify file
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Modified content');
      const hash2 = await scmManager.checkpoint(testWorkspace, 'Modified');

      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe('no-changes');
    });

    test('should return no-changes when no modifications', async () => {
      // Initial commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content');
      await scmManager.checkpoint(testWorkspace, 'Initial');

      // Try to commit again without changes
      const result = await scmManager.checkpoint(testWorkspace, 'No changes');

      expect(result).toBe('no-changes');
    });

    test('should handle nested directories', async () => {
      // Create nested structure
      const nestedDir = path.join(testWorkspace, 'nested', 'deep');
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(path.join(nestedDir, 'nested-file.txt'), 'Nested content');

      const hash = await scmManager.checkpoint(testWorkspace, 'Add nested files');

      expect(hash).not.toBe('no-changes');
      
      // Verify nested file is tracked
      const history = await scmManager.getHistory(testWorkspace, 1);
      expect(history[0].message).toBe('Add nested files');
    });
  });

  describe('Diff Functionality', () => {
    test('should generate diff between commits', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Original content\nLine 2\n');
      const hash1 = await scmManager.checkpoint(testWorkspace, 'Initial');

      // Create second commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Modified content\nLine 2\nLine 3\n');
      const hash2 = await scmManager.checkpoint(testWorkspace, 'Modified');

      const diff = await scmManager.diff(testWorkspace, hash1, hash2);

      expect(diff).toContain('diff --git');
      expect(diff).toContain('-Original content');
      expect(diff).toContain('+Modified content');
      expect(diff).toContain('+Line 3');
    });

    test('should generate diff from commit to working tree', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Original content');
      const hash = await scmManager.checkpoint(testWorkspace, 'Initial');

      // Modify file without committing
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Working tree content');

      const diff = await scmManager.diff(testWorkspace, hash);

      expect(diff).toContain('diff --git');
      expect(diff).toContain('-Original content');
      expect(diff).toContain('+Working tree content');
    });

    test('should handle empty diff', async () => {
      // Create commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content');
      const hash = await scmManager.checkpoint(testWorkspace, 'Initial');

      // Diff with itself should be empty
      const diff = await scmManager.diff(testWorkspace, hash, hash);

      expect(diff).toBe('');
    });

    test('should handle multiple file changes', async () => {
      // Initial commit
      fs.writeFileSync(path.join(testWorkspace, 'file1.txt'), 'File 1 content');
      fs.writeFileSync(path.join(testWorkspace, 'file2.txt'), 'File 2 content');
      const hash1 = await scmManager.checkpoint(testWorkspace, 'Initial');

      // Modify both files
      fs.writeFileSync(path.join(testWorkspace, 'file1.txt'), 'Modified file 1');
      fs.writeFileSync(path.join(testWorkspace, 'file2.txt'), 'Modified file 2');
      const hash2 = await scmManager.checkpoint(testWorkspace, 'Modified both');

      const diff = await scmManager.diff(testWorkspace, hash1, hash2);

      expect(diff).toContain('file1.txt');
      expect(diff).toContain('file2.txt');
      expect(diff).toContain('-File 1 content');
      expect(diff).toContain('+Modified file 1');
      expect(diff).toContain('-File 2 content');
      expect(diff).toContain('+Modified file 2');
    });
  });

  describe('Revert Functionality', () => {
    test('should revert to previous commit', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Original content');
      const hash1 = await scmManager.checkpoint(testWorkspace, 'Initial');

      // Create second commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Modified content');
      fs.writeFileSync(path.join(testWorkspace, 'new-file.txt'), 'New file');
      await scmManager.checkpoint(testWorkspace, 'Modified');

      // Revert to first commit
      await scmManager.revert(testWorkspace, hash1);

      // Check that files are reverted
      const fileContent = fs.readFileSync(path.join(testWorkspace, 'file.txt'), 'utf8');
      expect(fileContent).toBe('Original content');
      expect(fs.existsSync(path.join(testWorkspace, 'new-file.txt'))).toBe(false);
    });

    test('should handle revert with nested directories', async () => {
      // Create initial structure
      const nestedDir = path.join(testWorkspace, 'nested');
      fs.mkdirSync(nestedDir);
      fs.writeFileSync(path.join(nestedDir, 'nested-file.txt'), 'Nested content');
      const hash1 = await scmManager.checkpoint(testWorkspace, 'Initial with nested');

      // Add more files
      fs.writeFileSync(path.join(testWorkspace, 'root-file.txt'), 'Root content');
      fs.writeFileSync(path.join(nestedDir, 'another-nested.txt'), 'Another nested');
      await scmManager.checkpoint(testWorkspace, 'Added more files');

      // Revert
      await scmManager.revert(testWorkspace, hash1);

      // Check structure
      expect(fs.existsSync(path.join(nestedDir, 'nested-file.txt'))).toBe(true);
      expect(fs.existsSync(path.join(testWorkspace, 'root-file.txt'))).toBe(false);
      expect(fs.existsSync(path.join(nestedDir, 'another-nested.txt'))).toBe(false);
      
      const nestedContent = fs.readFileSync(path.join(nestedDir, 'nested-file.txt'), 'utf8');
      expect(nestedContent).toBe('Nested content');
    });

    test('should preserve .orchestra directory during revert', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content');
      const hash = await scmManager.checkpoint(testWorkspace, 'Initial');

      // Revert (should not affect .orchestra)
      await scmManager.revert(testWorkspace, hash);

      // .orchestra should still exist
      expect(fs.existsSync(path.join(testWorkspace, '.orchestra'))).toBe(true);
      expect(fs.existsSync(path.join(testWorkspace, '.orchestra', '.git'))).toBe(true);
    });
  });

  describe('History and Utility Functions', () => {
    test('should get commit history', async () => {
      // Create multiple commits
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content 1');
      await scmManager.checkpoint(testWorkspace, 'First commit');

      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content 2');
      await scmManager.checkpoint(testWorkspace, 'Second commit');

      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content 3');
      await scmManager.checkpoint(testWorkspace, 'Third commit');

      const history = await scmManager.getHistory(testWorkspace, 5);

      expect(history).toHaveLength(3);
      expect(history[0].message).toBe('Third commit');
      expect(history[1].message).toBe('Second commit');
      expect(history[2].message).toBe('First commit');
      
      // Check that all commits have required fields
      history.forEach(commit => {
        expect(commit.hash).toBeTruthy();
        expect(commit.hash.length).toBe(40);
        expect(commit.message).toBeTruthy();
        expect(commit.timestamp).toBeInstanceOf(Date);
        expect(commit.author).toBe('Orchestra SCM');
      });
    });

    test('should get current commit hash', async () => {
      // No commits initially
      const initialHash = await scmManager.getCurrentCommit(testWorkspace);
      expect(initialHash).toBeNull();

      // Create commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content');
      const commitHash = await scmManager.checkpoint(testWorkspace, 'Test commit');

      const currentHash = await scmManager.getCurrentCommit(testWorkspace);
      expect(currentHash).toBe(commitHash);
    });

    test('should check repository existence', async () => {
      expect(scmManager.hasRepository(testWorkspace)).toBe(false);

      // Create first commit
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content');
      await scmManager.checkpoint(testWorkspace, 'Initial');

      expect(scmManager.hasRepository(testWorkspace)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid commit hash in diff', async () => {
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content');
      await scmManager.checkpoint(testWorkspace, 'Initial');

      await expect(
        scmManager.diff(testWorkspace, 'invalid-hash')
      ).rejects.toThrow('Diff failed');
    });

    test('should handle invalid commit hash in revert', async () => {
      fs.writeFileSync(path.join(testWorkspace, 'file.txt'), 'Content');
      await scmManager.checkpoint(testWorkspace, 'Initial');

      await expect(
        scmManager.revert(testWorkspace, 'invalid-hash')
      ).rejects.toThrow('Revert failed');
    });

    test('should handle non-existent workspace', async () => {
      const nonExistentPath = path.join(os.tmpdir(), 'definitely-non-existent-' + Math.random().toString(36) + '-' + Date.now());
      
      // Ensure the path doesn't exist and clean up if it somehow does
      if (fs.existsSync(nonExistentPath)) {
        fs.rmSync(nonExistentPath, { recursive: true, force: true });
      }
      expect(fs.existsSync(nonExistentPath)).toBe(false);
      
      await expect(
        scmManager.checkpoint(nonExistentPath, 'Test')
      ).rejects.toThrow('Workspace directory does not exist');
    });
  });

  describe('End-to-End Workflow', () => {
    test('should support complete checkpoint -> diff -> revert workflow', async () => {
      // Step 1: Create initial state
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello");');
      fs.writeFileSync(path.join(testWorkspace, 'README.md'), '# My Project');
      const checkpoint1 = await scmManager.checkpoint(testWorkspace, 'Initial project setup');

      // Step 2: Make changes
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello World!");');
      fs.writeFileSync(path.join(testWorkspace, 'package.json'), '{"name": "test"}');
      const checkpoint2 = await scmManager.checkpoint(testWorkspace, 'Added package.json and updated app.js');

      // Step 3: Make more changes
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello Universe!");');
      fs.unlinkSync(path.join(testWorkspace, 'README.md'));
      const checkpoint3 = await scmManager.checkpoint(testWorkspace, 'Updated app.js, removed README');

      // Step 4: Check diff between checkpoints
      const diff1to2 = await scmManager.diff(testWorkspace, checkpoint1, checkpoint2);
      expect(diff1to2).toContain('Hello World!');
      expect(diff1to2).toContain('package.json');

      const diff2to3 = await scmManager.diff(testWorkspace, checkpoint2, checkpoint3);
      expect(diff2to3).toContain('Hello Universe!');
      expect(diff2to3).toContain('README.md');

      // Step 5: Revert to checkpoint 1
      await scmManager.revert(testWorkspace, checkpoint1);

      // Step 6: Verify revert worked
      const appContent = fs.readFileSync(path.join(testWorkspace, 'app.js'), 'utf8');
      expect(appContent).toBe('console.log("Hello");');
      expect(fs.existsSync(path.join(testWorkspace, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(testWorkspace, 'package.json'))).toBe(false);

      // Step 7: Check history (after revert, only the first commit should remain)
      const history = await scmManager.getHistory(testWorkspace);
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Initial project setup');
    });
  });
});