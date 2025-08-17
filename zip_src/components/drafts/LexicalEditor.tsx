/**
 * Base Lexical Editor Component
 * 
 * Provides the foundation for rich text editing with Lexical.
 * This is the core editor that will be extended with file pill functionality.
 */

import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $getRoot, $getSelection, EditorState, LexicalEditor } from 'lexical';
import { cn } from '@/lib/utils';

interface LexicalEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Initial editor configuration
const initialConfig = {
  namespace: 'DraftEditor',
  theme: {
    root: 'p-3 border rounded-md min-h-[100px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
    paragraph: 'mb-1',
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
  onError: (error: Error) => {
    console.error('Lexical Editor Error:', error);
  },
  nodes: [], // Will be extended with custom nodes
};

export const LexicalEditor: React.FC<LexicalEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  className,
  disabled = false,
}) => {
  // Handle editor state changes
  const handleEditorChange = (editorState: EditorState, editor: LexicalEditor) => {
    if (onChange) {
      editorState.read(() => {
        const root = $getRoot();
        const textContent = root.getTextContent();
        onChange(textContent);
      });
    }
  };

  return (
    <div className={cn('relative', className)}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  'outline-none resize-none overflow-hidden',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{ minHeight: '100px' }}
                disabled={disabled}
              />
            }
            placeholder={
              <div className="absolute top-3 left-3 text-gray-400 pointer-events-none select-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
        </div>
      </LexicalComposer>
    </div>
  );
};

export default LexicalEditor;