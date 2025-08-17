/**
 * SCM Info Modal - Reimagined with Orchestra Design System
 * Dark glassmorphic design matching PermissionsModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, GitBranch, GitCommit, FolderOpen, Clock, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SCMManager } from '@/services/scm/SCMManager';
import { supabase } from '@/auth/SupabaseClient';
import { getDefaultACSClient } from '@/services/acs';
import { cn } from '@/lib/utils';
import type { Commit } from '@/services/scm/types';

interface SCMInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

interface SCMInfo {
  workspacePath: string | null;
  hasRepository: boolean;
  currentCommit: string | null;
  backendType: string;
  isRealBackend: boolean;
  history: Commit[];
  checkpoints: any[];
  sessionInfo: {
    sessionId: string;
    agentCwd: string | null;
    createdAt: string | null;
  } | null;
  stats: {
    totalCheckpoints: number;
    startCheckpoints: number;
    endCheckpoints: number;
    uniqueCommits: number;
  };
  error: string | null;
}

const InfoSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'error';
}> = ({ title, icon, children, variant = 'default' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'error':
        return 'border-red-500/20 bg-red-500/5';
      default:
        return 'border-white/10 bg-white/[0.02]';
    }
  };

  return (
    <div className={cn("p-4 rounded-xl border backdrop-blur-sm", getVariantStyles())}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-light text-sm text-white/90">{title}</h3>
      </div>
      {children}
    </div>
  );
};

export const SCMInfoModal: React.FC<SCMInfoModalProps> = ({
  isOpen,
  onClose,
  sessionId
}) => {
  const [scmInfo, setSCMInfo] = useState<SCMInfo>({
    workspacePath: null,
    hasRepository: false,
    currentCommit: null,
    backendType: 'Unknown',
    isRealBackend: false,
    history: [],
    checkpoints: [],
    sessionInfo: null,
    stats: {
      totalCheckpoints: 0,
      startCheckpoints: 0,
      endCheckpoints: 0,
      uniqueCommits: 0
    },
    error: null
  });
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const scmManager = new SCMManager({
    forceBackend: 'rust',
    allowMockFallback: false
  });

  // Get session workspace path
  const getSessionWorkspacePath = async (sessionId: string): Promise<string | null> => {
    try {
      const acsClient = getDefaultACSClient();
      const response = await acsClient.sessions.getSession(sessionId, {
        includeMessages: false
      });
      return response.data.agent_cwd || null;
    } catch (error) {
      console.error('Failed to get session workspace path:', error);
      return null;
    }
  };

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, handleClose]);

  // Load SCM information
  const loadSCMInfo = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    const newInfo: SCMInfo = {
      workspacePath: null,
      hasRepository: false,
      currentCommit: null,
      backendType: scmManager.getBackendType(),
      isRealBackend: scmManager.isRealBackend(),
      history: [],
      checkpoints: [],
      sessionInfo: null,
      stats: {
        totalCheckpoints: 0,
        startCheckpoints: 0,
        endCheckpoints: 0,
        uniqueCommits: 0
      },
      error: null
    };

    try {
      // Get workspace path
      newInfo.workspacePath = await getSessionWorkspacePath(sessionId);
      
      if (newInfo.workspacePath) {
        // Check if repository exists
        newInfo.hasRepository = await scmManager.hasRepository(newInfo.workspacePath);
        
        if (newInfo.hasRepository) {
          // Get current commit
          newInfo.currentCommit = await scmManager.getCurrentCommit(newInfo.workspacePath);
          
          // Get commit history
          try {
            newInfo.history = await scmManager.getHistory(newInfo.workspacePath, 10);
          } catch (err) {
            console.warn('Failed to get commit history:', err);
          }
        }
      }

      // Get session info
      try {
        const acsClient = getDefaultACSClient();
        const response = await acsClient.sessions.getSession(sessionId, {
          includeMessages: false
        });
        newInfo.sessionInfo = {
          sessionId,
          agentCwd: response.data.agent_cwd || null,
          createdAt: response.data.created_at || null
        };
      } catch (err) {
        console.warn('Failed to get session info:', err);
      }

      // Get checkpoints from database
      try {
        const { data: checkpoints, error } = await supabase
          .from('chat_checkpoints')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false });

        if (!error && checkpoints) {
          newInfo.checkpoints = checkpoints;
          
          // Calculate stats
          newInfo.stats.totalCheckpoints = checkpoints.length;
          newInfo.stats.startCheckpoints = checkpoints.filter(c => c.phase === 'start').length;
          newInfo.stats.endCheckpoints = checkpoints.filter(c => c.phase === 'end').length;
          
          const uniqueCommits = new Set(checkpoints.map(c => c.commit_hash).filter(Boolean));
          newInfo.stats.uniqueCommits = uniqueCommits.size;
        }
      } catch (err) {
        console.warn('Failed to get checkpoints:', err);
      }

    } catch (error) {
      newInfo.error = error instanceof Error ? error.message : String(error);
    }

    setSCMInfo(newInfo);
    setLoading(false);
  }, [sessionId]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && sessionId) {
      loadSCMInfo();
    }
  }, [isOpen, sessionId, loadSCMInfo]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop with smooth fade */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
      />
      
      {/* Modal with scale animation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className={cn(
            "relative w-full max-w-4xl transition-all duration-200",
            isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          )}
        >
          {/* Dark modal matching Orchestra theme */}
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            
            {/* Header - Minimal and elegant */}
            <div className="relative px-8 pt-8 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-light text-white tracking-tight">
                    SCM Information
                  </h2>
                  <p className="text-white/50 mt-1 text-sm font-light">
                    Source Control Management details for session {sessionId?.slice(0, 8)}...
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Refresh button */}
                  <button
                    onClick={loadSCMInfo}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors group disabled:opacity-50"
                  >
                    <RefreshCw className={cn(
                      "w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors",
                      loading && "animate-spin"
                    )} />
                  </button>
                  
                  {/* Close button - subtle */}
                  <button
                    onClick={handleClose}
                    className="p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <X className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                  </button>
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="px-8 pb-8 max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-white/60" />
                  <span className="ml-3 text-white/70 font-light">Loading SCM information...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Error Display */}
                  {scmInfo.error && (
                    <InfoSection
                      title="Error"
                      icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                      variant="error"
                    >
                      <p className="text-sm text-red-300 font-light">{scmInfo.error}</p>
                    </InfoSection>
                  )}

                  {/* Session Information */}
                  {scmInfo.sessionInfo && (
                    <InfoSection
                      title="Session Information"
                      icon={<Clock className="h-4 w-4 text-purple-400" />}
                    >
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-light text-white/70">Session ID:</span>
                          <code className="ml-2 text-xs bg-white/5 text-white/80 px-2 py-1 rounded font-mono">
                            {scmInfo.sessionInfo.sessionId}
                          </code>
                        </div>
                        {scmInfo.sessionInfo.createdAt && (
                          <div>
                            <span className="text-sm font-light text-white/70">Created:</span>
                            <span className="ml-2 text-sm text-white/80 font-light">
                              {new Date(scmInfo.sessionInfo.createdAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-4 gap-3 mt-4">
                          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-lg font-light text-blue-400">{scmInfo.stats.totalCheckpoints}</div>
                            <div className="text-xs text-white/50 font-light">Total</div>
                          </div>
                          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-lg font-light text-green-400">{scmInfo.stats.startCheckpoints}</div>
                            <div className="text-xs text-white/50 font-light">Start</div>
                          </div>
                          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-lg font-light text-orange-400">{scmInfo.stats.endCheckpoints}</div>
                            <div className="text-xs text-white/50 font-light">End</div>
                          </div>
                          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="text-lg font-light text-purple-400">{scmInfo.stats.uniqueCommits}</div>
                            <div className="text-xs text-white/50 font-light">Commits</div>
                          </div>
                        </div>
                      </div>
                    </InfoSection>
                  )}

                  {/* Backend Information */}
                  <InfoSection
                    title="SCM Backend"
                    icon={<GitBranch className="h-4 w-4 text-blue-400" />}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-light text-white/70">Backend Type:</span>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-light",
                          scmInfo.isRealBackend 
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
                            : "bg-white/10 text-white/60 border border-white/20"
                        )}>
                          {scmInfo.backendType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-light text-white/70">Real Backend:</span>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-light",
                          scmInfo.isRealBackend 
                            ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        )}>
                          {scmInfo.isRealBackend ? 'Yes' : 'No (Mock)'}
                        </span>
                      </div>
                    </div>
                  </InfoSection>

                  {/* Workspace Information */}
                  <InfoSection
                    title="Workspace"
                    icon={<FolderOpen className="h-4 w-4 text-green-400" />}
                  >
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-light text-white/70">Path:</span>
                        <code className="ml-2 text-xs bg-white/5 text-white/80 px-2 py-1 rounded font-mono">
                          {scmInfo.workspacePath || 'Not available'}
                        </code>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-light text-white/70">Has Repository:</span>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-light",
                          scmInfo.hasRepository 
                            ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        )}>
                          {scmInfo.hasRepository ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </InfoSection>

                  {/* Current Commit */}
                  {scmInfo.hasRepository && (
                    <InfoSection
                      title="Current Commit"
                      icon={<GitCommit className="h-4 w-4 text-purple-400" />}
                    >
                      {scmInfo.currentCommit ? (
                        <code className="text-sm bg-white/5 text-white/80 px-3 py-2 rounded font-mono">
                          {scmInfo.currentCommit}
                        </code>
                      ) : (
                        <span className="text-sm text-white/50 font-light">No commits found</span>
                      )}
                    </InfoSection>
                  )}

                  {/* Commit History */}
                  {scmInfo.hasRepository && (
                    <InfoSection
                      title="Recent Commits"
                      icon={<Clock className="h-4 w-4 text-orange-400" />}
                    >
                      {scmInfo.history.length > 0 ? (
                        <div className="space-y-3">
                          {scmInfo.history.map((commit, index) => (
                            <div key={commit.hash} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                              <code className="text-xs font-mono text-white/60 bg-white/10 px-2 py-1 rounded">
                                {commit.hash.slice(0, 8)}
                              </code>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-light text-white/90 truncate">{commit.message}</p>
                                <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                                  <span>{commit.authorName}</span>
                                  <span>•</span>
                                  <span>{new Date(commit.authorDate).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-white/50 font-light">No commit history available</span>
                      )}
                    </InfoSection>
                  )}

                  {/* Checkpoints */}
                  <InfoSection
                    title="Session Checkpoints"
                    icon={<FileText className="h-4 w-4 text-cyan-400" />}
                  >
                    {scmInfo.checkpoints.length > 0 ? (
                      <div className="space-y-3">
                        {scmInfo.checkpoints.slice(0, 10).map((checkpoint, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-light",
                              checkpoint.phase === 'start' 
                                ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            )}>
                              {checkpoint.phase}
                            </span>
                            <div className="flex-1 min-w-0">
                              <code className="text-xs font-mono text-white/60 bg-white/10 px-2 py-1 rounded">
                                {checkpoint.commit_hash?.slice(0, 8) || 'No commit'}
                              </code>
                              <div className="flex items-center gap-2 text-xs text-white/50 mt-2">
                                <span>{new Date(checkpoint.created_at).toLocaleString()}</span>
                                {checkpoint.stats && (
                                  <>
                                    <span>•</span>
                                    <span>{checkpoint.stats.filesChanged || 0} files</span>
                                    {checkpoint.stats.linesAdded > 0 && (
                                      <span className="text-green-400">+{checkpoint.stats.linesAdded}</span>
                                    )}
                                    {checkpoint.stats.linesRemoved > 0 && (
                                      <span className="text-red-400">-{checkpoint.stats.linesRemoved}</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {scmInfo.checkpoints.length > 10 && (
                          <div className="text-center py-2">
                            <span className="text-xs text-white/40 font-light">
                              Showing 10 of {scmInfo.checkpoints.length} checkpoints
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-white/50 font-light">No checkpoints found for this session</span>
                    )}
                  </InfoSection>
                </div>
              )}
            </div>

            {/* Footer - Clean action bar */}
            <div className="px-8 py-4 bg-black/50 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/30 font-light">
                  {scmInfo.sessionInfo ? (
                    `Session created ${scmInfo.sessionInfo.createdAt ? new Date(scmInfo.sessionInfo.createdAt).toLocaleDateString() : 'recently'}`
                  ) : (
                    'SCM information for current session'
                  )}
                </div>
                
                <button
                  onClick={handleClose}
                  className="px-6 py-2 rounded-xl text-sm font-normal transition-all duration-300 bg-white text-black hover:scale-105 active:scale-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default SCMInfoModal;