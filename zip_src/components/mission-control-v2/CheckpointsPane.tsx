import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  Clock, 
  FileText, 
  ChevronRight,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  GitMerge,
  File,
  Plus,
  Minus,
  Edit
} from 'lucide-react';
import { supabase } from '@/auth/SupabaseClient';
import { SCMManager } from '@/services/scm/SCMManager';
import { getDiffStatsFromUnifiedDiff } from '@/utils/gitDiffStats';
import { DiffStats } from '@/types/gitTypes';
import { MissionControlAgent } from '@/stores/missionControlStore';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { MergeWorktreeButton } from './MergeWorktreeButton';
import { parseMultiFileDiff, detectLanguage } from '@/utils/diffParser';
import { DiffViewer } from '@/components/DiffViewer';
import { gitShowFile } from '@/utils/tauriGitCommands';

interface CheckpointsPaneProps {
  sessionId: string;
  agent: MissionControlAgent;
}

interface Checkpoint {
  id: string;
  session_id: string;
  commit_hash: string;
  commit_message: string;
  created_at: string;
  diff_stats?: DiffStats;
}

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted';
}

interface DiffViewerState {
  isOpen: boolean;
  filePath?: string;
  originalContent?: string;
  modifiedContent?: string;
  language?: string;
}

const CheckpointsPane: React.FC<CheckpointsPaneProps> = ({ sessionId, agent }) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>('');
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [checkpointFileChanges, setCheckpointFileChanges] = useState<FileChange[]>([]);
  const [overallStats, setOverallStats] = useState<DiffStats | null>(null);
  const [isLoadingOverallStats, setIsLoadingOverallStats] = useState(false);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [overallDiffContent, setOverallDiffContent] = useState<string>('');
  const [diffViewer, setDiffViewer] = useState<DiffViewerState>({ isOpen: false });
  const [firstCheckpointHash, setFirstCheckpointHash] = useState<string | null>(null);

  useEffect(() => {
    loadCheckpoints();
  }, [sessionId]);

  const loadCheckpoints = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('chat_checkpoints')
        .select('*')
        .eq('session_id', sessionId)
        .not('commit_hash', 'is', null)  // Filter out null commit_hash values
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load diff stats for each checkpoint if we have a workspace
      if (data && agent.agent_cwd) {
        const checkpointsWithStats = await Promise.all(
          data.map(async (checkpoint, index) => {
            if (index < data.length - 1 && checkpoint.commit_hash) {
              try {
                const prevCheckpoint = data[index + 1];
                if (!prevCheckpoint.commit_hash) {
                  return checkpoint; // Skip if previous checkpoint has no commit hash
                }
                
                const scmManager = new SCMManager({
                  forceBackend: 'rust',
                  allowMockFallback: false
                });

                const diffString = await scmManager.diff(
                  agent.agent_cwd!,
                  prevCheckpoint.commit_hash,
                  checkpoint.commit_hash
                );

                const stats = getDiffStatsFromUnifiedDiff(diffString);
                return { ...checkpoint, diff_stats: stats };
              } catch (err) {
                console.error('Failed to load diff stats for checkpoint:', err);
                return checkpoint;
              }
            }
            return checkpoint;
          })
        );
        setCheckpoints(checkpointsWithStats);
        
        // Identify the first checkpoint (earliest by creation time)
        if (data.length > 0) {
          const sortedByTime = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const firstCheckpoint = sortedByTime[0];
          setFirstCheckpointHash(firstCheckpoint?.commit_hash || null);
        }
        
        // Load overall session diff stats (comparing earliest to latest checkpoint)
        if (data.length > 0 && data[0].commit_hash && data[data.length - 1].commit_hash) {
          loadOverallSessionStats(data[0].commit_hash, data[data.length - 1].commit_hash);
        }
      } else {
        setCheckpoints(data || []);
        if (data && data.length > 0) {
          const sortedByTime = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const firstCheckpoint = sortedByTime[0];
          setFirstCheckpointHash(firstCheckpoint?.commit_hash || null);
        }
      }
    } catch (err) {
      console.error('Failed to load checkpoints:', err);
      toast.error('Failed to load checkpoints');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOverallSessionStats = async (latestHash: string, earliestHash: string) => {
    if (!agent.agent_cwd || !latestHash || !earliestHash) return;
    
    setIsLoadingOverallStats(true);
    
    try {
      const scmManager = new SCMManager({
        forceBackend: 'rust',
        allowMockFallback: false
      });

      // If there's only one checkpoint, compare it against its parent
      const fromHash = latestHash === earliestHash ? `${earliestHash}~1` : earliestHash;
      
      const diffString = await scmManager.diff(
        agent.agent_cwd,
        fromHash,
        latestHash
      );

      // Store the full diff for file viewing
      setOverallDiffContent(diffString);

      const stats = getDiffStatsFromUnifiedDiff(diffString);
      setOverallStats({
        ...stats,
        earliestHash: fromHash,  // Store the actual fromHash used for the diff
        latestHash: latestHash
      });

      // Parse file changes
      const parsedDiff = parseMultiFileDiff(diffString);
      const changes: FileChange[] = parsedDiff.files.map(file => {
        const lines = diffString.split('\n');
        let additions = 0;
        let deletions = 0;
        let inFile = false;
        
        for (const line of lines) {
          if (line.includes(`diff --git a/${file.fileName}`)) {
            inFile = true;
          } else if (inFile && line.startsWith('diff --git')) {
            break;
          }
          
          if (inFile) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              additions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              deletions++;
            }
          }
        }

        let status: 'added' | 'modified' | 'deleted' = 'modified';
        if (deletions === 0 && additions > 0) status = 'added';
        else if (additions === 0 && deletions > 0) status = 'deleted';

        return {
          path: file.fileName || 'unknown',
          additions,
          deletions,
          status
        };
      });

      setFileChanges(changes);
    } catch (err) {
      console.error('Failed to load overall session stats:', err);
      // Don't show error toast as this is a nice-to-have feature
    } finally {
      setIsLoadingOverallStats(false);
    }
  };

  const loadDiffContent = async (checkpointHash: string, prevHash?: string) => {
    if (!agent.agent_cwd || !checkpointHash) return;
    
    setIsLoadingDiff(true);
    
    try {
      const scmManager = new SCMManager({
        forceBackend: 'rust',
        allowMockFallback: false
      });

      // If no previous hash provided, use the parent of this checkpoint
      const fromHash = prevHash || `${checkpointHash}~1`;
      const diffString = await scmManager.diff(
        agent.agent_cwd,
        fromHash,
        checkpointHash
      );

      setDiffContent(diffString);

      // Parse file changes for the checkpoint
      const parsedDiff = parseMultiFileDiff(diffString);
      const changes: FileChange[] = parsedDiff.files.map(file => {
        const lines = diffString.split('\n');
        let additions = 0;
        let deletions = 0;
        let inFile = false;
        
        for (const line of lines) {
          if (line.includes(`diff --git a/${file.fileName}`)) {
            inFile = true;
          } else if (inFile && line.startsWith('diff --git')) {
            break;
          }
          
          if (inFile) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              additions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              deletions++;
            }
          }
        }

        let status: 'added' | 'modified' | 'deleted' = 'modified';
        if (deletions === 0 && additions > 0) status = 'added';
        else if (additions === 0 && deletions > 0) status = 'deleted';

        return {
          path: file.fileName || 'unknown',
          additions,
          deletions,
          status
        };
      });

      setCheckpointFileChanges(changes);
    } catch (err) {
      console.error('Failed to load diff:', err);
      toast.error('Failed to load diff');
    } finally {
      setIsLoadingDiff(false);
    }
  };

  const copyCommitHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Commit hash copied to clipboard');
  };

  // Safety check: ensure the workspace path is a session worktree for this session
  const isWorktreePathForSession = (cwd: string, sId: string) => {
    if (!cwd || !sId) return false;
    const norm = cwd.replace(/[\\/]+$/, '');
    const unix = `/.orchestra/worktrees/${sId}`;
    const win = `\\.orchestra\\worktrees\\${sId}`;
    return norm.includes(unix) || norm.includes(win);
  };

  const handleMergeCheckpoint = async (commitHash: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering checkpoint selection
    
    if (!agent.agent_cwd || !commitHash) return;
    
    console.log('[CheckpointsPane] Merge clicked for checkpoint:', commitHash.slice(0, 7));

    // Immediate mitigation: block revert if not using the session worktree
    if (!isWorktreePathForSession(agent.agent_cwd, sessionId)) {
      toast.error('Cannot revert/merge without a session worktree', {
        description: `Workspace path is not a session worktree for this session. Expected .orchestra/worktrees/${sessionId}`
      });
      return;
    }
    
    try {
      // Always show the full merge confirmation dialog
      try { localStorage.removeItem('mc.hideMergeConfirmation'); } catch {}

      // Step 1: Revert to this checkpoint
      console.log(`[CheckpointsPane] Step 1: Reverting to checkpoint ${commitHash.slice(0, 7)}`);
      toast.loading('Reverting to checkpoint...');
      
      const scmManager = new SCMManager({
        forceBackend: 'rust',
        allowMockFallback: false
      });
      
      await scmManager.revert(agent.agent_cwd, commitHash);
      
      console.log(`[CheckpointsPane] Successfully reverted to checkpoint ${commitHash.slice(0, 7)}`);
      toast.success(`Reverted to checkpoint ${commitHash.slice(0, 7)}`);
      
      // Step 2: Now trigger the merge
      // We need to programmatically click the MergeWorktreeButton
      setTimeout(() => {
        const mergeButton = document.querySelector(`[data-merge-button="${sessionId}"]`) as HTMLButtonElement | null;
        if (!mergeButton) {
          toast.error('Merge control not available. Please refresh or ensure session is ready.');
          return;
        }
        mergeButton.click();
      }, 500);
      
    } catch (err) {
      console.error('[CheckpointsPane] Failed to revert before merge:', err);
      toast.error('Failed to prepare checkpoint for merge');
    }
  };

  const openFileDiff = async (filePath: string, fromCommit?: string, toCommit?: string) => {
    if (!agent.agent_cwd) return;

    const fromHash = fromCommit || overallStats?.earliestHash;
    const toHash = toCommit || overallStats?.latestHash;
    if (!fromHash || !toHash) {
      toast.error('Unable to determine commit range');
      return;
    }
    try {
      const [origRes, modRes] = await Promise.all([
        gitShowFile(agent.agent_cwd, fromHash, filePath).catch(err => ({ success: false, stdout: '', stderr: String(err) })),
        gitShowFile(agent.agent_cwd, toHash, filePath).catch(err => ({ success: false, stdout: '', stderr: String(err) })),
      ]);

      let originalContent = origRes.success ? origRes.stdout : '';
      let modifiedContent = modRes.success ? modRes.stdout : '';

      // Allow new/deleted files
      const haveEither = originalContent.length > 0 || modifiedContent.length > 0 || origRes.success || modRes.success;

      if (!haveEither) {
        const scmManager = new SCMManager({ forceBackend: 'rust', allowMockFallback: false });
        const unifiedDiff = await scmManager.diff(agent.agent_cwd, fromHash, toHash);
        const parsed = parseMultiFileDiff(unifiedDiff);
        const normalized = filePath.replace(/^\.\/+/, '').replace(/^\/+/, '');
        const match = parsed.files.find(f => f.fileName === normalized) ||
          parsed.files.find(f => f.fileName && (f.fileName.endsWith('/' + normalized) || normalized.endsWith(f.fileName)));
        if (!match) {
          toast.error('No diff content found for the selected file');
          return;
        }
        originalContent = match.originalContent || '';
        modifiedContent = match.modifiedContent || '';
      }

      setDiffViewer({
        isOpen: true,
        filePath,
        originalContent,
        modifiedContent,
        language: detectLanguage(filePath) || 'plaintext'
      });
    } catch (err) {
      console.error('Failed to load file diff (full-file strategy):', err);
      toast.error('Failed to load file diff');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50" />
          <p className="text-white/50 text-sm">Loading checkpoints...</p>
        </div>
      </div>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <GitBranch className="w-12 h-12 text-white/20" />
          <p className="text-white/50">No checkpoints yet</p>
          <p className="text-white/30 text-sm">Checkpoints will appear as the agent makes progress</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full">
      {/* Checkpoints List */}
      <div className="w-1/3 min-w-[300px] border-r border-white/10 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/90">
              Checkpoints ({checkpoints.length})
            </h3>
            {agent.agent_cwd && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(agent.agent_cwd!);
                  toast.success('Workspace path copied');
                }}
                className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy workspace
              </button>
            )}
          </div>

          <div className="space-y-2">
            {checkpoints.map((checkpoint, index) => {
              const isSelected = selectedCheckpoint === checkpoint.id;
              const prevCheckpoint = checkpoints[index + 1];
              
              return (
                <motion.button
                  key={checkpoint.id}
                  onClick={() => {
                    setSelectedCheckpoint(checkpoint.id);
                    if (checkpoint.commit_hash) {
                      loadDiffContent(
                        checkpoint.commit_hash,
                        prevCheckpoint?.commit_hash
                      );
                    }
                  }}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-all duration-150
                    ${isSelected 
                      ? 'bg-white/10 border-white/20' 
                      : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/15'
                    }
                  `}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400/60 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-white/80 line-clamp-2">
                          {checkpoint.commit_message}
                        </p>
                      </div>
                    </div>
                    
                    {/* Merge button - show for all checkpoints except the first */}
                    {checkpoint.commit_hash && firstCheckpointHash && checkpoint.commit_hash !== firstCheckpointHash && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMergeCheckpoint(checkpoint.commit_hash, e); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                                 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                 hover:from-blue-500/20 hover:to-purple-500/20 
                                 border border-blue-500/20 text-blue-400
                                 transition-all duration-200 flex-shrink-0"
                        title={`Merge checkpoint ${checkpoint.commit_hash.slice(0, 7)}`}
                      >
                        <GitMerge className="w-3 h-3" />
                        Merge
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white/40">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(new Date(checkpoint.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {checkpoint.diff_stats && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">
                          {checkpoint.diff_stats.filesChanged} files
                        </span>
                        <span className="text-green-400">
                          +{checkpoint.diff_stats.additions}
                        </span>
                        <span className="text-red-400">
                          -{checkpoint.diff_stats.deletions}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-[10px] text-white/30 font-mono">
                      {checkpoint.commit_hash?.slice(0, 7) || 'unknown'}
                    </code>
                    {checkpoint.commit_hash && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCommitHash(checkpoint.commit_hash);
                        }}
                        className="text-white/30 hover:text-white/60"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedCheckpoint ? (
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white/90">
                    Changes in this checkpoint
                  </h3>
                  {(() => {
                    const checkpoint = checkpoints.find(c => c.id === selectedCheckpoint);
                    const checkpointIndex = checkpoints.findIndex(c => c.id === selectedCheckpoint);
                    const prevCheckpoint = checkpoints[checkpointIndex + 1];
                    if (checkpoint) {
                      return (
                        <p className="text-xs text-white/50 mt-1">
                          {prevCheckpoint && prevCheckpoint.commit_hash && checkpoint.commit_hash
                            ? `Comparing ${prevCheckpoint.commit_hash.slice(0, 7)} → ${checkpoint.commit_hash.slice(0, 7)}`
                            : checkpoint.commit_hash
                            ? `Changes from parent → ${checkpoint.commit_hash.slice(0, 7)}`
                            : 'No commit hash available'
                          }
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                {agent.agent_cwd && (
                  <button
                    onClick={() => {
                      const checkpoint = checkpoints.find(c => c.id === selectedCheckpoint);
                      if (checkpoint) {
                        window.open(`vscode://file/${agent.agent_cwd}`, '_blank');
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open in VS Code
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoadingDiff ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/50 mx-auto mb-3" />
                    <p className="text-white/50 text-sm">Loading changes...</p>
                  </div>
                </div>
              ) : checkpointFileChanges.length > 0 ? (
                <div className="space-y-1">
                  {checkpointFileChanges.map((file, index) => {
                    const checkpoint = checkpoints.find(c => c.id === selectedCheckpoint);
                    const checkpointIndex = checkpoints.findIndex(c => c.id === selectedCheckpoint);
                    const prevCheckpoint = checkpoints[checkpointIndex + 1];
                    // Use parent of current checkpoint if no previous checkpoint exists
                    const fromHash = prevCheckpoint?.commit_hash || `${checkpoint?.commit_hash}~1`;
                    const toHash = checkpoint?.commit_hash;
                    
                    return (
                      <motion.button
                        key={file.path}
                        onClick={() => toHash && openFileDiff(file.path, fromHash, toHash)}
                        className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] 
                                 border border-white/10 hover:border-white/20 transition-all duration-150
                                 group"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* File icon with status indicator */}
                            <div className="relative flex-shrink-0">
                              <File className="w-4 h-4 text-white/40" />
                              {file.status === 'added' && (
                                <Plus className="w-2.5 h-2.5 text-green-400 absolute -bottom-1 -right-1" />
                              )}
                              {file.status === 'deleted' && (
                                <Minus className="w-2.5 h-2.5 text-red-400 absolute -bottom-1 -right-1" />
                              )}
                              {file.status === 'modified' && (
                                <Edit className="w-2.5 h-2.5 text-blue-400 absolute -bottom-1 -right-1" />
                              )}
                            </div>
                            
                            {/* File path */}
                            <span className="text-sm text-white/70 truncate group-hover:text-white/90">
                              {file.path}
                            </span>
                          </div>
                          
                          {/* Change indicators */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {file.additions > 0 && (
                              <span className="text-xs text-green-400">
                                +{file.additions}
                              </span>
                            )}
                            {file.deletions > 0 && (
                              <span className="text-xs text-red-400">
                                -{file.deletions}
                              </span>
                            )}
                            <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/50" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-white/40">
                  No changes to display
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full">
            {/* Show overall session stats when available */}
            {overallStats && !isLoadingOverallStats ? (
              <div className="h-full flex flex-col p-6">
                  <motion.div 
                    className="flex-shrink-0 text-center mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GitBranch className="w-10 h-10 text-white/30 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-white/90 mb-1">Session Overview</h3>
                    <p className="text-sm text-white/50">
                      Total changes across {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}
                    </p>
                  </motion.div>
                  
                  {/* Stats Cards */}
                  <motion.div 
                    className="grid grid-cols-3 gap-3 mb-6 flex-shrink-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/10">
                      <div className="text-xl font-semibold text-white/90">
                        {overallStats.filesChanged}
                      </div>
                      <div className="text-xs text-white/50">
                        File{overallStats.filesChanged !== 1 ? 's' : ''} Changed
                      </div>
                    </div>
                    
                    <div className="bg-green-500/[0.08] rounded-lg p-3 border border-green-500/20">
                      <div className="text-xl font-semibold text-green-400">
                        +{overallStats.additions}
                      </div>
                      <div className="text-xs text-white/50">
                        Addition{overallStats.additions !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <div className="bg-red-500/[0.08] rounded-lg p-3 border border-red-500/20">
                      <div className="text-xl font-semibold text-red-400">
                        -{overallStats.deletions}
                      </div>
                      <div className="text-xs text-white/50">
                        Deletion{overallStats.deletions !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </motion.div>

                  {/* File Changes List */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="space-y-1">
                      {fileChanges.map((file, index) => (
                        <motion.button
                          key={file.path}
                          onClick={() => openFileDiff(file.path)}
                          className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] 
                                   border border-white/10 hover:border-white/20 transition-all duration-150
                                   group"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.02 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* File icon with status indicator */}
                              <div className="relative flex-shrink-0">
                                <File className="w-4 h-4 text-white/40" />
                                {file.status === 'added' && (
                                  <Plus className="w-2.5 h-2.5 text-green-400 absolute -bottom-1 -right-1" />
                                )}
                                {file.status === 'deleted' && (
                                  <Minus className="w-2.5 h-2.5 text-red-400 absolute -bottom-1 -right-1" />
                                )}
                                {file.status === 'modified' && (
                                  <Edit className="w-2.5 h-2.5 text-blue-400 absolute -bottom-1 -right-1" />
                                )}
                              </div>
                              
                              {/* File path */}
                              <span className="text-sm text-white/70 truncate group-hover:text-white/90">
                                {file.path}
                              </span>
                            </div>
                            
                            {/* Change indicators */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {file.additions > 0 && (
                                <span className="text-xs text-green-400">
                                  +{file.additions}
                                </span>
                              )}
                              {file.deletions > 0 && (
                                <span className="text-xs text-red-400">
                                  -{file.deletions}
                                </span>
                              )}
                              <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/50" />
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-xs text-white/40 mt-4 text-center flex-shrink-0">
                    Click on a file to view side-by-side diff
                  </p>
                </div>
              ) : isLoadingOverallStats ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mx-auto mb-3" />
                    <p className="text-white/50 text-sm">Calculating session stats...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50">Select a checkpoint to view changes</p>
                  </div>
                </div>
              )}
          </div>
        )}
        
        {/* Sticky Merge Bar - appears when session is complete and not finalized */}
        {agent.status === 'complete' && !agent.isFinalized && agent.agent_cwd && (
          <motion.div 
            className="flex-shrink-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-sm text-white/90">Ready to merge</p>
                  <p className="text-xs text-white/50">
                    {checkpoints.length} checkpoints • Review changes before merging
                  </p>
                </div>
              </div>
              
              <MergeWorktreeButton
                sessionId={sessionId}
                sessionName={agent.mission_title}
                workspacePath={agent.agent_cwd}
                variant="default"
                size="sm"
                className="bg-green-500/20 hover:bg-green-500/30 
                         border-green-500/30 text-green-400"
                data-merge-button={sessionId}
              />
            </div>
          </motion.div>
        )}
      </div>
      </div>

      {/* Monaco Diff Viewer Modal */}
      {diffViewer.isOpen && diffViewer.originalContent !== undefined && diffViewer.modifiedContent !== undefined && (
        <DiffViewer
          originalContent={diffViewer.originalContent}
          modifiedContent={diffViewer.modifiedContent}
          originalTitle={`${diffViewer.filePath} (original)`}
          modifiedTitle={`${diffViewer.filePath} (modified)`}
          language={diffViewer.language || 'plaintext'}
          onClose={() => setDiffViewer({ isOpen: false })}
        />
      )}

      {/* Hidden merge trigger to guarantee modal availability */}
      {agent.agent_cwd && (
        <div className="hidden">
          <MergeWorktreeButton
            sessionId={sessionId}
            sessionName={agent.mission_title}
            workspacePath={agent.agent_cwd}
            variant="default"
            size="sm"
            data-merge-button={sessionId}
          />
        </div>
      )}
    </>
  );
};

export default CheckpointsPane;