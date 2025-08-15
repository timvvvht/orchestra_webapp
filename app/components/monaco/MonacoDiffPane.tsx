// src/components/MonacoDiffPane.tsx
import React, { memo, useCallback } from "react";
import { DiffEditor } from "@monaco-editor/react";

/** Pure wrapper around DiffEditor enforcing side-by-side view */
export interface MonacoDiffPaneProps {
  original: string;
  modified: string;
  language: string;
  height?: string | number;
  width?: string | number;
  onChange?: (value: string) => void; // modified side only
}

const BASE_OPTIONS = {
  renderSideBySide: true,
  diffWordWrap: "on" as const,
  ignoreTrimWhitespace: true,
  showMoves: true,
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  fontSize: 14,
  glyphMargin: true,
  folding: true,
  lineNumbers: "on" as const,
  enableSplitViewResizing: true,
  originalEditable: false,
  modifiedEditable: true,
} as const;

export const MonacoDiffPane: React.FC<MonacoDiffPaneProps> = memo(
  ({
    original,
    modified,
    language,
    height = "100%",
    width = "100%",
    onChange,
  }) => {
    const handleChange = useCallback(
      (_: string | undefined, value: string | undefined) => {
        if (value !== undefined) onChange?.(value);
      },
      [onChange]
    );

    return (
      <DiffEditor
        original={original}
        modified={modified}
        language={language}
        theme="vs-dark"
        height={height}
        width={width}
        options={BASE_OPTIONS}
        onChange={handleChange}
      />
    );
  }
);
MonacoDiffPane.displayName = "MonacoDiffPane";
export default MonacoDiffPane;
