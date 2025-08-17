import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LocalToolOrchestrator } from '../LocalToolOrchestrator';
import type { JobInstructionV1 } from '../../../types/JobInstructionV1';
import * as fs from 'fs/promises';
import * as path from 'path';

// These tests require a running Tauri application
const isE2EEnabled = process.env.VITE_E2E === 'true';

describe.skipIf(!isE2EEnabled)('readFiles Truncation Integration Tests', () => {
  let orchestrator: LocalToolOrchestrator;
  let testDir: string;
  let largeFilePath: string;

  beforeAll(async () => {
    orchestrator = new LocalToolOrchestrator();
    
    // Wait for Tauri to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create test directory and files
    testDir = path.join(process.cwd(), 'test-readfiles-truncation');
    await fs.mkdir(testDir, { recursive: true });
    
    // Create a large file that will exceed the token limit
    largeFilePath = path.join(testDir, 'large-file.txt');
    const largeContent = 'A'.repeat(500_000); // 500k chars ≈ 125k tokens
    await fs.writeFile(largeFilePath, largeContent);
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  describe('Token Limit Truncation', () => {
    it('should truncate single large file and indicate truncation', async () => {
      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'truncation-test-1',
        tool_use_id: 'truncation-tool-1',
        session_id: 'truncation-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: [largeFilePath]
        }
      };

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction.tool_input);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Check that the result has the new truncation fields
      expect(result.data).toHaveProperty('truncated');
      expect(result.data).toHaveProperty('truncated_reason');
      expect(result.data.truncated).toBe(true);
      expect(result.data.truncated_reason).toContain('AI tokens limit');
      
      // Check that files array exists and has the expected structure
      expect(result.data).toHaveProperty('files');
      expect(Array.isArray(result.data.files)).toBe(true);
      expect(result.data.files.length).toBe(1);
      
      const fileResult = result.data.files[0];
      expect(fileResult.path).toContain('large-file.txt');
      expect(fileResult.content).toContain('[TRUNCATED:');
      expect(fileResult.content.length).toBeLessThan(500_000);
      expect(fileResult.error).toBeUndefined();
    });

    it('should handle multiple files that exceed token limit', async () => {
      // Create multiple large files
      const files = [];
      for (let i = 0; i < 3; i++) {
        const filePath = path.join(testDir, `large-file-${i}.txt`);
        const content = 'B'.repeat(200_000); // 200k chars ≈ 50k tokens each
        await fs.writeFile(filePath, content);
        files.push(filePath);
      }

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'truncation-test-2',
        tool_use_id: 'truncation-tool-2',
        session_id: 'truncation-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: files
        }
      };

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction.tool_input);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should be truncated due to token limit
      expect(result.data.truncated).toBe(true);
      expect(result.data.truncated_reason).toContain('AI tokens limit');
      
      // Should have processed some but not all files
      expect(result.data.files.length).toBeGreaterThan(0);
      expect(result.data.files.length).toBeLessThan(3);
      
      // All processed files should have no errors
      result.data.files.forEach((file: any) => {
        expect(file.error).toBeUndefined();
      });
    });

    it('should not truncate small files', async () => {
      // Create small files that are well under the limit
      const smallFiles = [];
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(testDir, `small-file-${i}.txt`);
        const content = `Small content ${i}\nJust a few lines.`;
        await fs.writeFile(filePath, content);
        smallFiles.push(filePath);
      }

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'truncation-test-3',
        tool_use_id: 'truncation-tool-3',
        session_id: 'truncation-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: smallFiles
        }
      };

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction.tool_input);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should not be truncated
      expect(result.data.truncated).toBe(false);
      expect(result.data.truncated_reason).toBeUndefined();
      
      // Should have processed all files
      expect(result.data.files.length).toBe(5);
      
      // All files should have correct content
      result.data.files.forEach((file: any, index: number) => {
        expect(file.error).toBeUndefined();
        expect(file.content).toContain(`Small content ${index}`);
      });
    });
  });

  describe('File Count Limit', () => {
    it('should reject requests exceeding MAX_FILES limit', async () => {
      // Create 26 files (MAX_FILES + 1)
      const files = [];
      for (let i = 0; i < 26; i++) {
        const filePath = path.join(testDir, `count-file-${i}.txt`);
        const content = `File ${i} content`;
        await fs.writeFile(filePath, content);
        files.push(filePath);
      }

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'truncation-test-4',
        tool_use_id: 'truncation-tool-4',
        session_id: 'truncation-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: files
        }
      };

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction.tool_input);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many files requested');
      
      // Should still have data with error information
      expect(result.data).toBeDefined();
      expect(result.data.files).toBeDefined();
      expect(result.data.files.length).toBe(1);
      
      const errorFile = result.data.files[0];
      expect(errorFile.path).toBe('<ERROR>');
      expect(errorFile.error).toContain('Too many files requested');
      expect(result.data.truncated).toBe(false);
      expect(result.data.truncated_reason).toContain('Exceeded maximum file limit');
    });

    it('should accept requests exactly at MAX_FILES limit', async () => {
      // Create exactly 25 files (MAX_FILES)
      const files = [];
      for (let i = 0; i < 25; i++) {
        const filePath = path.join(testDir, `max-files-${i}.txt`);
        const content = `File ${i} content`;
        await fs.writeFile(filePath, content);
        files.push(filePath);
      }

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'truncation-test-5',
        tool_use_id: 'truncation-tool-5',
        session_id: 'truncation-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: files
        }
      };

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction.tool_input);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should not be truncated due to file count
      expect(result.data.truncated).toBe(false);
      expect(result.data.truncated_reason).toBeUndefined();
      
      // Should have processed all files
      expect(result.data.files.length).toBe(25);
      
      // All files should have correct content
      result.data.files.forEach((file: any, index: number) => {
        expect(file.error).toBeUndefined();
        expect(file.content).toContain(`File ${index} content`);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with existing code', async () => {
      // Create a simple test file
      const simpleFile = path.join(testDir, 'simple.txt');
      await fs.writeFile(simpleFile, 'Simple content');

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'truncation-test-6',
        tool_use_id: 'truncation-tool-6',
        session_id: 'truncation-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: [simpleFile]
        }
      };

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction.tool_input);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should have the new fields but they should indicate no truncation
      expect(result.data.truncated).toBe(false);
      expect(result.data.truncated_reason).toBeUndefined();
      
      // Should still have the files array that existing code expects
      expect(result.data.files).toBeDefined();
      expect(Array.isArray(result.data.files)).toBe(true);
      expect(result.data.files.length).toBe(1);
      
      const fileResult = result.data.files[0];
      expect(fileResult.path).toContain('simple.txt');
      expect(fileResult.content).toBe('Simple content');
      expect(fileResult.error).toBeUndefined();
    });
  });
});