/**
 * Helix-themed CodeMirror Editor
 * A separate component that uses the Helix theme instead of Tokyo Night
 */

import React from 'react';
import CleanCodeMirrorEditor from './index';

// Import Helix styles
import './styles/helix-markdown.css';
import './styles/helix-markdown-override.css';

interface HelixEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  isDarkMode?: boolean;
  readOnly?: boolean;
}

export function HelixEditor({ value, onChange, className, isDarkMode = false, readOnly = false }: HelixEditorProps) {
  return (
    <div className={`helix-editor-wrapper ${isDarkMode ? 'helix-markdown theme-dark' : 'helix-markdown'}`}>
      <style>{`
        /* Override Tokyo Night with Helix for this component only */
        .helix-editor-wrapper .codemirror-editor-container {
          /* Remove Tokyo Night classes */
        }
        
        .helix-editor-wrapper .cm-editor {
          /* Ensure Helix theme takes precedence */
        }
      `}</style>
      <CleanCodeMirrorEditor
        value={value}
        onChange={onChange}
        className={className}
        readOnly={readOnly}
      />
    </div>
  );
}

export default HelixEditor;