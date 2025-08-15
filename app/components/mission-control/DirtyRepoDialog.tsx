import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DiffEditor } from "@monaco-editor/react";
import { useGitStatus } from "../../hooks/useGitStatus";
import { useGitDiffFile } from "../../hooks/useGitDiffFile";
import {
  useGitStage,
  useGitCommit,
  useGitStash,
  useGitDiscard,
} from "../../hooks/useGitMutations";
import { GitFileStatus, StageResult } from "../../types/gitTypes";
import { cn } from "cn-utility";

interface DirtyRepoDialogProps {
  open: boolean;
  projectRoot: string;
  onResolve: () => void; // Called when repo becomes clean
  onClose: () => void;
}

interface GitFileListProps {
  files: GitFileStatus[];
  selectedFiles: string[];
  onFileSelect: (filePath: string) => void;
  onFileToggle: (filePath: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

const GitFileList: React.FC<GitFileListProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onFileToggle,
  onSelectAll,
  onSelectNone,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.trim()) {
      case "M":
        return "text-blue-400"; // Modified
      case "A":
        return "text-green-400"; // Added
      case "D":
        return "text-red-400"; // Deleted
      case "R":
        return "text-purple-400"; // Renamed
      case "??":
        return "text-yellow-400"; // Untracked
      default:
        return "text-neutral-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.trim()) {
      case "M":
        return "Modified";
      case "A":
        return "Added";
      case "D":
        return "Deleted";
      case "R":
        return "Renamed";
      case "??":
        return "Untracked";
      default:
        return status;
    }
  };

  const stageableFiles = files.filter((f) => f.status.trim() !== "!!");

  return (
    <div className="flex flex-col h-full">
      {/* Header with bulk actions */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-white/90">
            Changed Files ({stageableFiles.length})
          </h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSelectAll}>
              Select All
            </Button>
            <Button size="sm" onClick={onSelectNone}>
              Select None
            </Button>
          </div>
        </div>
        <div className="text-sm text-white/60">
          {selectedFiles.length} of {stageableFiles.length} files selected
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {stageableFiles.map((file) => (
          <div
            key={file.path}
            className={`flex items-center p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer ${
              selectedFiles.includes(file.path) ? "bg-blue-500/10" : ""
            }`}
            onClick={() => onFileSelect(file.path)}
          >
            <div className="flex items-center mr-2">
              <Checkbox
                id={file.path}
                checked={selectedFiles.includes(file.path)}
                onCheckedChange={() => onFileToggle(file.path)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono px-1.5 py-0.5 rounded ${getStatusColor(file.status)}`}
                >
                  {file.status}
                </span>
                <span className="text-sm font-medium truncate text-white/90">
                  {file.path}
                </span>
              </div>
              <div className="text-xs text-white/60">
                {getStatusLabel(file.status)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DirtyRepoDialog({
  open,
  projectRoot,
  onResolve,
  onClose,
}: DirtyRepoDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Hooks
  const { data: gitStatus, refetch: refetchStatus } = useGitStatus(
    projectRoot,
    open
  );
  const { data: diffContent } = useGitDiffFile(
    projectRoot,
    currentFile || "",
    !!currentFile
  );

  const stageMutation = useGitStage();
  const commitMutation = useGitCommit();
  const stashMutation = useGitStash();
  const discardMutation = useGitDiscard();

  const files = useMemo(() => gitStatus || [], [gitStatus]);

  // Auto-resolve when repo becomes clean
  useEffect(() => {
    if (open && files.length === 0) {
      onResolve();
    }
  }, [open, files.length, onResolve]);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // File selection handlers
  const handleFileSelect = useCallback((filePath: string) => {
    setCurrentFile(filePath);
  }, []);

  const handleFileToggle = useCallback((filePath: string) => {
    setSelectedFiles((prev) =>
      prev.includes(filePath)
        ? prev.filter((f) => f !== filePath)
        : [...prev, filePath]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedFiles(files.map((f) => f.path));
  }, [files]);

  const handleSelectNone = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // Git operations
  const handleStageAndCommit = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      // Stage selected files
      const res: StageResult = await stageMutation.mutateAsync({
        projectRoot,
        files: selectedFiles,
      });
      setShowCommitInput(true);
      console.log("Staged", res.files.length);
    } catch (error) {
      console.error("Failed to stage files:", error);
    }
  }, [selectedFiles, projectRoot, stageMutation]);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;

    try {
      await commitMutation.mutateAsync({
        projectRoot,
        message: commitMessage.trim(),
      });

      // 1️⃣ Refresh status and inspect the result
      const refreshed = await refetchStatus();

      // 2️⃣ Reset local UI state
      setCommitMessage("");
      setShowCommitInput(false);
      setSelectedFiles([]);

      // 3️⃣ If repo is clean, resolve immediately
      if (refreshed.data?.length === 0) {
        onResolve(); // 🔑 closes modal + retries merge
        return;
      }
    } catch (error) {
      console.error("Failed to commit:", error);
    }
  }, [commitMessage, projectRoot, commitMutation, refetchStatus, onResolve]);

  const handleStashAndContinue = useCallback(async () => {
    try {
      await stashMutation.mutateAsync({ projectRoot });

      // Reset state and resolve
      setSelectedFiles([]);
      onResolve();
    } catch (error) {
      console.error("Failed to stash:", error);
    }
  }, [projectRoot, stashMutation, onResolve]);

  const handleDiscardChanges = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to discard changes in ${selectedFiles.length} file(s)? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await discardMutation.mutateAsync({ projectRoot, files: selectedFiles });

      // Reset state
      setSelectedFiles([]);

      // Refresh status
      await refetchStatus();
    } catch (error) {
      console.error("Failed to discard changes:", error);
    }
  }, [selectedFiles, projectRoot, discardMutation, refetchStatus]);

  const isLoading =
    stageMutation.isPending ||
    commitMutation.isPending ||
    stashMutation.isPending ||
    discardMutation.isPending;

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
            "w-[95vw] h-[90vh] max-w-none max-h-none"
          )}
        >
          {/* Mystical gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />

          {/* Header - Mystical and elegant */}
          <div className="shrink-0 border-b border-white/10 px-8 sm:px-10 pt-8 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/[0.05] backdrop-blur-sm flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-light text-white tracking-tight">
                    Repository Has Uncommitted Changes
                  </h2>
                  <div className="text-white/50 mt-1 text-sm font-light">
                    {projectRoot}
                  </div>
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

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left sidebar - File list */}
            <div className="w-1/3 border-r border-white/10">
              <GitFileList
                files={files}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onFileToggle={handleFileToggle}
                onSelectAll={handleSelectAll}
                onSelectNone={handleSelectNone}
              />
            </div>

            {/* Right pane - Diff viewer */}
            <div className="flex-1 flex flex-col">
              {currentFile ? (
                <>
                  <div className="p-4 border-b border-white/10">
                    <h4 className="font-medium text-white/90">{currentFile}</h4>
                    <div className="text-sm text-white/60">
                      {files.find((f) => f.path === currentFile)?.status} -
                      Click to view diff
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <DiffEditor
                      original=""
                      modified={diffContent || ""}
                      language="diff"
                      theme="vs-dark"
                      height="100%"
                      options={{
                        readOnly: true,
                        renderSideBySide: false,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/50">
                  <div className="text-center">
                    <div className="text-lg mb-2">
                      Select a file to view changes
                    </div>
                    <div className="text-sm">
                      Click on a file in the left panel to see its diff
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Commit message input */}
          {showCommitInput && (
            <div className="p-4 border-t border-white/10 bg-black/50">
              <div className="space-y-2">
                <Label htmlFor="commit-message">Commit Message</Label>
                <Textarea
                  id="commit-message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  rows={2}
                  autoFocus
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={handleCommit}
                  disabled={!commitMessage.trim() || isLoading}
                  variant="default"
                  size="sm"
                >
                  Commit
                </Button>
                <Button
                  onClick={() => {
                    setShowCommitInput(false);
                    setCommitMessage("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Footer - Clean action bar */}
          <div className="shrink-0 border-t border-white/10 bg-black/50 px-8 sm:px-10 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 flex gap-2">
                <Button
                  onClick={handleStageAndCommit}
                  disabled={selectedFiles.length === 0 || isLoading}
                  variant="default"
                >
                  Stage & Commit ({selectedFiles.length})
                </Button>

                <Button
                  onClick={handleStashAndContinue}
                  disabled={isLoading}
                  variant="outline"
                >
                  Stash & Continue
                </Button>

                <Button
                  onClick={handleDiscardChanges}
                  disabled={selectedFiles.length === 0 || isLoading}
                  variant="destructive"
                >
                  Discard Changes ({selectedFiles.length})
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => refetchStatus()}
                  disabled={isLoading}
                  size="sm"
                >
                  Refresh
                </Button>

                <Button onClick={handleClose} variant="secondary">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
