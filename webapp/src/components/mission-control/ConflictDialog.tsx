import React from "react";
import { WorktreeConflictModal } from "@/components/modals/WorktreeConflictModal";

export interface ConflictDialogProps {
  open: boolean;
  onClose: () => void;
  conflictInfo: {
    sessionId: string;
    sessionName?: string;
    projectRoot: string;
    worktreePath: string;
    conflictedFiles: string[];
    patch: string; // reserved for future usage
  };
  onResolvedAll: () => Promise<void>;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  open,
  onClose,
  conflictInfo,
  onResolvedAll,
}) => {
  if (!conflictInfo || !open) return null;
  return (
    <WorktreeConflictModal
      isOpen={open}
      onClose={onClose}
      sessionId={conflictInfo.sessionId}
      sessionName={conflictInfo.sessionName}
      projectRoot={conflictInfo.projectRoot}
      worktreePath={conflictInfo.worktreePath}
      conflictedFiles={conflictInfo.conflictedFiles}
      onResolvedAll={onResolvedAll}
    />
  );
};

export default ConflictDialog;
