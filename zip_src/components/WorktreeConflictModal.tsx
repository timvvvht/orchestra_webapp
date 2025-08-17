/**
 * Modal for resolving Git merge conflicts in worktree
 * Provides Monaco-based diff viewer and conflict resolution tools
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AdvancedMonacoDiffViewer, detectLanguage } from '@/components/AdvancedMonacoDiffViewer';
import { readFileAbs, writeFileAbs } from '@/utils/worktreeFs';
import { toWorktreeAbsPath } from '@/utils/pathHelpers';
import { stripGitConflictMarkers } from '@/utils/conflictResolution';
import path from 'path';
import type { DiffFile } from '@/components/AdvancedMonacoDiffViewer';

// util: convert conflicted paths → DiffFile[]
export async function buildDiffFilesFromConflicts(
  worktreePath: string,
  conflictedFiles: string[],
): Promise<DiffFile[]> {
  const timestamp = Date.now();
  const out: DiffFile[] = [];
  for (const rel of conflictedFiles) {
    const abs = toWorktreeAbsPath(worktreePath, rel);
    const content = await readFileAbs(abs).catch(() => '');
    out.push({
      id: `${rel}-${timestamp}`,
      filename: path.basename(rel),
      filepath: abs,
      originalContent: content,
      modifiedContent: content,
      currentContent: content,
      language: detectLanguage(rel),
      hasUnsavedChanges: false,
    });
  }
  return out;
}

interface WorktreeConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName?: string;
  projectRoot: string;
  worktreePath: string;
  conflictedFiles: string[];
  onResolvedAll: () => Promise<void>;
}



export const WorktreeConflictModal: React.FC<WorktreeConflictModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  projectRoot,
  worktreePath,
  conflictedFiles,
  onResolvedAll
}) => {
  const [diffFiles, setDiffFiles] = useState<DiffFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Initialize diff files when modal opens
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const files = await buildDiffFilesFromConflicts(worktreePath, conflictedFiles);
      setDiffFiles(files);
      setCurrentIndex(0);
    })();
  }, [isOpen, worktreePath, conflictedFiles]);

  const isResolved = (file: DiffFile) => !stripGitConflictMarkers(file.currentContent).hadMarkers;
  const allResolved = diffFiles.every(isResolved);

  const handleSaveFile = useCallback(async (file: DiffFile) => {
    try {
      await writeFileAbs(file.filepath, file.currentContent);
      toast.success(`Saved ${file.filename}`);
    } catch (error) {
      console.error(`Failed to save file ${file.filename}:`, error);
      toast.error(`Failed to save file: ${file.filename}`);
    }
  }, []);

  const handleRevertFile = useCallback(async (file: DiffFile) => {
    try {
      await writeFileAbs(file.filepath, file.originalContent);
      toast.success(`Reverted ${file.filename}`);
    } catch (error) {
      console.error(`Failed to revert file ${file.filename}:`, error);
      toast.error(`Failed to revert file: ${file.filename}`);
    }
  }, []);

  const handleCompleteMerge = useCallback(async () => {
    try {
      setIsCompleting(true);
      console.log(`[WorktreeConflictModal] Completing merge for session: ${sessionId}`);
      console.log(`[WorktreeConflictModal] All files resolved, calling onResolvedAll callback`);
      
      await onResolvedAll();
      
      console.log(`[WorktreeConflictModal] Merge completed successfully for session: ${sessionId}`);
      toast.success('Merge completed successfully');
    } catch (error) {
      console.error(`[WorktreeConflictModal] Failed to complete merge for session ${sessionId}:`, error);
      toast.error('Failed to complete merge');
    } finally {
      setIsCompleting(false);
    }
  }, [onResolvedAll, sessionId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Resolve Merge Conflicts
            {sessionName && ` - ${sessionName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-4 min-h-0">
          {/* File List Sidebar */}
          <div className="w-64 border-r pr-4 flex flex-col">
            <h3 className="font-semibold mb-2">Conflicted Files</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {diffFiles.map((file, index) => {
                const resolved = isResolved(file);
                const statusColor = resolved ? 'bg-green-500' : file.hasUnsavedChanges ? 'bg-yellow-500' : 'bg-red-500';
                
                return (
                  <button
                    key={file.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      index === currentIndex
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                      <span className="truncate">{file.filename}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diff Viewer */}
          <div className="flex-1 flex flex-col min-h-0">
            {diffFiles.length > 0 && diffFiles[currentIndex] ? (
              <AdvancedMonacoDiffViewer
                files={diffFiles}
                initialFileIndex={currentIndex}
                onFilesUpdate={setDiffFiles}
                onSaveFile={handleSaveFile}
                onRevertFile={handleRevertFile}
                onClose={onClose}
              />
            ) : (
              <div className="flex items-center justify-center flex-1 text-gray-500">
                Loading conflicted files...
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteMerge}
            disabled={!allResolved || isCompleting}
          >
            {isCompleting ? 'Completing Merge...' : 'Complete Merge'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};