/**
 * Test component for the extension system
 * 
 * This component demonstrates how to use the extension system
 * with a simple editor instance.
 */

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

// Import the extension system
import { DecorationManager, ExtensionManager } from '../core';
import { ActiveLineExtension } from '../extensions/core';
import { UnifiedFormattingExtension } from '../extensions/formatting';

// Sample markdown content for testing
const sampleMarkdown = `# Extension System Test

This is a test of the **extension system** with *basic* formatting.

## Features

- **Bold** text
- *Italic* text
- ~~Strikethrough~~ text
- ==Highlighted== text
- \`Inline code\`;

## Code Block

\`\`\`javascript
// This is a code block
function test() {
  console.log('Hello, world!');
}
\`\`\`

## Table

| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

`;

/**
 * Test component for the extension system
 */
const ExtensionSystemTest: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  
  // Create decoration and extension managers
  const decorationManager = new DecorationManager();
  const extensionManager = new ExtensionManager(decorationManager);
  
  // Initialize extension manager
  const initializeExtensionManager = () => {
    // Register core extensions
    extensionManager.registerExtension(new ActiveLineExtension());
    extensionManager.registerExtension(new UnifiedFormattingExtension());
    
    // Log registered extensions
    console.log('Registered extensions:', extensionManager.getStats());
  };
  
  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) return;
    
    // Initialize extension manager
    initializeExtensionManager();
    
    try {
      // Create editor state
      const state = EditorState.create({
        doc: sampleMarkdown,
        extensions: [
          // Basic editor setup
          highlightActiveLine(),
          history(),
          EditorView.lineWrapping,
          
          // Keymaps
          keymap.of([...defaultKeymap, ...historyKeymap]),
          
          // Markdown support
          markdown({
            base: markdownLanguage,
            codeLanguages: languages,
            addKeymap: true,
            defaultCodeLanguage: markdownLanguage,
          }),
          
          // Add extensions from the extension manager
          ...extensionManager.createExtensions(),
          
          // Basic editor theme
          EditorView.theme({
            "&": {
              "& .cm-content": {
                fontFamily: "var(--font-text, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif)",
              }
            }
          }),
        ],
      });
      
      // Create editor view
      const view = new EditorView({
        state,
        parent: editorRef.current,
      });
      
      // Store the view
      editorViewRef.current = view;
      
      // Set the view in the managers
      decorationManager.setView(view);
      extensionManager.setView(view);
      
      // Add basic CSS
      const styleEl = document.createElement('style');
      styleEl.id = 'extension-system-test-styles';
      styleEl.textContent = `
        .extension-system-test {
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          overflow: hidden;
          height: 500px;
        }
        
        .extension-system-test .cm-editor {
          height: 100%;
          overflow-y: auto;
        }
        
        .extension-system-test .cm-content {
          padding: 10px;
        }
        
        /* Base formatting - hidden by default */
        .cm-formatting {
          display: none;
          color: var(--text-faint);
          opacity: 0.7;
        }
        
        /* Show on active line */
        .cm-line.cm-activeLine .cm-formatting {
          display: inline;
        }
        
        /* Bold styling */
        .cm-strong {
          font-weight: bold;
        }
        
        /* Italic styling */
        .cm-em {
          font-style: italic;
        }
        
        /* Strikethrough styling */
        .cm-strikethrough {
          text-decoration: line-through;
        }
        
        /* Inline code styling */
        .cm-inline-code {
          font-family: var(--font-monospace, monospace);
          background-color: var(--code-background, rgba(0, 0, 0, 0.1));
          padding: 0.1em 0.2em;
          border-radius: 0.2em;
          font-size: 0.9em;
        }
        
        /* Highlight styling */
        .cm-highlight {
          background-color: var(--text-highlight-bg, rgba(255, 255, 0, 0.3));
          color: var(--text-normal);
        }
      `;
      
      document.head.appendChild(styleEl);
      
      // Log success
      console.log('Editor initialized successfully');
      
      // Clean up
      return () => {
        if (editorViewRef.current) {
          editorViewRef.current.destroy();
          editorViewRef.current = null;
        }
        
        const styleEl = document.getElementById('extension-system-test-styles');
        if (styleEl) styleEl.remove();
      };
    } catch (error) {
      console.error('Error initializing editor:', error);
    }
  }, []);
  
  return (
    <div className="extension-system-test-container">
      <h2>Extension System Test</h2>
      <p>This is a test of the extension system with basic formatting.</p>
      <div className="extension-system-test" ref={editorRef} />
    </div>
  );
};

export default ExtensionSystemTest;