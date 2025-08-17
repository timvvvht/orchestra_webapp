/**
 * Merge Confirmation Dialog - Orchestra Design System
 * Dark glassmorphic design with mystical minimalism
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, GitMerge, AlertTriangle, Check, FileText, Plus, Minus, RotateCcw, Eye, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { checkRepoDirtyLightweight, invokePreviewMergeWorktree } from '@/utils/worktreeApi';
import type { FinalizeResultResponse } from '@/types/worktreeTypes';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { AdvancedMonacoDiffViewer, detectLanguage } from '../AdvancedMonacoDiffViewer';

interface MergeResult {
  success: boolean;
  strategy: string;
  files_changed: Array<{
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
  }>;
  new_head: string;
  merge_message: string;
  stats: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
}

import type { MergePreviewSummary } from '@/types/worktreeTypes';

interface MergeConfirmDialogProps {
  open: boolean;
  onConfirm: (opts?: { keepWorktree?: boolean }) => Promise<{ ok: boolean; result?: FinalizeResultResponse; error?: string }> | void;
  onCancel: () => void;
  preview?: MergePreviewSummary | null;
  previewError?: string | null;
  previewLoading?: boolean;
  projectRoot?: string;
  sessionId?: string;
  autoCloseAfterMs?: number; // Auto-close dialog after successful merge (0 = no auto-close)
  onMerged?: (result: { ok: boolean; result?: FinalizeResultResponse; error?: string }) => void; // Callback when merge completes
}

export const MergeConfirmDialog: React.FC<MergeConfirmDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  preview,
  previewError,
  previewLoading,
  projectRoot: projectRootProp,
  sessionId,
  autoCloseAfterMs = 0,
  onMerged,
}) => {

  const [isClosing, setIsClosing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [keepWorktree, setKeepWorktree] = useState(false);
  const { toast } = useToast();
  const [opResult, setOpResult] = useState<{ ok: boolean; result?: FinalizeResultResponse; error?: string } | null>(null);
  const [verified, setVerified] = useState<{ clean: boolean; timestamp: string } | null>(null);
  const [postPreview, setPostPreview] = useState<{ files_changed: number; insertions: number; deletions: number } | null>(null);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [diffFiles, setDiffFiles] = useState<any[]>([]);
  const [loadingDiffFiles, setLoadingDiffFiles] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem('mc.hideMergeConfirmation');
      if (v === 'true') setDontShowAgain(true);
    } catch {}
  }, []);

  // Initialize keepWorktree from localStorage, default true for optionality
  useEffect(() => {
    try {
      const v = localStorage.getItem('mc.keepWorktree');
      setKeepWorktree(v === null ? true : v === 'true');
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('mc.keepWorktree', keepWorktree ? 'true' : 'false'); } catch {}
  }, [keepWorktree]);

  // Auto-close timer after successful merge
  useEffect(() => {
    if (open && opResult?.ok && autoCloseAfterMs > 0) {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
      }
      closeTimer.current = window.setTimeout(() => {
        onCancel();
      }, autoCloseAfterMs);
    }
    return () => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
  }, [open, opResult?.ok, autoCloseAfterMs, onCancel]);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return <Plus className="w-3 h-3 text-green-400" />;
      case 'deleted': return <Minus className="w-3 h-3 text-red-400" />;
      case 'modified': return <FileText className="w-3 h-3 text-blue-400" />;
      case 'renamed': return <RotateCcw className="w-3 h-3 text-purple-400" />;
      default: return <FileText className="w-3 h-3 text-gray-400" />;
    }
  };

  const handleOpenDiffViewer = async () => {
    if (!preview || !projectRootProp) return;
    
    setLoadingDiffFiles(true);
    try {
      // Create diff files from preview changes
      const diffFilesData = await Promise.all(
        preview.changes.map(async (change, index) => {
          const filePath = `${projectRootProp}/${change.path}`;
          const filename = change.path.split('/').pop() || change.path;
          
          try {
            // For now, we'll use the current content as both original and modified
            // In a real implementation, you'd fetch the actual file contents
            const currentContent = '// File content would be loaded here\n// Path: ' + change.path + '\n// Status: ' + change.status;
            const originalContent = '// Original content would be loaded here\n// Path: ' + change.path;
            
            return {
              id: `${change.path}-${index}`,
              filename,
              filepath: filePath,
              originalContent,
              modifiedContent: currentContent,
              currentContent,
              language: detectLanguage(filename),
              hasUnsavedChanges: false,
            };
          } catch (error) {
            console.error(`Error processing file ${change.path}:`, error);
            return null;
          }
        })
      );

      // Filter out null entries
      const validFiles = diffFilesData.filter(file => file !== null);
      setDiffFiles(validFiles);
      setShowDiffViewer(true);
    } catch (error) {
      console.error('Error loading diff files:', error);
      toast({
        title: 'Error Loading Diff',
        description: 'Failed to load file changes for detailed view',
        variant: 'error',
        placement: 'bottom-right',
        duration: 5000,
        icon: <AlertTriangle className="w-4 h-4 text-red-400" />
      });
    } finally {
      setLoadingDiffFiles(false);
    }
  };

  const showMergeResultToast = (result: MergeResult) => {
    toast({
      title: 'Merge Completed Successfully',
      description: (
        <div className="space-y-3">
          {/* Summary stats */}
          <div className="text-sm text-white/80">
            <div className="flex items-center gap-4 mb-2">
              <span><strong>{result.stats.files_changed}</strong> files changed</span>
              <span className="text-green-400"><strong>+{result.stats.insertions}</strong> insertions</span>
              <span className="text-red-400"><strong>-{result.stats.deletions}</strong> deletions</span>
            </div>
            <div className="text-xs text-white/60 font-mono">
              Strategy: {result.strategy} • HEAD: {result.new_head.substring(0, 8)}
            </div>
          </div>

          {/* Merge message */}
          <div className="bg-black/30 rounded-lg p-3">
            <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono">
              {result.merge_message}
            </pre>
          </div>

          {/* File changes (show all with scrolling) */}
          {result.files_changed.length > 0 && (
            <div>
              <div className="text-xs font-medium text-white/70 mb-2">
                Changed Files ({result.files_changed.length}):
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.files_changed.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {getStatusIcon(file.status)}
                    <span className="flex-1 font-mono text-white/80 break-all">
                      {file.path}
                    </span>
                    <div className="flex items-center gap-1 text-white/50 flex-shrink-0">
                      {file.additions > 0 && (
                        <span className="text-green-400">+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className="text-red-400">-{file.deletions}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      variant: 'success',
      placement: 'bottom-right',
      duration: 10000, // 10 seconds
      icon: <GitMerge className="w-4 h-4 text-green-400" />
    });
  };

  const handleConfirm = async () => {
    try {
      if (dontShowAgain) {
        localStorage.setItem('mc.hideMergeConfirmation', 'true');
      } else {
        localStorage.removeItem('mc.hideMergeConfirmation');
      }
    } catch {}
    
    setIsProcessing(true);
    
    try {
      const result = await onConfirm({ keepWorktree });
      if (result && typeof result === 'object') {
        setOpResult(result);
        // Notify parent of merge result
        onMerged?.(result);
        // If merged successfully and user chose to prune worktree, mark session as finalized (read-only)
        if (result.ok && keepWorktree === false && sessionId) {
          try {
            useMissionControlStore.getState().updateSession(sessionId, { isFinalized: true, status: 'finalized' });
          } catch {}
        }
        // If operation succeeded, perform post-merge verification to ground success in truth
        if (result.ok) {
          try {
            const pr = projectRootProp || result.result?.project_root || undefined;
            if (pr) {
              const isDirty = await checkRepoDirtyLightweight(pr);
              setVerified({ clean: !isDirty, timestamp: new Date().toISOString() });
              if (sessionId) {
                try {
                  const prev = await invokePreviewMergeWorktree(sessionId, pr);
                  setPostPreview({ files_changed: prev.files_changed, insertions: prev.insertions, deletions: prev.deletions });
                } catch {}
              }
            }
          } catch (e) {
            // Non-blocking verification failure
          }
        }
      }
    } catch (error) {
      console.error('Merge failed:', error);
      // Show error toast
      toast({
        title: 'Merge Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred during merge',
        variant: 'error',
        placement: 'bottom-right',
        duration: 8000,
        icon: <AlertTriangle className="w-4 h-4 text-red-400" />
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
      setIsClosing(false);
    }, 200);
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Mobile viewport handling
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!open) return null;

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

      {/* Modal with expanding animation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            "relative mx-auto",
            "bg-white/[0.03] backdrop-blur-xl",
            "rounded-2xl shadow-2xl",
            "border border-white/20",
            "overflow-hidden",
            "flex flex-col",
            isMobile ? "w-full max-w-sm max-h-[90vh]" : "w-full max-w-2xl max-h-[85vh]"
          )}
        >
          {/* Mystical gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />

          {/* Header - Mystical and elegant */}
          <div className="shrink-0 border-b border-white/10 px-8 sm:px-10 pt-8 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  {/* Energy field animation */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(0, 119, 237, 0.2)",
                        "0 0 0 12px rgba(0, 119, 237, 0)",
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                  
                  {/* Icon orb */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/[0.05] backdrop-blur-sm flex-shrink-0">
                    <GitMerge className="w-5 h-5 text-white/60" />
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h2 className="text-2xl font-light text-white tracking-tight">
                    Merge Worktree Changes
                  </h2>
                  <p className="text-white/50 mt-1 text-sm font-light">
                    Finalize your session
                  </p>
                </div>
              </div>

              {/* Close button - subtle */}
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors group flex-shrink-0"
              >
                <X className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-8 sm:px-10 pb-8 space-y-6">
            {/* Post-merge definitive confirmation */}
            {opResult && opResult.ok && (
              <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/10" role="status" aria-live="polite">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-white/90 font-medium">Changes merged</span>
                </div>
                {opResult.result?.status === 'merged' && (opResult.result as any).commit && (
                  <div className="text-sm text-white/80 font-mono">
                    Commit: {(opResult.result as any).commit.slice(0, 8)}
                  </div>
                )}
                {verified && (
                  <div className="text-sm">
                    {verified.clean ? (
                      <span className="text-green-300">Repository status: Clean at {new Date(verified.timestamp).toLocaleTimeString()}</span>
                    ) : (
                      <span className="text-amber-300">Repository status could not be verified as clean.</span>
                    )}
                  </div>
                )}
                {postPreview && (
                  <div className="text-xs text-white/60">
                    {postPreview.files_changed === 0 ? (
                      <span>No pending changes to merge.</span>
                    ) : (
                      <span>
                        Remaining differences: {postPreview.files_changed} files (+{postPreview.insertions}/-{postPreview.deletions})
                      </span>
                    )}
                  </div>
                )}
                {keepWorktree && (
                  <div className="text-xs text-white/60">Worktree preserved for further work</div>
                )}
              </div>
            )}

            {/* Error panel */}
            {opResult && !opResult.ok && (
              <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-white/80">{opResult.error || 'Merge could not be completed'}</span>
                </div>
                <div className="text-xs text-white/60">If conflicts were detected, use the conflict resolver to proceed, then retry the merge.</div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-4">
              <p className="text-sm text-white/70 leading-relaxed pt-4">
                This will merge your session's changes back to the main repository. 
                The merge will proceed automatically unless there are conflicts that require resolution.
              </p>

              {/* Preview block */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full"
                    />
                    Previewing changes…
                  </div>
                ) : previewError ? (
                  <div className="flex items-start gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>Failed to load preview. You can still proceed with merge.</span>
                  </div>
                ) : preview ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white/80">
                        <div className="flex items-center gap-4 mb-1">
                          <span><strong>{preview.files_changed}</strong> files changed</span>
                          <span className="text-green-400"><strong>+{preview.insertions}</strong> insertions</span>
                          <span className="text-red-400"><strong>-{preview.deletions}</strong> deletions</span>
                        </div>
                        <div className="text-xs text-white/50 font-mono">{preview.base} → {preview.target}</div>
                      </div>
                      
                      {/* Diff Viewer Button */}
                      {preview.changes.length > 0 && projectRootProp && (
                        <button
                          onClick={handleOpenDiffViewer}
                          disabled={loadingDiffFiles}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200",
                            "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200",
                            "border border-blue-500/30 hover:border-blue-500/50",
                            loadingDiffFiles && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {loadingDiffFiles ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-3 h-3 border border-blue-300/50 border-t-blue-300 rounded-full"
                              />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              View Details
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {preview.changes.length > 0 && (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {preview.changes.map((c, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {getStatusIcon(
                              c.status === 'A' ? 'added' : c.status === 'D' ? 'deleted' : c.status === 'R' ? 'renamed' : 'modified'
                            )}
                            <span className="flex-1 font-mono text-white/80 break-all">{c.path}</span>
                            <div className="flex items-center gap-1 text-white/50 flex-shrink-0">
                              {c.additions > 0 && <span className="text-green-400">+{c.additions}</span>}
                              {c.deletions > 0 && <span className="text-red-400">-{c.deletions}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : preview && (preview as any).files_changed === 0 ? (
                  <div className="text-xs text-white/60">No changes to merge.</div>
                ) : (
                  <div className="text-xs text-white/50">No preview available.</div>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  This action cannot be undone. Ensure your changes are ready for integration.
                </p>
              </div>
            </div>

            {/* Don't show again checkbox */}
            {/* <div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded border-2 transition-all duration-200",
                    dontShowAgain 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-white/[0.03] border-white/20 group-hover:border-white/30'
                  )}>
                    {dontShowAgain && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <Check className="w-3 h-3 text-white m-0.5" />
                      </motion.div>
                    )}
                  </div>
                </div>
                <span className="text-sm text-white/60 group-hover:text-white/70 transition-colors">
                  Don't show this confirmation again
                </span>
              </label>
            </div> */}

            {/* Keep worktree option */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={keepWorktree}
                  onChange={(e) => setKeepWorktree(e.target.checked)}
                  className="sr-only"
                />
                <div className={cn(
                  "w-5 h-5 rounded border-2 transition-all duration-200",
                  keepWorktree 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white/[0.03] border-white/20 group-hover:border-white/30'
                )}>
                  {keepWorktree && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <Check className="w-3 h-3 text-white m-0.5" />
                    </motion.div>
                  )}
                </div>
                <span className="text-sm text-white/70">Keep worktree after merge (don’t prune)</span>
              </label>
            </div>
          </div>

          {/* Footer - Clean action bar */}
          <div className="shrink-0 border-t border-white/10 bg-black/50 px-8 sm:px-10 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors font-light"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={cn(
                    "group relative px-6 py-2 rounded-xl text-sm font-normal transition-all duration-300 flex items-center gap-2",
                    isProcessing 
                      ? "bg-white/50 text-black/50 cursor-not-allowed"
                      : "bg-white text-black hover:scale-105 active:scale-100",
                    "overflow-hidden"
                  )}
                >
                  {/* Gradient overlay on hover */}
                  <div className="
                    absolute inset-0
                    bg-gradient-to-r from-blue-400/20 to-purple-400/20
                    rounded-xl
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-300
                  " />
                  
                  <span className="relative z-10 flex items-center gap-2">
                    {isProcessing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                        />
                        Merging...
                      </>
                    ) : (
                      'Merge Changes'
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Monaco Diff Viewer Modal */}
      {showDiffViewer && diffFiles.length > 0 && (
        <AdvancedMonacoDiffViewer
          files={diffFiles}
          onClose={() => setShowDiffViewer(false)}
          onFilesUpdate={(updatedFiles) => setDiffFiles(updatedFiles)}
        />
      )}
    </>,
    document.body
  );
};