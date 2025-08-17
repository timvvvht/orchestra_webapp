import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  GitMerge, 
  FileText, 
  ArrowRight,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  GitBranch
} from 'lucide-react';
import { MergeWorktreeButton } from './MergeWorktreeButton';
import { MissionControlAgent } from '@/stores/missionControlStore';
import { getDiffStatsFromUnifiedDiff } from '@/utils/gitDiffStats';
import { DiffStats } from '@/types/gitTypes';
import { supabase } from '@/auth/SupabaseClient';
import { SCMManager } from '@/services/scm/SCMManager';

interface CompletionCardProps {
  sessionId: string;
  agent: MissionControlAgent;
  onViewCheckpoints?: () => void;
}

const CompletionCard: React.FC<CompletionCardProps> = ({ 
  sessionId, 
  agent,
  onViewCheckpoints 
}) => {
  const [diffStats, setDiffStats] = useState<DiffStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [checkpointCount, setCheckpointCount] = useState(0);

  useEffect(() => {
    if (agent.status === 'complete' && agent.agent_cwd) {
      loadCompletionStats();
    }
  }, [agent.status, agent.agent_cwd]);

  const loadCompletionStats = async () => {
    if (!sessionId || !agent.agent_cwd || isLoadingStats) return;
    
    setIsLoadingStats(true);
    
    try {
      // Get checkpoints to calculate overall diff
      const { data: checkpointData, error } = await supabase
        .from('chat_checkpoints')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const checkpoints = checkpointData || [];
      setCheckpointCount(checkpoints.length);

      // Calculate diff stats between first and last checkpoint
      if (checkpoints.length >= 2) {
        const earliestCheckpoint = checkpoints[0];
        const latestCheckpoint = checkpoints[checkpoints.length - 1];

        const scmManager = new SCMManager({
          forceBackend: 'rust',
          allowMockFallback: false
        });

        const diffString = await scmManager.diff(
          agent.agent_cwd,
          earliestCheckpoint.commit_hash,
          latestCheckpoint.commit_hash
        );

        const stats = getDiffStatsFromUnifiedDiff(diffString);
        setDiffStats(stats);
      }
    } catch (err) {
      console.error('[CompletionCard] Failed to load stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Don't show if not complete or finalized
  if (agent.status !== 'complete' || agent.isFinalized) {
    return null;
  }

  const canMerge = agent.agent_cwd && !agent.isFinalized;

  return (
    <motion.div 
      className="mx-4 my-6 relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl" />
      
      <div className="relative bg-black/40 backdrop-blur-sm border border-green-500/20 rounded-xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div className="absolute inset-0 animate-ping">
                <CheckCircle className="w-6 h-6 text-green-400 opacity-75" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Task Complete</h3>
              <p className="text-sm text-white/60 mt-0.5">{agent.mission_title}</p>
            </div>
          </div>
          
          {/* Sparkle decoration */}
          <Sparkles className="w-5 h-5 text-yellow-400/60" />
        </div>

        {/* Stats Grid */}
        {diffStats && (
          <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-white/10">
            <div className="text-center">
              <div className="text-2xl font-light text-white/90">{diffStats.filesChanged}</div>
              <div className="text-xs text-white/50 mt-1">Files Changed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-green-400">+{diffStats.additions}</div>
              <div className="text-xs text-white/50 mt-1">Additions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-red-400">-{diffStats.deletions}</div>
              <div className="text-xs text-white/50 mt-1">Deletions</div>
            </div>
          </div>
        )}

        {/* Checkpoint summary */}
        {checkpointCount > 0 && (
          <div className="flex items-center gap-2 mb-6 text-sm text-white/60">
            <GitBranch className="w-4 h-4" />
            <span>{checkpointCount} checkpoints saved during this session</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {canMerge ? (
            <>
              <MergeWorktreeButton
                sessionId={sessionId}
                sessionName={agent.mission_title}
                workspacePath={agent.agent_cwd}
                variant="primary"
                size="default"
                className="flex-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 
                         hover:from-green-500/30 hover:to-emerald-500/30 
                         border-green-500/30 text-green-400"
                showIcon={true}
              />
              
              {onViewCheckpoints && (
                <button
                  onClick={onViewCheckpoints}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white/80 
                           hover:bg-white/5 rounded-lg transition-all duration-150
                           flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Review Changes
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-400/60">
              <AlertTriangle className="w-4 h-4" />
              <span>Workspace required for merging</span>
            </div>
          )}
        </div>

        {/* Optional: Add keyboard shortcut hint */}
        {canMerge && (
          <div className="mt-4 text-xs text-white/30 text-center">
            Tip: Review changes in Checkpoints view before merging
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CompletionCard;