/**
 * Simplified CodeMirror Editor based on ink-mde's approach
 * Much cleaner and easier to maintain
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { createInitialExtensions, toggleFeature } from './extensions/simplified-extension-system';

interface SimplifiedEditorProps {
  value: string;
  onChange?: (value: string) => void;
  options?: {
    theme?: 'light' | 'dark';
    vim?: boolean;
    lineWrapping?: boolean;
    spellcheck?: boolean;
    codeBlocks?: boolean;
    inlineCode?: boolean;
    taskLists?: boolean;
    tables?: boolean;
    mermaid?: boolean;
  };
}

export const SimplifiedEditor: React.FC<SimplifiedEditorProps> = ({
  value,
  onChange,
  options = {}
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  
  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;
    
    const initEditor = async () => {
      // Create extensions
      const dynamicExtensions = await createInitialExtensions(options);
      
      // Create state with all extensions
      const state = EditorState.create({
        doc: value,
        extensions: [
          // Core extensions
          keymap.of([...defaultKeymap, ...historyKeymap]),
          history(),
          markdown(),
          
          // Theme
          options.theme === 'dark' ? oneDark : [],
          
          // Dynamic extensions from compartments
          ...dynamicExtensions,
          
          // Change listener
          EditorView.updateListener.of((update) => {
            if (update.docChanged && onChange) {
              onChange(update.state.doc.toString());
            }
          }),
        ],
      });
      
      // Create view
      const view = new EditorView({
        state,
        parent: editorRef.current,
      });
      
      viewRef.current = view;
    };
    
    initEditor();
    
    // Cleanup
    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []); // Only run once on mount
  
  // Handle option changes
  useEffect(() => {
    if (!viewRef.current) return;
    
    // Toggle features based on options
    const updateFeatures = async () => {
      const view = viewRef.current!;
      
      // Toggle each feature
      for (const [feature, enabled] of Object.entries(options)) {
        if (feature === 'theme') continue; // Handle theme separately
        
        await toggleFeature(
          view, 
          feature as keyof typeof import('./extensions/simplified-extension-system').compartments,
          enabled as boolean
        );
      }
    };
    
    updateFeatures();
  }, [options]);
  
  // Handle value changes from outside
  useEffect(() => {
    if (!viewRef.current) return;
    
    const currentValue = viewRef.current.state.doc.toString();
    if (value !== currentValue) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);
  
  return <div ref={editorRef} className="simplified-editor" />;
};