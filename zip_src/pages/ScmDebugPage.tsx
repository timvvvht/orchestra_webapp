import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SCMManager } from '../services/scm/SCMManager';
import { Commit } from '../services/scm/types';
import { DiffViewer } from '../components/DiffViewer';
import { AdvancedMonacoDiffViewer, detectLanguage } from '../components/AdvancedMonacoDiffViewer';
import { parseUnifiedDiff, parseRawDiff, parseMultiFileDiff } from '../utils/diffParser';





interface ScmStatus {
  initialized: boolean;
  workspace_path: string;
  current_commit?: string;
  last_checkpoint?: Commit;
  total_checkpoints: number;
}

interface DiffFile {
  id: string;
  filename: string;
  filepath: string;
  originalContent: string;
  modifiedContent: string;
  currentContent: string;
  language: string;
  hasUnsavedChanges: boolean;
}

interface CommitStats {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
}



export default function ScmDebugPage() {
  const [scmStatus, setScmStatus] = useState<ScmStatus | null>(null);
  const [scmHistory, setScmHistory] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testWorkspacePath, setTestWorkspacePath] = useState('/tmp/scm-debug-workspace');
  const [commitMessage, setCommitMessage] = useState('Debug checkpoint at ' + new Date().toLocaleTimeString());
  
  // Diff viewer state
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [diffData, setDiffData] = useState<{
    originalContent: string;
    modifiedContent: string;
    originalTitle: string;
    modifiedTitle: string;
    language?: string;
  } | null>(null);
  
  // Advanced multi-file diff viewer state
  const [showAdvancedDiffViewer, setShowAdvancedDiffViewer] = useState(false);
  const [diffFiles, setDiffFiles] = useState<DiffFile[]>([]);
  
  // Commit statistics state
  const [commitStats, setCommitStats] = useState<Map<string, CommitStats>>(new Map());
  
  // Initialize SCM Manager - it will auto-detect the best backend
  const [scmManager] = useState(() => new SCMManager());

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Calculate commit statistics from diff
  const calculateCommitStats = async (commitHash: string): Promise<CommitStats> => {
    try {
      const diff = await scmManager.diff(testWorkspacePath, commitHash);
      
      // Simple diff parsing to count changes
      const lines = diff.split('\n');
      let linesAdded = 0;
      let linesRemoved = 0;
      const changedFiles = new Set<string>();
      
      for (const line of lines) {
        // Only count 'diff --git' lines to avoid double-counting files
        if (line.startsWith('diff --git')) {
          const match = line.match(/diff --git a\/(.+) b\/(.+)/);
          if (match) {
            changedFiles.add(match[1]); // Add the filename (both a/ and b/ should be the same)
          }
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          linesAdded++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          linesRemoved++;
        }
      }
      
      const filesChanged = changedFiles.size;
      
      return { filesChanged, linesAdded, linesRemoved };
    } catch (error) {
      // Return default stats if calculation fails
      return { filesChanged: 0, linesAdded: 0, linesRemoved: 0 };
    }
  };

  // Load SCM status
  const loadScmStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      addLog(`Loading SCM status...`);
      const hasRepo = await scmManager.hasRepository(testWorkspacePath);
      let currentCommit: string | undefined;
      let history: Commit[] = [];

      if (hasRepo) {
        currentCommit = await scmManager.getCurrentCommit(testWorkspacePath) || undefined;
        history = await scmManager.getHistory(testWorkspacePath, 1);
      }
      
      const status: ScmStatus = {
        initialized: hasRepo,
        workspace_path: testWorkspacePath,
        current_commit: currentCommit,
        last_checkpoint: history.length > 0 ? history[0] : undefined,
        total_checkpoints: (await scmManager.getHistory(testWorkspacePath)).length
      };
      
      setScmStatus(status);
      addLog(`SCM status loaded: Repository ${hasRepo ? 'exists' : 'not found'}, ${status.total_checkpoints} commits`);
      addLog(`Backend: ${scmManager.getBackendType()}`);
    } catch (err) {
      const errorMsg = `Failed to load SCM status: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load SCM history
  const loadScmHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      addLog('Loading SCM history...');
      const history = await scmManager.getHistory(testWorkspacePath);
      setScmHistory(history);
      addLog(`Loaded ${history.length} history entries`);
      
      // Calculate statistics for each commit
      addLog('Calculating commit statistics...');
      const statsMap = new Map<string, CommitStats>();
      
      for (const commit of history) {
        try {
          const stats = await calculateCommitStats(commit.hash);
          statsMap.set(commit.hash, stats);
        } catch (error) {
          // Skip stats for commits that fail
          addLog(`⚠️ Failed to calculate stats for commit ${commit.hash.substring(0, 8)}`);
        }
      }
      
      setCommitStats(statsMap);
      addLog(`✅ Calculated statistics for ${statsMap.size} commits`);
    } catch (err) {
      const errorMsg = `Failed to load SCM history: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual checkpoint
  const triggerCheckpoint = async () => {
    setLoading(true);
    setError(null);
    try {
      addLog(`Creating checkpoint: "${commitMessage}"`);
      const commitHash = await scmManager.checkpoint(testWorkspacePath, commitMessage);
      
      if (commitHash === 'no-changes') {
        addLog(`⚠️ No changes to commit`);
      } else {
        addLog(`✅ Successfully created checkpoint: ${commitHash.substring(0, 8)}`);
      }
      
      // Update commit message with new timestamp
      setCommitMessage('Debug checkpoint at ' + new Date().toLocaleTimeString());
      
      // Refresh status and history
      await loadScmStatus();
      await loadScmHistory();
    } catch (err) {
      const errorMsg = `Failed to create checkpoint: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  
  // Initialize SCM workspace
  const initializeScmWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      addLog(`Initializing SCM workspace at: ${testWorkspacePath}`);
      
      // Create the workspace directory if it doesn't exist
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const { mkdir } = await import('@tauri-apps/plugin-fs');
        try {
          await mkdir(testWorkspacePath, { recursive: true });
          addLog(`✅ Created workspace directory: ${testWorkspacePath}`);
        } catch (err) {
          // Directory might already exist, that's okay
          addLog(`Directory already exists or created: ${testWorkspacePath}`);
        }
      }
      
      // Mock repository initialization
      await scmManager.initializeRepository(testWorkspacePath);
      addLog('✅ SCM repository initialized');
      
      // Refresh status
      await loadScmStatus();
      await loadScmHistory();
    } catch (err) {
      const errorMsg = `Failed to initialize SCM workspace: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Get advanced multi-file diff between commits
  const getAdvancedDiff = async (fromSha: string, toSha?: string) => {
    setLoading(true);
    setError(null);
    try {
      addLog(`Getting advanced diff from ${fromSha.substring(0, 8)}${toSha ? ` to ${toSha.substring(0, 8)}` : ' to working directory'}...`);
      
      const diff = await scmManager.diff(testWorkspacePath, fromSha, toSha);
      
      addLog(`✅ Diff retrieved (${diff.length} characters)`);
      console.log('Diff output:', diff);
      
      // Parse the multi-file diff
      let parsedMultiDiff;
      try {
        parsedMultiDiff = parseMultiFileDiff(diff);
        addLog(`📝 Successfully parsed multi-file diff: ${parsedMultiDiff.files.length} files`);
      } catch (parseError) {
        addLog(`⚠️ Failed to parse multi-file diff, falling back to single file: ${parseError}`);
        // Fallback to single file parsing
        try {
          const singleParsed = parseUnifiedDiff(diff);
          parsedMultiDiff = { files: [singleParsed] };
        } catch (singleParseError) {
          addLog(`⚠️ Failed to parse as single file, using raw diff: ${singleParseError}`);
          const rawParsed = parseRawDiff(diff);
          parsedMultiDiff = { files: [rawParsed] };
        }
      }
      
      // Create DiffFile objects for advanced viewer
      const diffFiles: DiffFile[] = parsedMultiDiff.files.map((parsedFile, index) => {
        const language = detectLanguage(parsedFile.fileName || '');
        
        return {
          id: `${fromSha}-${toSha || 'working'}-${index}-${Date.now()}`,
          filename: parsedFile.fileName || `file-${index + 1}`,
          filepath: parsedFile.fileName || `file-${index + 1}`,
          originalContent: parsedFile.originalContent,
          modifiedContent: parsedFile.modifiedContent,
          currentContent: parsedFile.modifiedContent,
          language,
          hasUnsavedChanges: false
        };
      });
      
      addLog(`🚀 Created ${diffFiles.length} diff files for advanced viewer`);
      setDiffFiles(diffFiles);
      setShowAdvancedDiffViewer(true);
    } catch (err) {
      const errorMsg = `Failed to get advanced diff: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Get diff between commits (original function)
  const getDiff = async (fromSha: string, toSha?: string) => {
    setLoading(true);
    setError(null);
    try {
      addLog(`Getting diff from ${fromSha.substring(0, 8)}${toSha ? ` to ${toSha.substring(0, 8)}` : ' to working directory'}...`);
      
      const diff = await scmManager.diff(testWorkspacePath, fromSha, toSha);
      
      addLog(`✅ Diff retrieved (${diff.length} characters)`);
      console.log('Diff output:', diff);
      
      // Parse the diff using our improved parser
      let parsedDiff;
      try {
        parsedDiff = parseUnifiedDiff(diff);
        addLog(`📝 Successfully parsed unified diff for file: ${parsedDiff.fileName || 'unknown'}`);
      } catch (parseError) {
        addLog(`⚠️ Failed to parse unified diff, using raw diff: ${parseError}`);
        parsedDiff = parseRawDiff(diff);
      }
      
      // Detect language for syntax highlighting
      const language = detectLanguage(parsedDiff.fileName);
      
      setDiffData({
        originalContent: parsedDiff.originalContent,
        modifiedContent: parsedDiff.modifiedContent,
        originalTitle: `Commit ${fromSha.substring(0, 8)}${parsedDiff.fileName ? ` (${parsedDiff.fileName})` : ''}`,
        modifiedTitle: toSha ? `Commit ${toSha.substring(0, 8)}${parsedDiff.fileName ? ` (${parsedDiff.fileName})` : ''}` : `Working Directory${parsedDiff.fileName ? ` (${parsedDiff.fileName})` : ''}`,
        language
      });
      setShowDiffViewer(true);
    } catch (err) {
      const errorMsg = `Failed to get diff: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle saving a file from the advanced diff viewer
  const handleSaveFile = async (file: DiffFile) => {
    addLog(`Saving file: ${file.filename}`);
    
    try {
      // Write the current content to the file system
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        // Tauri environment - use Tauri file system API
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(file.filepath, file.currentContent);
        addLog(`✅ File ${file.filename} saved to disk successfully`);
      } else {
        // Browser/development environment - simulate file write
        addLog(`✅ File ${file.filename} saved successfully (simulated in browser)`);
        
        // In a real web environment, you'd need to send the content to a backend API
        // Example: await fetch('/api/files/save', { method: 'POST', body: JSON.stringify({ path: file.filepath, content: file.currentContent }) });
      }
      
      // Refresh the SCM status after save to reflect the file system changes
      await loadScmStatus();
      
      // Optionally trigger a new checkpoint after saving
      // await triggerCheckpoint();
    } catch (error) {
      addLog(`❌ Failed to save file ${file.filename}: ${error}`);
      throw error;
    }
  };

  // Handle reverting a file from the advanced diff viewer
  const handleRevertFile = async (file: DiffFile) => {
    addLog(`Reverting file: ${file.filename} to original version`);
    
    try {
      // Write the original content back to the file system
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        // Tauri environment - use Tauri file system API
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(file.filepath, file.originalContent);
        addLog(`✅ File ${file.filename} reverted to disk successfully`);
      } else {
        // Browser/development environment - simulate file write
        addLog(`✅ File ${file.filename} reverted successfully (simulated in browser)`);
        
        // In a real web environment, you'd need to send the content to a backend API
        // Example: await fetch('/api/files/revert', { method: 'POST', body: JSON.stringify({ path: file.filepath, content: file.originalContent }) });
      }
      
      // Refresh the SCM status after revert to reflect the file system changes
      await loadScmStatus();
      await loadScmHistory(); // Also refresh history in case this creates a new state
    } catch (error) {
      addLog(`❌ Failed to revert file ${file.filename}: ${error}`);
      throw error;
    }
  };

  // Revert to a specific commit
  const revertToCommit = async (sha: string) => {
    if (!confirm(`Are you sure you want to revert to commit ${sha.substring(0, 8)}? This will discard all changes after this commit.`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      addLog(`Reverting to commit ${sha.substring(0, 8)}...`);
      
      // Mock revert operation
      await scmManager.revert(testWorkspacePath, sha);
      
      addLog(`✅ Successfully reverted to commit ${sha.substring(0, 8)}`);
      
      // Refresh status and history
      await loadScmStatus();
      await loadScmHistory();
    } catch (err) {
      const errorMsg = `Failed to revert: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadScmStatus();
    loadScmHistory();
  }, [testWorkspacePath]); // Re-run when workspace path changes

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-center">🦀 Rust SCM Debug Interface</h1>
          <p className="text-gray-400 text-center">
            Test and verify the new Rust-based SCM (Source Code Management) implementation
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-red-400">❌</span>
              <span className="text-red-300">{error}</span>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Status & Controls */}
          <div className="space-y-6">
            {/* SCM Status */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">📊 SCM Status</h2>
                <button
                  onClick={loadScmStatus}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm transition-colors"
                >
                  {loading ? '⏳' : '🔄'} Refresh
                </button>
              </div>
              
              {scmStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${scmStatus.initialized ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-sm">
                      Status: {scmStatus.initialized ? 'Initialized' : 'Not Initialized'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    <div>Workspace: {scmStatus.workspace_path}</div>
                    <div>Current Commit: {scmStatus.current_commit ? scmStatus.current_commit.substring(0, 8) : 'none'}</div>
                    <div>Total Commits: {scmStatus.total_checkpoints}</div>
                  </div>
                  {scmStatus.last_checkpoint && (
                    <div className="mt-3 p-3 bg-gray-800 rounded">
                      <div className="text-sm font-medium">Last Commit:</div>
                      <div className="text-xs text-gray-400 mt-1">
                        <div>Hash: {scmStatus.last_checkpoint.hash.substring(0, 8)}</div>
                        <div>Message: {scmStatus.last_checkpoint.message}</div>
                        <div>Author: {scmStatus.last_checkpoint.authorName || 'Unknown'}</div>
                        <div>Time: {scmStatus.last_checkpoint.authorDate.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400">Loading status...</div>
              )}
            </div>

            {/* Manual Checkpoint Controls */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">🎮 Rust SCM Controls</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Workspace Path:</label>
                  <input
                    type="text"
                    value={testWorkspacePath}
                    onChange={(e) => setTestWorkspacePath(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                    placeholder="/tmp/scm-debug-workspace"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Commit Message:</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                    placeholder="Enter commit message"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={triggerCheckpoint}
                    disabled={loading || !commitMessage}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded transition-colors"
                  >
                    📝 Create Checkpoint
                  </button>
                </div>
              </div>
            </div>



            {/* Quick Actions */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={initializeScmWorkspace}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded transition-colors"
                >
                  🔧 Initialize Rust SCM Repository
                </button>
                
                <button
                  onClick={loadScmHistory}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded transition-colors"
                >
                  📜 Reload History
                </button>
                
                <button
                  onClick={clearLogs}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
                >
                  🧹 Clear Logs
                </button>
                
                <button
                  onClick={() => {
                    // Demo the advanced diff viewer with multiple sample files
                    const sampleDiffFiles: DiffFile[] = [
                      {
                        id: 'demo-1-' + Date.now(),
                        filename: 'UserService.ts',
                        filepath: '/src/services/UserService.ts',
                        originalContent: `import { User } from '../types/User';
import { ApiClient } from './ApiClient';

export class UserService {
    private apiClient: ApiClient;
    
    constructor() {
        this.apiClient = new ApiClient();
    }
    
    async getUser(id: string): Promise<User> {
        const response = await this.apiClient.get(\`/users/\${id}\`);
        return response.data;
    }
    
    async updateUser(id: string, userData: Partial<User>): Promise<User> {
        const response = await this.apiClient.put(\`/users/\${id}\`, userData);
        return response.data;
    }
}`,
                        modifiedContent: `import { User, UserRole } from '../types/User';
import { ApiClient } from './ApiClient';
import { Logger } from '../utils/Logger';
import { ValidationError } from '../errors/ValidationError';

export class UserService {
    private apiClient: ApiClient;
    private logger: Logger;
    
    constructor() {
        this.apiClient = new ApiClient();
        this.logger = new Logger('UserService');
    }
    
    async getUser(id: string): Promise<User> {
        this.logger.info(\`Fetching user with id: \${id}\`);
        
        if (!id || id.trim() === '') {
            throw new ValidationError('User ID is required');
        }
        
        try {
            const response = await this.apiClient.get(\`/users/\${id}\`);
            this.logger.info(\`Successfully fetched user: \${response.data.email}\`);
            return response.data;
        } catch (error) {
            this.logger.error(\`Failed to fetch user \${id}:\`, error);
            throw error;
        }
    }
    
    async updateUser(id: string, userData: Partial<User>): Promise<User> {
        this.logger.info(\`Updating user \${id} with data:\`, userData);
        
        if (!id || id.trim() === '') {
            throw new ValidationError('User ID is required');
        }
        
        // Validate user data
        if (userData.email && !this.isValidEmail(userData.email)) {
            throw new ValidationError('Invalid email format');
        }
        
        try {
            const response = await this.apiClient.put(\`/users/\${id}\`, userData);
            this.logger.info(\`Successfully updated user: \${response.data.email}\`);
            return response.data;
        } catch (error) {
            this.logger.error(\`Failed to update user \${id}:\`, error);
            throw error;
        }
    }
    
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}`,
                        currentContent: `import { User, UserRole } from '../types/User';
import { ApiClient } from './ApiClient';
import { Logger } from '../utils/Logger';
import { ValidationError } from '../errors/ValidationError';

export class UserService {
    private apiClient: ApiClient;
    private logger: Logger;
    
    constructor() {
        this.apiClient = new ApiClient();
        this.logger = new Logger('UserService');
    }
    
    async getUser(id: string): Promise<User> {
        this.logger.info(\`Fetching user with id: \${id}\`);
        
        if (!id || id.trim() === '') {
            throw new ValidationError('User ID is required');
        }
        
        try {
            const response = await this.apiClient.get(\`/users/\${id}\`);
            this.logger.info(\`Successfully fetched user: \${response.data.email}\`);
            return response.data;
        } catch (error) {
            this.logger.error(\`Failed to fetch user \${id}:\`, error);
            throw error;
        }
    }
    
    async updateUser(id: string, userData: Partial<User>): Promise<User> {
        this.logger.info(\`Updating user \${id} with data:\`, userData);
        
        if (!id || id.trim() === '') {
            throw new ValidationError('User ID is required');
        }
        
        // Validate user data
        if (userData.email && !this.isValidEmail(userData.email)) {
            throw new ValidationError('Invalid email format');
        }
        
        try {
            const response = await this.apiClient.put(\`/users/\${id}\`, userData);
            this.logger.info(\`Successfully updated user: \${response.data.email}\`);
            return response.data;
        } catch (error) {
            this.logger.error(\`Failed to update user \${id}:\`, error);
            throw error;
        }
    }
    
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}`,
                        language: 'typescript',
                        hasUnsavedChanges: false
                      },
                      {
                        id: 'demo-2-' + Date.now(),
                        filename: 'ValidationError.ts',
                        filepath: '/src/errors/ValidationError.ts',
                        originalContent: `// This file didn't exist before`,
                        modifiedContent: `export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}`,
                        currentContent: `export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}`,
                        language: 'typescript',
                        hasUnsavedChanges: false
                      },
                      {
                        id: 'demo-3-' + Date.now(),
                        filename: 'Logger.ts',
                        filepath: '/src/utils/Logger.ts',
                        originalContent: `// This file didn't exist before`,
                        modifiedContent: `export class Logger {
    private context: string;
    
    constructor(context: string) {
        this.context = context;
    }
    
    info(message: string, ...args: any[]) {
        console.log(\`[\${this.context}] INFO: \${message}\`, ...args);
    }
    
    error(message: string, ...args: any[]) {
        console.error(\`[\${this.context}] ERROR: \${message}\`, ...args);
    }
    
    warn(message: string, ...args: any[]) {
        console.warn(\`[\${this.context}] WARN: \${message}\`, ...args);
    }
}`,
                        currentContent: `export class Logger {
    private context: string;
    
    constructor(context: string) {
        this.context = context;
    }
    
    info(message: string, ...args: any[]) {
        console.log(\`[\${this.context}] INFO: \${message}\`, ...args);
    }
    
    error(message: string, ...args: any[]) {
        console.error(\`[\${this.context}] ERROR: \${message}\`, ...args);
    }
    
    warn(message: string, ...args: any[]) {
        console.warn(\`[\${this.context}] WARN: \${message}\`, ...args);
    }
}`,
                        language: 'typescript',
                        hasUnsavedChanges: false
                      }
                    ];
                    
                    setDiffFiles(sampleDiffFiles);
                    setShowAdvancedDiffViewer(true);
                    addLog('🚀 Opened Advanced Diff Viewer demo with 3 files');
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                >
                  🚀 Demo Multi-File Diff
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: History & Logs */}
          <div className="space-y-6">


            {/* SCM History */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">📚 Commit History</h2>
                <span className="text-sm text-gray-400">
                  {scmHistory.length} commits
                </span>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {scmHistory.length > 0 ? (
                  scmHistory.map((entry, index) => (
                    <motion.div
                      key={entry.hash || index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-gray-800 rounded border-l-4 border-blue-500"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-blue-400 font-mono">
                          {entry.hash.substring(0, 8)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {entry.authorDate.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mb-1">
                        {entry.message}
                      </div>
                      <div className="text-xs text-gray-400 mb-2">
                        Author: {entry.authorName || 'Unknown'}
                      </div>
                      
                      {/* Commit statistics */}
                      {commitStats.has(entry.hash) && (
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-2 bg-gray-700/50 rounded px-2 py-1">
                          <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-gray-400/60 rounded-sm"></div>
                            {commitStats.get(entry.hash)!.filesChanged} files
                          </span>
                          <span className="flex items-center gap-1.5 text-green-400">
                            <div className="w-1 h-2.5 bg-green-400/70"></div>
                            {commitStats.get(entry.hash)!.linesAdded}
                          </span>
                          <span className="flex items-center gap-1.5 text-red-400">
                            <div className="w-1 h-2.5 bg-red-400/70"></div>
                            {commitStats.get(entry.hash)!.linesRemoved}
                          </span>
                        </div>
                      )}
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => getDiff(entry.hash)}
                          disabled={loading}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs transition-colors"
                        >
                          Basic Diff
                        </button>
                        <button
                          onClick={() => getAdvancedDiff(entry.hash)}
                          disabled={loading}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-xs transition-colors"
                        >
                          Advanced Diff
                        </button>
                        <button
                          onClick={() => revertToCommit(entry.hash)}
                          disabled={loading}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-xs transition-colors"
                        >
                          Revert
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-8">
                    No commit history found. Initialize repository and create some commits.
                  </div>
                )}
              </div>
            </div>

            {/* Debug Logs */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">📝 Debug Logs</h2>
                <span className="text-sm text-gray-400">
                  {logs.length} entries
                </span>
              </div>
              
              <div className="max-h-96 overflow-y-auto bg-black rounded p-3 font-mono text-sm">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="text-green-400 mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No logs yet...</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-gray-900/50 rounded-lg text-center text-gray-400 text-sm">
          <p>
            🦀 This interface tests the new <strong>Rust-based SCM implementation</strong>. 
            Create commits, view history, get diffs, and revert changes using the native Rust SCM backend.
            The workspace can be configured above - default is <code>/tmp/scm-debug-workspace</code> for safe testing.
          </p>
          <p className="mt-2 text-xs">
            Available operations: checkpoint creation, history viewing, diff generation, commit reverting, and repository status checking.
          </p>
        </div>
      </div>

      {/* Basic Diff Viewer Modal */}
      {showDiffViewer && diffData && (
        <DiffViewer
          originalContent={diffData.originalContent}
          modifiedContent={diffData.modifiedContent}
          originalTitle={diffData.originalTitle}
          modifiedTitle={diffData.modifiedTitle}
          language={diffData.language || 'plaintext'}
          onClose={() => {
            setShowDiffViewer(false);
            setDiffData(null);
          }}
        />
      )}

      {/* Advanced Multi-File Diff Viewer Modal */}
      {showAdvancedDiffViewer && diffFiles.length > 0 && (
        <AdvancedMonacoDiffViewer
          files={diffFiles}
          onClose={() => {
            setShowAdvancedDiffViewer(false);
            setDiffFiles([]);
          }}
          onFilesUpdate={setDiffFiles}
          onSaveFile={handleSaveFile}
          onRevertFile={handleRevertFile}
        />
      )}
    </div>
  );
}