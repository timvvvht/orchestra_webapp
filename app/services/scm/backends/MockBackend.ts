/**
 * Mock Backend - SCM implementation for testing and web environments
 * 
 * This backend provides mock implementations of all SCM operations.
 * It's useful for testing, development in web environments, or when
 * real SCM operations are not available.
 */

import { ScmBackend } from './ScmBackend';
import { Commit } from '../types';

export class MockBackend implements ScmBackend {
  private mockCommits: Commit[] = [
    {
      hash: 'abc123def456',
      message: 'Initial commit',
      parents: [],
      authorDate: new Date('2024-01-01T10:00:00Z'),
      authorName: 'Mock Author',
      authorEmail: 'mock@example.com',
      commitDate: new Date('2024-01-01T10:00:00Z'),
    },
    {
      hash: 'def456ghi789',
      message: 'Add new features',
      parents: ['abc123def456'],
      authorDate: new Date('2024-01-02T11:00:00Z'),
      authorName: 'Mock Author',
      authorEmail: 'mock@example.com',
      commitDate: new Date('2024-01-02T11:00:00Z'),
    },
  ];

  private mockCurrentCommit = 'def456ghi789';

  async hasRepository(cwd: string): Promise<boolean> {
    console.warn(`[MockBackend] hasRepository called for: ${cwd}`);
    return true; // Always return true for mock
  }

  async getCurrentCommit(cwd: string): Promise<string | null> {
    console.warn(`[MockBackend] getCurrentCommit called for: ${cwd}`);
    return this.mockCurrentCommit;
  }

  async getHistory(cwd: string, limit: number = 50): Promise<Commit[]> {
    console.warn(`[MockBackend] getHistory called for: ${cwd}, limit: ${limit}`);
    return this.mockCommits.slice(0, limit);
  }

  async checkpoint(cwd: string, message: string): Promise<string> {
    console.warn(`[MockBackend] checkpoint called for: ${cwd}, message: ${message}`);
    
    // Create a mock commit
    const newCommitHash = `mock${Date.now()}`;
    const newCommit: Commit = {
      hash: newCommitHash,
      message,
      parents: [this.mockCurrentCommit],
      authorDate: new Date(),
      authorName: 'Mock Author',
      authorEmail: 'mock@example.com',
      commitDate: new Date(),
    };

    // Add to mock history
    this.mockCommits.unshift(newCommit);
    this.mockCurrentCommit = newCommitHash;

    return newCommitHash;
  }

  async diff(cwd: string, fromSha: string, toSha?: string): Promise<string> {
    console.warn(`[MockBackend] diff called for: ${cwd}, from: ${fromSha}, to: ${toSha || 'working-tree'}`);
    
    return `Mock diff output for ${fromSha}${toSha ? ` to ${toSha}` : ' to working tree'}
--- a/mock_file.txt
+++ b/mock_file.txt
@@ -1,3 +1,4 @@
 line 1
 line 2
+new line added
 line 3`;
  }

  async revert(cwd: string, sha: string): Promise<void> {
    console.warn(`[MockBackend] revert called for: ${cwd}, sha: ${sha}`);
    
    // Update mock current commit
    this.mockCurrentCommit = sha;
  }

  async getFileAtCommit(cwd: string, sha: string, filePath: string): Promise<string> {
    console.warn(`[MockBackend] getFileAtCommit called for: ${cwd}, sha: ${sha}, file: ${filePath}`);
    
    return `Mock file content for ${filePath} at commit ${sha}
This is mock content.
Line 2 of mock content.`;
  }

  async initializeRepository(cwd: string): Promise<void> {
    console.warn(`[MockBackend] initializeRepository called for: ${cwd}`);
    // Mock initialization - no actual work needed
  }

  getBackendType(): string {
    return 'Mock';
  }

  isRealBackend(): boolean {
    return false;
  }

  dispose(): void {
    // No cleanup needed for mock backend
  }
}