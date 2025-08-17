import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { searchKeymap } from '@codemirror/search';
import './styles.css';

interface CodeMirrorEditorProps {
  content: string;
  filePath: string | null;
  isLoading: boolean;
  onChange: (content: string) => void;
  onSave: () => Promise<boolean>;
}

/**
 * Simple CodeMirror 6 editor component for Markdown editing
 */
const SimpleCodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  content,
  filePath,
  isLoading,
  onChange,
  onSave,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);

  // Helper function to count words in text
  const countWords = (text: string): number => {
    if (!text || text.trim() === '') return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  // Create editor extensions
  const createExtensions = useCallback((): Extension[] => {
    return [
      // Basic editor setup
      highlightActiveLine(),
      history(),
      
      // Enable line wrapping for the entire editor
      EditorView.lineWrapping,

      // Keymaps
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        // Custom save command
        {
          key: 'Mod-s',
          run: () => {
            onSave();
            return true;
          },
        },
      ]),
      
      // Markdown support with enhanced language support
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        addKeymap: true,
      }),
      
      // Basic editor theme
      EditorView.theme({
        "&": {
          "& .cm-content": {
            fontFamily: "var(--font-text, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif)",
          }
        }
      }),

      // Update callback for content changes
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const doc = update.state.doc;
          const content = doc.toString();
          onChange(content);
          setWordCount(countWords(content));
        }
      }),
    ];
  }, [onSave, onChange]);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) return;

    const initialDoc = content || '';
    const state = EditorState.create({
      doc: initialDoc,
      extensions: createExtensions(),
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;
    setWordCount(countWords(initialDoc));

    return () => {
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }
    };
  }, [content, createExtensions]);

  // Handle content updates
  useEffect(() => {
    if (!content || !editorViewRef.current) return;
    const view = editorViewRef.current;
    const currentContent = view.state.doc.toString();

    if (content !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
      setWordCount(countWords(content));
    }
  }, [content]);

  return (
    <div className="codemirror-editor-container markdown-editor">
      <div className="editor-content-wrapper">
        <div className="editor-content">
          <div ref={editorRef} className="codemirror-wrapper" />
        </div>
      </div>
      <div className="editor-footer">
        <div className="word-count">{wordCount} words</div>
        <div className="file-path">{filePath || ''}</div>
      </div>
    </div>
  );
};

export default SimpleCodeMirrorEditor;