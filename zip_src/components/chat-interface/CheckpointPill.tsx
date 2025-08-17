/**
 * CheckpointPill Component
 * 
 * Displays checkpoint information with per-file change details.
 * Focuses on information density and clarity with minimal visual design.
 * Click to view full diff in Monaco editor.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GitCommit, Loader2, RotateCcw, CheckCircle } from 'lucide-react';
import { AdvancedMonacoDiffViewer, detectLanguage } from '@/components/AdvancedMonacoDiffViewer';
import RevertConfirmationModal from '@/components/RevertConfirmationModal';
import { parseMultiFileDiff, parseUnifiedDiff, parseRawDiff } from '@/utils/diffParser';
import { SCMManager, getWorktreeBaseCommit } from '@/services/scm/SCMManager';
import { useEventStore } from '@/stores/eventStore';
import { toast } from 'sonner';
import { getDefaultACSClient } from '@/services/acs';
import { gitShowFile } from '@/utils/tauriGitCommands';
import type { ChatMessage } from '@/types/chatTypes';
import type { FileStats } from '@/utils/scmStats';
import { cn } from '@/lib/utils';
import { MergeWorktreeButton } from '@/components/mission-control-v2/MergeWorktreeButton';
import { useMissionControlStore } from '@/stores/missionControlStore';

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

interface CheckpointPillProps {
  message: ChatMessage;
}

const CheckpointPill: React.FC<CheckpointPillProps> = ({ message }) => {
  // console.log('🚀 [CheckpointPill] Component rendering with message:', message.id);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [diffFiles, setDiffFiles] = useState<DiffFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedDiffFiles, setCachedDiffFiles] = useState<DiffFile[] | null>(null);
  const [initialFileIndex, setInitialFileIndex] = useState(0);
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertWorkspacePath, setRevertWorkspacePath] = useState<string | undefined>(undefined);
  const [sessionWorkspacePath, setSessionWorkspacePath] = useState<string | null>(null);
  const [revertAnalysis, setRevertAnalysis] = useState<Array<{
    filename: string;
    filepath: string;
    linesAdded: number;
    linesRemoved: number;
    language: string;
    revertedContent?: string;
    contentError?: string;
  }>>([]);
  const [mergeSummary, setMergeSummary] = useState<null | { commit?: string; files: number; insertions: number; deletions: number }>(null);
  
  // Get session info from Mission Control store to check if this is the final checkpoint
  const { sessions } = useMissionControlStore();
  const sessionInfo = sessions.find(s => s.id === message.sessionId);
  const isSessionComplete = sessionInfo?.status === 'complete';
  const isSessionFinalized = sessionInfo?.isFinalized || false;

  const checkpointData = message.meta || {};
  const { phase, stats, commitHash } = checkpointData;

  const isStart = phase === 'start';
  const isEnd = phase === 'end';
  
  // Check if this is the first checkpoint (we don't want merge on the first one)
  const [isFirstCheckpoint, setIsFirstCheckpoint] = useState(false);
  
  // Fetch workspace path on mount for merge button
  useEffect(() => {
    if (isEnd) {
      getSessionWorkspacePath(message.sessionId).then(path => {
        setSessionWorkspacePath(path);
        console.log('[CheckpointPill] Workspace path fetched:', path);
      });
    }
  }, [isEnd, message.sessionId]);
  
  // Check if this is the first checkpoint
  useEffect(() => {
    if (isEnd && commitHash) {
      const state = useEventStore.getState();
      const sessionEventIds = state.bySession.get(message.sessionId) || [];
      const checkpoints = sessionEventIds
        .map(id => state.byId.get(id))
        .filter(event => event?.kind === 'checkpoint' && event.data?.commitHash && event.data?.phase === 'end')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Sort ascending to find first
      
      const firstCheckpoint = checkpoints[0];
      const isFirst = firstCheckpoint?.data?.commitHash === commitHash;
      setIsFirstCheckpoint(isFirst);
      
      // Debug logging
      console.log('[CheckpointPill] Checkpoint info:', {
        commitHash: commitHash?.slice(0, 7),
        isEnd,
        isFirstCheckpoint: isFirst,
        sessionWorkspacePath,
        totalCheckpoints: checkpoints.length,
        firstCheckpointHash: firstCheckpoint?.data?.commitHash?.slice(0, 7),
        allCheckpoints: checkpoints.map(c => c.data?.commitHash?.slice(0, 7))
      });
    }
  }, [isEnd, commitHash, message.sessionId, sessionWorkspacePath]);

  // 🎯 LOG ALL COMMITS ON COMPONENT LOAD
  React.useEffect(() => {
    const state = useEventStore.getState();
    const sessionEventIds = state.bySession.get(message.sessionId) || [];
    const allCheckpoints = sessionEventIds
      .map(id => state.byId.get(id))
      .filter(event => event?.kind === 'checkpoint' && event.data?.commitHash)
      .map(event => ({
        id: event.id,
        phase: event.data.phase,
        commitHash: event.data.commitHash,
        commitShort: event.data.commitHash.slice(0, 8),
        createdAt: event.createdAt,
        filesChanged: event.data.stats?.filesChanged || 0,
        linesAdded: event.data.stats?.linesAdded || 0,
        linesRemoved: event.data.stats?.linesRemoved || 0
      }));

    console.log(`🔍 [CheckpointPill] COMPONENT LOAD - All Session Commits:`, {
      currentPillCommit: commitHash?.slice(0, 8) || 'none',
      currentPillPhase: phase,
      currentPillId: message.id,
      sessionId: message.sessionId,
      totalCheckpoints: allCheckpoints.length,
      allCommits: allCheckpoints.map(cp => cp.commitShort),
      uniqueCommits: [...new Set(allCheckpoints.map(cp => cp.commitShort))],
      checkpoints: allCheckpoints
    });
  }, [message.sessionId, message.id, commitHash, phase]);

  // Don't render checkpoints without commit hash (pointless to display)
  if (!commitHash) {
    console.log(`[CheckpointPill] Skipping checkpoint without commit hash: ${phase}`);
    return null;
  }

  // // Debug logging to see what data we're receiving
  // console.log('🔍 [CheckpointPill] Checkpoint data:', {
  //   phase,
  //   stats,
  //   commitHash,
  //   hasStats: !!stats,
  //   fileListLength: stats?.fileList?.length || 0,
  //   fileListType: Array.isArray(stats?.fileList) ? typeof stats.fileList[0] : 'not-array',
  //   firstFileItem: stats?.fileList?.[0]
  // });

  // Convert legacy string fileList to FileStats objects
  const normalizedStats = stats ? {
    ...stats,
    fileList: stats.fileList?.map((file: string | FileStats) => {
      // Handle legacy format (string) vs new format (object)
      if (typeof file === 'string') {
        // Legacy format: just filename, no per-file stats available
        return {
          path: file,
          linesAdded: 0, // We don't have per-file data for legacy entries
          linesRemoved: 0
        };
      } else {
        // New format: already has the correct structure
        return file;
      }
    }) || []
  } : null;

  // console.log('🔍 [CheckpointPill] Stats processing:', {
  //   phase,
  //   hasStats: !!stats,
  //   normalizedStats: !!normalizedStats,
  //   fileListLength: normalizedStats?.fileList?.length,
  //   firstFile: normalizedStats?.fileList?.[0]
  // });

  // Create SCM Manager instance (same config as CheckpointService) - memoized to avoid recreation
  const scmManager = useMemo(() => new SCMManager({
    forceBackend: 'rust',
    allowMockFallback: false
  }), []);

  // Format the display text
  const getDisplayText = () => {
    return 'Checkpoint created';
  };

  // Safety check: ensure the workspace path is a session worktree for this session
  const isWorktreePathForSession = (cwd: string, sId: string) => {
    if (!cwd || !sId) return false;
    const norm = cwd.replace(/[\\/]+$/, '');
    const unix = `/.orchestra/worktrees/${sId}`;
    const win = `\\.orchestra\\worktrees\\${sId}`;
    return norm.includes(unix) || norm.includes(win);
  };

  // Get session workspace path (same logic as CheckpointService)
  const getSessionWorkspacePath = async (sessionId: string): Promise<string | null> => {
    try {
      console.log(`🔍 [CheckpointPill] Fetching session CWD for session ${sessionId}`);
      const acsClient = getDefaultACSClient();
      const response = await acsClient.sessions.getSession(sessionId, {
        includeMessages: false
      });

      const agentCwd = response.data.agent_cwd;
      if (agentCwd && agentCwd.trim() !== '') {
        console.log(`✅ [CheckpointPill] Found session CWD: ${agentCwd}`);
        return agentCwd;
      } else {
        console.warn(`⚠️ [CheckpointPill] No agent_cwd set for session ${sessionId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ [CheckpointPill] Failed to fetch session CWD:`, error);
      return null;
    }
  };

  /**
   * Returns the last checkpoint commit hash **different** from the current commit.
   */
  const findPreviousDifferentCheckpointHash = (
    sessionId: string,
    currentEventId: string,
    currentCommitHash: string
  ): string | null => {
    const state = useEventStore.getState();
    const ids = state.bySession.get(sessionId) || [];
    for (let i = ids.length - 1; i >= 0; i--) {
      const ev = state.byId.get(ids[i]);
      if (!ev || ev.id === currentEventId) continue; // skip self
      if (
        ev.kind === 'checkpoint' &&
        ev.data?.commitHash &&
        ev.data.commitHash !== currentCommitHash
      ) {
        return ev.data.commitHash;
      }
    }
    return null;
  };

  // Handle click for specific file - loads all files but starts with the clicked file
  const handleFileClick = async (fileIndex: number) => {
    console.log('🔍 [CheckpointPill] handleFileClick called with index:', fileIndex);
    console.log('🔍 [CheckpointPill] Conditions check:', {
      isEnd,
      normalizedStats: !!normalizedStats,
      filesChanged: normalizedStats?.filesChanged,
      commitHash: !!commitHash
    });

    if (!isEnd || !normalizedStats || normalizedStats.filesChanged === 0 || !commitHash) {
      console.log('🔍 [CheckpointPill] Early return due to failed conditions');
      return;
    }

    // Use cached diff files if available
    if (cachedDiffFiles && cachedDiffFiles.length > 0) {
      console.log(`🚀 [CheckpointPill] Using cached diff files (${cachedDiffFiles.length} files), starting with file ${fileIndex}`);

      // Log detailed diff information for cached files
      if (cachedDiffFiles.length > 0) {
        const firstFile = cachedDiffFiles[0];
        console.log(`📊 [CheckpointPill] DIFF DETAILS (Cached):`, {
          totalFiles: cachedDiffFiles.length,
          files: cachedDiffFiles.map((file, index) => ({
            index,
            filename: file.filename,
            filepath: file.filepath,
            language: file.language,
            hasContent: !!(file.originalContent && file.modifiedContent),
            originalContentLength: file.originalContent?.length || 0,
            modifiedContentLength: file.modifiedContent?.length || 0
          })),
          // Extract commit info from the file ID pattern: "startHash-endHash-filePath-timestamp"
          commitInfo: {
            startCommit: firstFile.id.split('-')[0]?.slice(0, 7),
            endCommit: firstFile.id.split('-')[1]?.slice(0, 7),
            fullCommitRange: `${firstFile.id.split('-')[0]?.slice(0, 7)}...${firstFile.id.split('-')[1]?.slice(0, 7)}`
          }
        });
      }

      setDiffFiles(cachedDiffFiles);
      setInitialFileIndex(fileIndex);
      setShowDiffViewer(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 [CheckpointPill] Loading diff for session ${message.sessionId}, starting with file ${fileIndex}`);
      console.time('CheckpointPill-LoadDiff');

      // 1. Get session workspace path (needed for both diff and project root extraction)
      console.time('CheckpointPill-GetWorkspace');
      const workspacePath = await getSessionWorkspacePath(message.sessionId);
      console.timeEnd('CheckpointPill-GetWorkspace');

      if (!workspacePath) {
        throw new Error('Could not determine workspace path for this session');
      }

      console.log('\ud83c\udfe0 [CheckpointPill] Using workspacePath for Git ops:', workspacePath);

      // 2. Get previous checkpoint hash or worktree base commit
      console.time('CheckpointPill-GetPreviousHash');
      const previousSha = findPreviousDifferentCheckpointHash(
        message.sessionId,
        message.id,
        commitHash
      );
      console.timeEnd('CheckpointPill-GetPreviousHash');
      console.log(`🔍 [CheckpointPill] findPreviousDifferentCheckpointHash result:`, previousSha);

      let startCommitHash: string;
      if (previousSha) {
        console.log(`🔍 [CheckpointPill] Using previous different checkpoint: ${previousSha.slice(0, 8)}`);
        startCommitHash = previousSha;
      } else {
        console.log(`🔍 [CheckpointPill] No previous different checkpoint found, getting worktree base commit`);
        // Use workspacePath directly - the Rust backend will resolve the correct git directory
        console.log(`🔍 [CheckpointPill] Using workspacePath: ${workspacePath}`);
        console.log(`🔍 [CheckpointPill] About to call getWorktreeBaseCommit with:`, { sessionId: message.sessionId, projectRoot: workspacePath });

        startCommitHash = await getWorktreeBaseCommit(message.sessionId, workspacePath);
        console.log(`🔍 [CheckpointPill] Using worktree base commit: ${startCommitHash.slice(0, 8)}`);
      }

      console.log(`📊 [CheckpointPill] Calculating diff from ${startCommitHash.slice(0, 8)} to ${commitHash.slice(0, 8)}`);

      // 🎯 LOG ALL COMMITS WHEN VIEW ALL FILES IS CLICKED
      console.log(`🔍 [CheckpointPill] VIEW ALL FILES - Commit Details:`, {
        startCommitHash: startCommitHash,
        commitHash: commitHash,
        startCommitShort: startCommitHash.slice(0, 8),
        endCommitShort: commitHash.slice(0, 8),
        sessionId: message.sessionId
      });

      // 🎯 LOG ALL CHECKPOINTS FOR THE SESSION
      const state = useEventStore.getState();
      const sessionEventIds = state.bySession.get(message.sessionId) || [];
      const allCheckpoints = sessionEventIds
        .map(id => state.byId.get(id))
        .filter(event => event?.kind === 'checkpoint' && event.data?.commitHash)
        .map(event => ({
          id: event.id,
          phase: event.data.phase,
          commitHash: event.data.commitHash,
          commitShort: event.data.commitHash.slice(0, 8),
          createdAt: event.createdAt,
          filesChanged: event.data.stats?.filesChanged || 0,
          linesAdded: event.data.stats?.linesAdded || 0,
          linesRemoved: event.data.stats?.linesRemoved || 0
        }));

      console.log(`🔍 [CheckpointPill] VIEW ALL FILES - All Session Checkpoints:`, {
        sessionId: message.sessionId,
        totalCheckpoints: allCheckpoints.length,
        checkpoints: allCheckpoints
      });

      // Log detailed diff information before loading
      console.log(`📊 [CheckpointPill] DIFF DETAILS (Loading):`, {
        sessionId: message.sessionId,
        workspacePath,
        startCommit: startCommitHash.slice(0, 7),
        endCommit: commitHash.slice(0, 7),
        fullCommitRange: `${startCommitHash.slice(0, 7)}...${commitHash.slice(0, 7)}`,
        commitSource: previousSha ? 'previous-checkpoint' : 'worktree-base-commit',
        totalFilesExpected: normalizedStats?.fileList?.length || 0,
        filesChanged: normalizedStats?.filesChanged || 0,
        linesAdded: normalizedStats?.linesAdded || 0,
        linesRemoved: normalizedStats?.linesRemoved || 0
      });

      // 3. Get diff between start and end commits
      console.time('CheckpointPill-GitDiff');
      let diff: string;
      if (startCommitHash === commitHash) {
        console.log(`📝 [CheckpointPill] Start and end commits are identical, no changes`);
        diff = '';
      } else {
        diff = await scmManager.diff(workspacePath, startCommitHash, commitHash);
      }
      console.timeEnd('CheckpointPill-GitDiff');

      console.log(`✅ [CheckpointPill] Diff retrieved (${diff.length} characters)`);

      // 4. Get FULL file contents for better diff viewing
      console.time('CheckpointPill-GetFullFiles');
      const diffFiles: DiffFile[] = [];

      // Handle both legacy (string) and new (object) fileList formats
      if (stats && stats.fileList && stats.fileList.length > 0) {
        for (const fileItem of stats.fileList) {
          try {
            // Extract file path from both legacy string format and new object format
            const filePath = typeof fileItem === 'string' ? fileItem : fileItem.path;

            if (!filePath) {
              console.warn(`⚠️ [CheckpointPill] Invalid file item:`, fileItem);
              continue;
            }

            console.log(`📄 [CheckpointPill] Loading full content for: ${filePath}`);
            console.log('🔍 [CheckpointPill] About to call gitShowFile for:', {
              filePath,
              startCommitHash: startCommitHash.slice(0, 8),
              endCommitHash: commitHash.slice(0, 8),
              workspacePath
            });

            // Get full file content from both commits using git show
            // Use workspacePath (worktree) for Git operations - the Rust backend will resolve the correct git directory
            console.log(`🔍 [CheckpointPill] Using workspacePath: ${workspacePath} for Git operations`);
            const [originalResult, modifiedResult] = await Promise.all([
              gitShowFile(workspacePath, startCommitHash, filePath).catch((err) => {
                console.warn(`⚠️ [CheckpointPill] Failed to get original content for ${filePath}:`, err);
                return { success: false, stdout: '', stderr: err.message };
              }),
              gitShowFile(workspacePath, commitHash, filePath).catch((err) => {
                console.warn(`⚠️ [CheckpointPill] Failed to get modified content for ${filePath}:`, err);
                return { success: false, stdout: '', stderr: err.message };
              })
            ]);

            // Handle new files: if original fails but modified succeeds, it's a new file
            // Handle deleted files: if original succeeds but modified fails, it's a deleted file
            let originalContent = '';
            let modifiedContent = '';

            if (originalResult.success) {
              originalContent = originalResult.stdout;
            } else if (originalResult.stderr && originalResult.stderr.includes('does not exist')) {
              // File doesn't exist in start commit - this is a new file
              originalContent = '';
              console.log(`📝 [CheckpointPill] ${filePath} is a new file (doesn't exist in ${startCommitHash.slice(0, 8)})`);
            } else {
              // Real error getting original content
              originalContent = '';
              console.warn(`⚠️ [CheckpointPill] Could not get original content for ${filePath}: ${originalResult.stderr}`);
            }

            if (modifiedResult.success) {
              modifiedContent = modifiedResult.stdout;
            } else if (modifiedResult.stderr && modifiedResult.stderr.includes('does not exist')) {
              // File doesn't exist in end commit - this is a deleted file
              modifiedContent = '';
              console.log(`📝 [CheckpointPill] ${filePath} was deleted (doesn't exist in ${commitHash.slice(0, 8)})`);
            } else {
              // Real error getting modified content
              modifiedContent = '';
              console.warn(`⚠️ [CheckpointPill] Could not get modified content for ${filePath}: ${modifiedResult.stderr}`);
            }

            // DEBUG: Log file content retrieval results
            console.log('🔍 [CheckpointPill] File content retrieval:', {
              filePath,
              startCommitHash: startCommitHash.slice(0, 8),
              endCommitHash: commitHash.slice(0, 8),
              originalSuccess: originalResult.success,
              modifiedSuccess: modifiedResult.success,
              originalLength: originalContent.length,
              modifiedLength: modifiedContent.length,
              originalIsEmpty: originalContent.trim() === '',
              modifiedIsEmpty: modifiedContent.trim() === '',
              originalPreview: originalContent.substring(0, 50) + (originalContent.length > 50 ? '...' : ''),
              modifiedPreview: modifiedContent.substring(0, 50) + (modifiedContent.length > 50 ? '...' : ''),
              originalError: originalResult.success ? null : originalResult.stderr,
              modifiedError: modifiedResult.success ? null : modifiedResult.stderr,
              fileType: originalContent === '' && modifiedContent !== '' ? 'NEW_FILE' :
                originalContent !== '' && modifiedContent === '' ? 'DELETED_FILE' : 'MODIFIED_FILE'
            });

            const language = detectLanguage(filePath);

            diffFiles.push({
              id: `${startCommitHash}-${commitHash}-${filePath}-${Date.now()}`,
              filename: filePath.split('/').pop() || filePath,
              filepath: filePath,
              originalContent,
              modifiedContent,
              currentContent: modifiedContent,
              language,
              hasUnsavedChanges: false
            });
          } catch (fileError) {
            console.error(`❌ [CheckpointPill] Failed to process file:`, fileError);
            continue;
          }
        }
      }
      console.timeEnd('CheckpointPill-GetFullFiles');

      // Fallback: if we couldn't get full files, use diff parsing
      if (diffFiles.length === 0 && diff) {
        console.log(`📝 [CheckpointPill] Falling back to diff parsing`);
        console.time('CheckpointPill-ParseDiff');

        let parsedMultiDiff;
        try {
          parsedMultiDiff = parseMultiFileDiff(diff);
        } catch (parseError) {
          try {
            const singleParsed = parseUnifiedDiff(diff);
            parsedMultiDiff = { files: [singleParsed] };
          } catch (singleParseError) {
            const rawParsed = parseRawDiff(diff);
            parsedMultiDiff = { files: [rawParsed] };
          }
        }

        parsedMultiDiff.files.forEach((parsedFile, index) => {
          const language = detectLanguage(parsedFile.fileName || '');

          diffFiles.push({
            id: `${startCommitHash}-${commitHash}-${index}-${Date.now()}`,
            filename: parsedFile.fileName || `file-${index + 1}`,
            filepath: parsedFile.fileName || `file-${index + 1}`,
            originalContent: parsedFile.originalContent,
            modifiedContent: parsedFile.modifiedContent,
            currentContent: parsedFile.modifiedContent,
            language,
            hasUnsavedChanges: false
          });
        });

        console.timeEnd('CheckpointPill-ParseDiff');
      }

      console.timeEnd('CheckpointPill-LoadDiff');
      console.log(`🚀 [CheckpointPill] Created ${diffFiles.length} diff files for viewer`);

      // Log final diff creation results
      if (diffFiles.length > 0) {
        console.log(`📊 [CheckpointPill] DIFF DETAILS (Created):`, {
          totalFiles: diffFiles.length,
          files: diffFiles.map((file, index) => ({
            index,
            filename: file.filename,
            filepath: file.filepath,
            language: file.language,
            hasContent: !!(file.originalContent && file.modifiedContent),
            originalContentLength: file.originalContent?.length || 0,
            modifiedContentLength: file.modifiedContent?.length || 0
          })),
          commitInfo: {
            startCommit: startCommitHash.slice(0, 7),
            endCommit: commitHash.slice(0, 7),
            fullCommitRange: `${startCommitHash.slice(0, 7)}...${commitHash.slice(0, 7)}`
          },
          loadSource: 'fresh-loading'
        });
      }

      // Cache the diff files for faster subsequent access
      setCachedDiffFiles(diffFiles);
      setDiffFiles(diffFiles);
      setInitialFileIndex(fileIndex);
      setShowDiffViewer(true);

    } catch (err) {
      const errorMsg = `Failed to load diff: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`❌ [CheckpointPill] ${errorMsg}`, err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle click for end checkpoints with stats - fetch and parse diff (legacy behavior)
  const handleClick = async () => {
    await handleFileClick(0); // Start with first file
  };

  // Analyze what will be reverted
  const analyzeRevertImpact = async (commitHash: string, workspacePath: string) => {
    try {
      console.log(`🔍 [CheckpointPill] Analyzing revert impact for commit ${commitHash} in ${workspacePath}`);

      // Get diff between current HEAD and target commit (what will change during revert)
      console.log(`🔍 [CheckpointPill] Getting REVERT diff from HEAD to ${commitHash}`);

      // Add timeout to prevent hanging
      // NOTE: This shows what will change when reverting FROM current state TO target commit
      const diffPromise = scmManager.diff(workspacePath, 'HEAD', commitHash);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Diff operation timed out after 15 seconds')), 15000)
      );

      let diff;
      try {
        diff = await Promise.race([diffPromise, timeoutPromise]) as string;
        console.log(`📝 [CheckpointPill] Diff result:`, {
          diffLength: diff?.length || 0,
          hasContent: !!diff,
          preview: diff ? diff.substring(0, 200) + '...' : 'empty'
        });
      } catch (diffError) {
        console.error(`❌ [CheckpointPill] Diff operation failed:`, diffError);
        throw new Error(`Failed to get diff: ${diffError.message}`);
      }

      if (!diff || diff.trim() === '') {
        console.log(`📝 [CheckpointPill] No changes to revert - diff is empty`);
        return [];
      }

      // Parse diff to get per-file changes
      console.log(`🔍 [CheckpointPill] Parsing diff (${diff.length} chars)...`);
      let parsedDiff;
      try {
        parsedDiff = parseMultiFileDiff(diff);
        console.log(`✅ [CheckpointPill] Successfully parsed multi-file diff:`, {
          filesCount: parsedDiff.files.length,
          fileNames: parsedDiff.files.map(f => f.fileName).slice(0, 5)
        });
      } catch (parseError) {
        console.warn(`⚠️ [CheckpointPill] Multi-file diff parse failed, trying single file:`, parseError);
        try {
          const singleParsed = parseUnifiedDiff(diff);
          parsedDiff = { files: [singleParsed] };
          console.log(`✅ [CheckpointPill] Successfully parsed single diff:`, singleParsed.fileName);
        } catch (singleParseError) {
          console.warn(`⚠️ [CheckpointPill] Single diff parse failed, trying raw:`, singleParseError);
          const rawParsed = parseRawDiff(diff);
          parsedDiff = { files: [rawParsed] };
          console.log(`✅ [CheckpointPill] Using raw diff fallback`);
        }
      }

      const result = [];
      console.log(`🔍 [CheckpointPill] Processing ${parsedDiff.files.length} files from diff...`);

      for (const [index, file] of parsedDiff.files.entries()) {
        const filepath = file.fileName || `unknown-file-${index}`;

        console.log(`📄 [CheckpointPill] Processing file ${index + 1}/${parsedDiff.files.length}: ${filepath}`);

        // For revert analysis, we don't need precise line counts - just show that the file will change
        // The important thing is to get the content that the file will be reverted to
        console.log(`📊 [CheckpointPill] File ${filepath} will be reverted`);

        // Content will be loaded on-demand when user clicks on the file in the modal
        console.log(`📊 [CheckpointPill] File ${filepath} will be available for content preview on-demand`);

        result.push({
          filename: filepath.split('/').pop() || filepath,
          filepath: filepath,
          linesAdded: 0, // We'll show "File will be reverted" instead of misleading line counts
          linesRemoved: 0,
          language: detectLanguage(filepath)
          // Content will be loaded on-demand when user clicks on the file
        });
      }

      const totalAdded = result.reduce((sum, f) => sum + f.linesAdded, 0);
      const totalRemoved = result.reduce((sum, f) => sum + f.linesRemoved, 0);

      console.log(`📊 [CheckpointPill] Analysis complete:`, {
        filesCount: result.length,
        totalAdded,
        totalRemoved,
        totalChanges: totalAdded + totalRemoved,
        files: result.map(f => ({
          filepath: f.filepath,
          linesAdded: f.linesAdded,
          linesRemoved: f.linesRemoved,
          contentLength: f.revertedContent?.length || 0
        }))
      });

      return result;
    } catch (error) {
      console.error(`❌ [CheckpointPill] Failed to analyze revert impact:`, error);
      throw error; // Re-throw to let the caller handle it
    }
  };



  // Handle revert button click - show modal with proper analysis
  const handleRevert = async (e: React.MouseEvent) => {
    console.log('🔄 [CheckpointPill] Revert button clicked!', { commitHash, reverting });
    e.stopPropagation(); // Prevent triggering the diff viewer

    if (!commitHash) {
      console.warn('❌ [CheckpointPill] No commit hash available for revert');
      toast.error('No commit hash available for revert');
      return;
    }

    if (reverting) {
      console.warn('❌ [CheckpointPill] Revert already in progress');
      return;
    }

    // Show modal immediately with loading state
    console.log('🚀 [CheckpointPill] Showing revert modal with loading state...');
    setRevertAnalysis([]); // Start with empty analysis
    setShowRevertModal(true);

    // Load the actual revert impact analysis
    try {
      const workspacePath = await getSessionWorkspacePath(message.sessionId);
      if (!workspacePath) {
        console.warn('⚠️ [CheckpointPill] Could not get workspace path for revert analysis');
        toast.error('Could not determine workspace path');
        setShowRevertModal(false);
        return;
      }

      // Store workspace path for the modal to use
      setRevertWorkspacePath(workspacePath);

      console.log('🔍 [CheckpointPill] Loading actual revert impact analysis...');
      const revertImpact = await analyzeRevertImpact(commitHash, workspacePath);

      console.log('✅ [CheckpointPill] Revert analysis complete:', {
        filesCount: revertImpact.length,
        totalAdded: revertImpact.reduce((sum, f) => sum + f.linesAdded, 0),
        totalRemoved: revertImpact.reduce((sum, f) => sum + f.linesRemoved, 0)
      });

      setRevertAnalysis(revertImpact);

    } catch (error) {
      console.error('❌ [CheckpointPill] Failed to analyze revert impact:', error);
      toast.error('Failed to analyze revert impact');
      setShowRevertModal(false);
    }
  };

  // Perform the actual revert
  const performRevert = async () => {
    if (!commitHash) return;

    setReverting(true);
    setError(null);

    try {
      console.log(`🔄 [CheckpointPill] Reverting to checkpoint ${commitHash}`);

      // Get session workspace path
      const workspacePath = await getSessionWorkspacePath(message.sessionId);
      if (!workspacePath) {
        throw new Error('Could not determine workspace path for this session');
      }

      // Safety: ensure the workspace path is the session worktree
      if (!isWorktreePathForSession(workspacePath, message.sessionId)) {
        throw new Error(`Workspace path is not a session worktree for this session: ${workspacePath}`);
      }

      // Revert using SCM manager
      await scmManager.revert(workspacePath, commitHash);

      console.log(`✅ [CheckpointPill] Successfully reverted to checkpoint ${commitHash}`);

      // Success feedback
      toast.success(`Successfully reverted ${revertAnalysis.length} files`, {
        description: `Workspace restored to commit ${commitHash.slice(0, 7)}`
      });

      setShowRevertModal(false);

    } catch (err) {
      const errorMsg = `Failed to revert: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`❌ [CheckpointPill] ${errorMsg}`, err);
      setError(errorMsg);

      toast.error('Revert failed', {
        description: errorMsg
      });
    } finally {
      setReverting(false);
    }
  };

  const hasStats = isEnd && normalizedStats && normalizedStats.filesChanged > 0;
  const isClickable = hasStats && !loading && !reverting;

  // // Debug logging for component state
  // console.log('🔍 [CheckpointPill] Component state:', {
  //   commitHash: commitHash?.slice(0, 7),
  //   phase,
  //   hasStats,
  //   isClickable,
  //   loading,
  //   reverting,
  //   showRevertModal,
  //   revertAnalysisLength: revertAnalysis.length,
  //   isEnd,
  //   normalizedStats: !!normalizedStats,
  //   fileListLength: normalizedStats?.fileList?.length,
  //   filesChanged: normalizedStats?.filesChanged
  // });

  return (
    <>
      <div className="w-full">
        {/* Main Checkpoint Container */}
        <div
          className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                ) : (
                  <GitCommit className="w-4 h-4 text-white/40" />
                )}
                <span className="text-sm font-medium text-white/90">Checkpoint</span>
                {commitHash && (
                  <code className="text-xs font-mono text-white/40">
                    {commitHash.slice(0, 7)}
                  </code>
                )}
              </div>

              {/* Right side: Stats, Merge and Revert buttons */}
              <div className="flex items-center gap-4">
                {/* Summary stats */}
                {hasStats && (
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-white/60">{normalizedStats.filesChanged} files</span>
                    {normalizedStats.linesAdded > 0 && (
                      <span className="text-green-400">+{normalizedStats.linesAdded}</span>
                    )}
                    {normalizedStats.linesRemoved > 0 && (
                      <span className="text-red-400">-{normalizedStats.linesRemoved}</span>
                    )}
                  </div>
                )}

                {/* Merge button or summary - show for any checkpoint with changes */}
                {sessionWorkspacePath && normalizedStats && (() => {
                  const hasMergeableChanges = 
                    normalizedStats.filesChanged > 0 ||
                    normalizedStats.linesAdded > 0 ||
                    normalizedStats.linesRemoved > 0;
                  
                  return hasMergeableChanges ? (
                    <>
                      {/* Show merge summary if merge was successful */}
                      {mergeSummary && (
                        <div className="flex items-center gap-3 text-xs font-mono px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Merged
                          </span>
                          {mergeSummary.commit && (
                            <code className="text-white/60">{mergeSummary.commit.slice(0, 7)}</code>
                          )}
                          <span>{mergeSummary.files} files</span>
                          {mergeSummary.insertions > 0 && <span className="text-green-400">+{mergeSummary.insertions}</span>}
                          {mergeSummary.deletions > 0 && <span className="text-red-400">-{mergeSummary.deletions}</span>}
                        </div>
                      )}
                      
                      {/* Show merge button if not yet merged */}
                      {!mergeSummary && (
                        <MergeWorktreeButton
                          sessionId={message.sessionId}
                          sessionName={sessionInfo?.mission_title || `Checkpoint ${commitHash?.slice(0, 7)}`}
                          workspacePath={sessionWorkspacePath}
                          variant="outline"
                          size="sm"
                          buttonText="Merge this checkpoint"
                          forceShowDialog
                          autoCloseAfterMs={3000}
                          onMerged={(res) => {
                            if (res?.ok) {
                              const r: any = res.result || {};
                              const commit = r.commit || r.new_head;
                              const stats = r.stats || { files_changed: r.files_changed, insertions: r.insertions, deletions: r.deletions };
                              setMergeSummary({
                                commit,
                                files: stats?.files_changed ?? 0,
                                insertions: stats?.insertions ?? 0,
                                deletions: stats?.deletions ?? 0,
                              });
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
                                   bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                   hover:from-blue-500/20 hover:to-purple-500/20 
                                   border border-blue-500/20 text-blue-400
                                   transition-all duration-200"
                        />
                      )}
                    </>
                  ) : null;
                })()}

                {/* Revert button - show for all checkpoints */}
                {commitHash && (
                  <button
                    onClick={handleRevert}
                    disabled={reverting}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
                      transition-colors border
                      ${reverting
                        ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white/80'
                      }
                    `}
                    title={`Revert workspace to this checkpoint (${commitHash.slice(0, 7)})`}
                  >
                    {reverting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    {reverting ? 'Reverting...' : 'Revert'}
                  </button>
                )}


              </div>
            </div>
          </div>

          {/* File list - always visible for end checkpoints with changes */}
          {isEnd && normalizedStats && normalizedStats.fileList && normalizedStats.fileList.length > 0 && (
            <div className="px-4 py-3">
              <div className="space-y-1.5">
                {normalizedStats.fileList.map((file: string | FileStats, index: number) => (
                  <div
                    key={index}
                    className={cn(

                      "flex items-center justify-between text-xs font-mono px-2 py-1 rounded transition-all",
                      "cursor-pointer hover:bg-white/5",
                      loading && "opacity-50 cursor-not-allowed",
                      hoveredFile === (typeof file === 'string' ? file : file.path) && "bg-white/10"
                    )}
                    onClick={(e) => {
                      console.log(`Commit hash: ${commitHash}`);
                      console.log('🔍 [CheckpointPill] File clicked:', { index, loading, file });
                      e.stopPropagation(); // Prevent checkpoint click
                      if (!loading) {
                        console.log('🔍 [CheckpointPill] Calling handleFileClick with index:', index);
                        handleFileClick(index);
                      } else {
                        console.log('🔍 [CheckpointPill] Not calling handleFileClick because loading is true');
                      }
                    }}
                    onMouseEnter={() => setHoveredFile(typeof file === 'string' ? file : file.path)}
                    onMouseLeave={() => setHoveredFile(null)}
                    title={`Click to view diff for ${typeof file === 'string' ? file : file.path}`}
                  >
                    <span className="text-white/50 truncate mr-4 hover:text-white/70">
                      {typeof file === 'string' ? file : file.path}
                    </span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {typeof file !== 'string' && file.linesAdded > 0 && (
                        <span className="text-green-400">+{file.linesAdded}</span>
                      )}
                      {typeof file !== 'string' && file.linesRemoved > 0 && (
                        <span className="text-red-400">-{file.linesRemoved}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced hint with View All option */}
              {isClickable && (
                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-white/30">Click any file to view its diff</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                    className="text-xs text-white/50 hover:text-white/70 transition-colors"
                  >
                    View All Files
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>





      {/* Error Display */}
      {error && (
        <div className="mt-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Diff Viewer Modal */}
      {showDiffViewer && diffFiles.length > 0 && createPortal(
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowDiffViewer(false);
            setDiffFiles([]);
            setError(null);
          }}
        >
          <div
            className="relative w-[95vw] h-[95vh] bg-slate-950 rounded-lg border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <GitCommit className="w-4 h-4 text-white/40" />
                <span className="text-sm font-medium text-white/90">Checkpoint Diff</span>
                <span className="text-xs text-white/50">
                  {diffFiles.length} files
                </span>
                {normalizedStats && (
                  <div className="flex items-center gap-3 text-xs font-mono">
                    {normalizedStats.linesAdded > 0 && (
                      <span className="text-green-400">+{normalizedStats.linesAdded}</span>
                    )}
                    {normalizedStats.linesRemoved > 0 && (
                      <span className="text-red-400">-{normalizedStats.linesRemoved}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDiffViewer(false);
                  setDiffFiles([]);
                  setError(null);
                }}
                className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors text-white/70"
              >
                Close
              </button>
            </div>

            {/* Content */}
            <div className="h-[calc(95vh-52px)]">
              <AdvancedMonacoDiffViewer
                files={diffFiles}
                onClose={() => {
                  setShowDiffViewer(false);
                  setDiffFiles([]);
                  setError(null);
                }}
                onFilesUpdate={setDiffFiles}
                onSaveFile={async (file) => {
                  console.log(`💾 [CheckpointPill] Save file requested: ${file.filename}`);
                }}
                onRevertFile={async (file) => {
                  console.log(`↩️ [CheckpointPill] Revert file requested: ${file.filename}`);
                }}
                initialFileIndex={initialFileIndex}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Revert Confirmation Modal */}
      <RevertConfirmationModal
        isOpen={showRevertModal}
        onClose={() => setShowRevertModal(false)}
        onConfirm={performRevert}
        files={revertAnalysis}
        commitHash={commitHash || ''}
        isReverting={reverting}
        workspacePath={revertWorkspacePath}
      />
    </>
  );
};

export default CheckpointPill;