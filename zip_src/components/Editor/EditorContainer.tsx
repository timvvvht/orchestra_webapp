import React, { useState, useEffect, useCallback } from 'react';
import EditorAdapter from './EditorAdapter';
import { getFileContent, saveFileContent } from '../../utils/api';
import { perfTracker } from '../../utils/optimizedApi';

interface EditorContainerProps {
  filePath?: string;
}

const EditorContainer: React.FC<EditorContainerProps> = ({ filePath }) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);

  // Load file content when filePath changes
  useEffect(() => {
    if (!filePath) {
      setContent('');
      setUnsavedChanges(false);
      return;
    }

    const loadContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        perfTracker.start('loadFile');
        const fileContent = await getFileContent(filePath);
        setContent(fileContent);
        setUnsavedChanges(false);
        perfTracker.end('loadFile', `Loaded ${filePath}`);
      } catch (err) {
        setError(`Failed to load file: ${err instanceof Error ? err.message : String(err)}`);
        console.error('Error loading file:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [filePath]);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setUnsavedChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!filePath || !unsavedChanges) return false;

    try {
      perfTracker.start('saveFile');
      await saveFileContent(filePath, content);
      setUnsavedChanges(false);
      perfTracker.end('saveFile', `Saved ${filePath}`);
      return true;
    } catch (err) {
      setError(`Failed to save file: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error saving file:', err);
      return false;
    }
  }, [filePath, content, unsavedChanges]);

  // Add keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    );
  }

  if (!filePath) {
    return (
      <div className="empty-state">
        <p>No file selected. Please select a file to edit.</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      {unsavedChanges && (
        <div className="unsaved-indicator" title="Unsaved changes">
          *
        </div>
      )}
      <EditorAdapter
        content={content}
        filePath={filePath}
        isLoading={isLoading}
        onChange={handleContentChange}
        onSave={handleSave}
        useNewEditor={true}
      />
    </div>
  );
};

export default EditorContainer;