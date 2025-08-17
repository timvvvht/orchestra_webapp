/**
 * EditorAdapter - Allows switching between old and new editor implementations
 * This is a temporary component to facilitate migration
 */

import React, { useCallback } from 'react';
import CleanCodeMirrorEditor from './CleanCodeMirrorEditor';
import { TiptapEditor } from './TiptapEditor';
import type { ViewUpdate } from '@codemirror/view';

interface EditorAdapterProps {
  content: string;
  onChange: (value: string) => void;
  onSave?: () => Promise<boolean>;
  filePath?: string | null;
  isLoading?: boolean;
  useNewEditor?: boolean; // Feature flag to switch between editors
}

export const EditorAdapter: React.FC<EditorAdapterProps> = ({
  content,
  onChange,
  onSave,
  filePath,
  isLoading,
  useNewEditor = true, // Default to new Tiptap editor
}) => {
  // Adapter for new editor's onChange to match old editor's signature
  const handleNewEditorChange = useCallback((value: string, viewUpdate: ViewUpdate) => {
    onChange(value);
  }, [onChange]);

  // Adapter for new editor's save handling
  const handleNewEditorSave = useCallback(async () => {
    if (onSave) {
      await onSave();
    }
  }, [onSave]);

  // Switch between editors based on feature flag
  if (useNewEditor) {
    return (
      <TiptapEditor
        content={content}
        onChange={onChange}
        onSave={onSave || (() => Promise.resolve(true))}
        filePath={filePath || null}
        isLoading={isLoading || false}
      />
    );
  }

  // Fallback to old editor
  return (
    <CleanCodeMirrorEditor
      content={content}
      onChange={onChange}
      onSave={onSave || (() => Promise.resolve(true))}
      filePath={filePath || null}
      isLoading={isLoading || false}
    />
  );
};

export default EditorAdapter;