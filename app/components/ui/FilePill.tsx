/**
 * FilePill Component
 *
 * The visual representation of a file reference pill within the Lexical editor.
 * Displays the filename with delete functionality and hover states.
 */

import React, { useState } from "react";
import { X, FileText } from "lucide-react";
import { cn } from "cn-utility";

interface FilePillProps {
  fileName: string;
  filePath: string;
  onDelete: () => void;
  className?: string;
}

export const FilePill: React.FC<FilePillProps> = ({
  fileName,
  filePath,
  onDelete,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onDelete();
    }
  };

  return (
    <span
      className={cn("pill-orchestra", className)}
      contentEditable={false}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      title={filePath}
      data-file-pill="true"
      data-file-name={fileName}
      data-file-path={filePath}
    >
      <FileText className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{fileName}</span>
      {isHovered && (
        <button
          onClick={handleDelete}
          className="pill-delete-btn"
          tabIndex={-1}
          aria-label={`Remove ${fileName}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
