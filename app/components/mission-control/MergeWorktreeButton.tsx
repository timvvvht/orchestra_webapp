import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { GitMerge, Loader2 } from "lucide-react";
import { useMergeWorktree } from "@/hooks/useMergeWorktree";
import { useDirtyRepoStatus } from "@/hooks/useDirtyRepoStatus";
import { getRepoRootFromWorktree } from "@/utils/worktreeUtils";
import { MergeConfirmDialog } from "./MergeConfirmDialog";
import { useWorktreeMergePreview } from "@/hooks/useWorktreeMergePreview";
import { useHideMergeConfirm } from "@/hooks/useHideMergeConfirm";
import DirtyRepoDialog from "./DirtyRepoDialog";
import { ConflictDialog } from "./ConflictDialog";
import type { FinalizeResultResponse } from "@/types/worktreeTypes";

interface MergeWorktreeButtonProps {
  sessionId: string;
  sessionName?: string;
  workspacePath: string;
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "link"
    | "destructive"
    | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  isPending?: boolean; // Disable button if session is still being created
  backgroundProcessing?: boolean; // Disable button if background operations are in progress
  buttonText?: string; // Custom button text (defaults to "Merge & finalize")
  forceShowDialog?: boolean; // Force showing dialog regardless of "don't show again" preference
  onMerged?: (result: {
    ok: boolean;
    result?: FinalizeResultResponse;
    error?: string;
  }) => void; // Callback when merge completes
  autoCloseAfterMs?: number; // Auto-close dialog after successful merge (0 = no auto-close)
}

export const MergeWorktreeButton: React.FC<MergeWorktreeButtonProps> = ({
  sessionId,
  sessionName,
  workspacePath,
  variant = "outline",
  size = "sm",
  className,
  isPending = false,
  backgroundProcessing = false,
  buttonText = "Merge & finalize",
  forceShowDialog = false,
  onMerged,
  autoCloseAfterMs = 0,
}) => {
  const {
    mergeWorktree,
    isLoading,
    hasConflict,
    conflictedFiles,
    clearConflict,
  } = useMergeWorktree();
  const [hide] = useHideMergeConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    isLoading: isPreviewLoading,
    error: previewError,
    data: previewData,
    fetchPreview,
  } = useWorktreeMergePreview();
  const [dirtyOpen, setDirtyOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<any>(null);
  const [prefetchDirty, setPrefetchDirty] = useState(false);

  // Get project root for dirty repo check
  const projectRoot = getRepoRootFromWorktree(workspacePath);
  const { isLoading: isDirtyLoading, refetch: refetchDirtyRepo } =
    useDirtyRepoStatus(projectRoot, prefetchDirty);

  // Auto-open conflict dialog when conflicts are detected
  useEffect(() => {
    if (hasConflict && conflictedFiles && conflictedFiles.length > 0) {
      console.log(
        "[MergeWorktreeButton] Auto-opening conflict dialog for files:",
        conflictedFiles
      );
      console.log(
        `[MergeWorktreeButton] Session ${sessionId.slice(0, 8)}... has ${
          conflictedFiles.length
        } conflicted files`
      );

      // Set up conflict info for the dialog
      setConflictInfo({
        sessionId,
        sessionName,
        projectRoot,
        worktreePath: workspacePath,
        conflictedFiles,
        patch: "", // This will be populated by the backend response
      });
      setConflictDialogOpen(true);
    }
  }, [
    hasConflict,
    conflictedFiles,
    sessionId,
    sessionName,
    projectRoot,
    workspacePath,
  ]);

  const handleMergeInternal = async () => {
    console.log(`[MergeWorktreeButton] Converting paths:`, {
      workspacePath,
      projectRoot,
      sessionId: sessionId.slice(0, 8) + "...",
    });

    // Always force a live dirty check before merging
    console.log(
      "[MergeWorktreeButton] Forcing live dirty check before merge..."
    );
    const { data: freshDirty } = await refetchDirtyRepo();
    console.log(`[MergeWorktreeButton] Live dirty check result: ${freshDirty}`);
    if (freshDirty === true) {
      console.log(
        "[MergeWorktreeButton] Live dirty check returned true – opening dialog"
      );
      setDirtyOpen(true);
      return;
    }

    try {
      await mergeWorktree({
        sessionId,
        sessionName: sessionName || sessionId,
        projectRoot,
      });
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && e.code === "DirtyRepo") {
        setDirtyOpen(true);
        return;
      }
      // Other errors are handled by the hook
    }
  };

  const handleCompleteMerge = async () => {
    console.log(
      `[MergeWorktreeButton] Retrying merge after conflict resolution for session: ${sessionId.slice(
        0,
        8
      )}...`
    );
    console.log(`[MergeWorktreeButton] Using project root: ${projectRoot}`);

    try {
      const success = await mergeWorktree({
        sessionId,
        sessionName: sessionName || sessionId,
        projectRoot,
      });

      if (success) {
        // Clear conflict state and close dialog
        clearConflict();
        setConflictDialogOpen(false);
        setConflictInfo(null);
        console.log(
          `[MergeWorktreeButton] Merge completed successfully after conflict resolution for session: ${sessionId.slice(
            0,
            8
          )}...`
        );
      } else {
        console.log(
          `[MergeWorktreeButton] Merge retry failed for session: ${sessionId.slice(
            0,
            8
          )}...`
        );
      }
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && e.code === "DirtyRepo") {
        console.log(
          `[MergeWorktreeButton] Dirty repo detected during merge retry for session: ${sessionId.slice(
            0,
            8
          )}...`
        );
        setDirtyOpen(true);
        setConflictDialogOpen(false);
        setConflictInfo(null);
        return;
      }
      console.error(
        `[MergeWorktreeButton] Error during merge retry for session ${sessionId.slice(
          0,
          8
        )}...:`,
        e
      );
      // Other errors are handled by the hook
    }
  };

  const handleMerge = async () => {
    // Don't allow merge if session is pending, background processing, or already loading
    if (isPending || backgroundProcessing || isLoading) {
      return;
    }

    // Trigger dirty repo check if not already prefetched
    if (!prefetchDirty) {
      setPrefetchDirty(true);
    }

    // Always read the latest preference from localStorage at click time
    let shouldHide = hide;
    try {
      const v = localStorage.getItem("mc.hideMergeConfirmation");
      if (v !== null) shouldHide = v === "true";
    } catch {}

    // Force showing dialog if requested (e.g., from CheckpointPill)
    if (forceShowDialog) shouldHide = false;

    if (!shouldHide) {
      setDialogOpen(true);
    }

    try {
      // Fire preview fetch regardless (dialog uses it)
      await fetchPreview(sessionId, projectRoot);
    } catch (e) {
      // Non-blocking
    }

    if (shouldHide) {
      handleMergeInternal();
    }
  };

  const handleConfirm = async (opts?: { keepWorktree?: boolean }) => {
    // Do NOT close dialog here; let dialog manage its own lifecycle and show definitive result
    const keepWorktree = !!opts?.keepWorktree;
    return await mergeWorktree({
      sessionId,
      sessionName: sessionName || sessionId,
      projectRoot,
      keepWorktree,
    });
  };

  const handleCancel = () => {
    setDialogOpen(false);
  };

  // Note: Toast notifications and error handling (including DirtyRepo errors) are handled by useMergeWorktree hook
  // Button state automatically resets when merge completes or fails

  return (
    <>
      <div className="inline-flex items-stretch gap-1">
        <Button
          variant={variant}
          size={size}
          onClick={handleMerge}
          onMouseEnter={() => setPrefetchDirty(true)}
          disabled={
            isLoading ||
            isPending ||
            backgroundProcessing ||
            dirtyOpen ||
            dialogOpen
          }
          className={className}
          title={
            isPending
              ? "Session is still being created..."
              : backgroundProcessing
                ? "Background operations in progress..."
                : isPreviewLoading
                  ? "Previewing changes…"
                  : isDirtyLoading
                    ? "Checking repository status..."
                    : dirtyOpen
                      ? "Repository has uncommitted changes - resolve first"
                      : `Merge & finalize worktree for ${sessionName || sessionId}`
          }
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitMerge className="h-4 w-4" />
          )}
          {size !== "icon" && (
            <span className="ml-2">
              {isLoading ? "Merging..." : buttonText}
            </span>
          )}
        </Button>
      </div>

      <MergeConfirmDialog
        open={dialogOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        preview={previewData}
        previewError={previewError}
        previewLoading={isPreviewLoading}
        projectRoot={projectRoot}
        sessionId={sessionId}
        autoCloseAfterMs={autoCloseAfterMs > 0 ? autoCloseAfterMs : undefined}
        onMerged={onMerged || undefined}
      />

      <DirtyRepoDialog
        open={dirtyOpen}
        projectRoot={projectRoot}
        onResolve={() => {
          setDirtyOpen(false);
          handleMergeInternal(); // retry automatically when clean
        }}
        onClose={() => setDirtyOpen(false)}
      />

      {/* Conflict Resolution Dialog */}
      <ConflictDialog
        open={conflictDialogOpen}
        onClose={() => {
          setConflictDialogOpen(false);
          clearConflict();
          setConflictInfo(null);
        }}
        conflictInfo={conflictInfo}
        onResolvedAll={handleCompleteMerge}
      />
    </>
  );
};
