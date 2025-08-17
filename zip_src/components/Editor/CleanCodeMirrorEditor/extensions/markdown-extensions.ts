import { Extension } from '@codemirror/state';
import { ViewPlugin, DecorationSet, Decoration, EditorView, WidgetType, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
// import { createHeaderStylingExtension } from './header-styling';
// import { createFormattingCharactersExtension } from './formatting-characters';
// import { createBoldStylingExtension } from './bold-styling';
import { createEnhancedCodeFenceExtension } from './enhanced-code-fence';
import { createTableOfContentsExtension } from './table-of-contents';
import { createCalloutStylingExtension } from './callout-styling';
import { createWikiLinkStylingExtension } from './wiki-link-styling';

/**
 * Creates a set of extensions for enhanced Markdown editing
 * 
 * NOTE: Some of these extensions have been replaced by the new modular formatting system
 * in the formatting/ directory. In the future, this file should be refactored to use
 * the new system directly instead of the older individual extensions.
 */
export function createMarkdownExtensions(): Extension[] {
  return [
    // Live preview features
    livePreviewPlugin(),
    
    // Enhanced code fence detection and styling
    // ...createEnhancedCodeFenceExtension(),
    
    // Header styling (hide # on non-active lines and apply hierarchical styling)
    // ...createHeaderStylingExtension(),
    
    // Table of contents support
    ...createTableOfContentsExtension(),
    
    // Bold styling (specifically for ** and __)
    // ...createBoldStylingExtension(),
    
    // Formatting characters styling (hide **, _, etc. on non-active lines)
    // ...createFormattingCharactersExtension(),
    
    // Callout styling (for > [!NOTE] style callouts)
    ...createCalloutStylingExtension(),
    
    // Wiki link styling (for [[Page]] and [[Page|Display Text]] links)
    ...createWikiLinkStylingExtension(),
  ];
}

// Old code block styling implementation has been moved to code-block-styling.ts

/**
 * Simplified live preview features using CSS instead of decorations
 */
function livePreviewPlugin() {
  // Instead of using decorations which can cause sorting issues,
  // we'll use a theme extension to style elements directly with CSS
  return [
    EditorView.baseTheme({
      // Wiki link styling
      '.cm-line .cm-wikilink': {
        color: 'var(--interactive-accent)',
        textDecoration: 'underline',
        cursor: 'pointer',
      },
      
      // Task list styling
      '.cm-line .cm-task': {
        color: 'var(--text-muted)',
      },
      '.cm-line .cm-task.cm-task-checked': {
        color: 'var(--color-green)',
        textDecoration: 'line-through',
      },
    }),
    
    // Add a simple plugin to detect markdown features and add a class to the editor
    ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          this.detectMarkdownFeatures(view);
        }
        
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.detectMarkdownFeatures(update.view);
          }
        }
        
        detectMarkdownFeatures(view: EditorView) {
          // Simply check if there are any special markdown features in the document
          const { state } = view;
          const { from, to } = view.viewport;
          
          let hasCallouts = false;
          let hasWikiLinks = false;
          let hasTasks = false;
          let hasBlockquotes = false;
          let pos = from;
          
          while (pos <= to) {
            const line = state.doc.lineAt(pos);
            const lineText = line.text;
            
            // Check for callouts (now handled by callout-styling.ts)
            if (/^\s*>\s*\[!(\w+)\]/.test(lineText)) {
              hasCallouts = true;
            }
            
            // Check for regular blockquotes (not callouts)
            if (/^\s*>\s*(?!\[!)/.test(lineText)) {
              hasBlockquotes = true;
            }
            
            // Check for wiki links
            if (/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.test(lineText)) {
              hasWikiLinks = true;
            }
            
            // Check for tasks
            if (/^\s*[-*+]\s*\[[ xX]\]/.test(lineText)) {
              hasTasks = true;
            }
            
            // If we found all features, we can stop searching
            if (hasCallouts && hasWikiLinks && hasTasks && hasBlockquotes) {
              break;
            }
            
            pos = line.to + 1;
          }
          
          // Add or remove classes on the editor element
          const editorElement = view.dom;
          editorElement.classList.toggle('has-callouts', hasCallouts);
          editorElement.classList.toggle('has-blockquotes', hasBlockquotes);
          editorElement.classList.toggle('has-wikilinks', hasWikiLinks);
          editorElement.classList.toggle('has-tasks', hasTasks);
        }
      }
    )
  ];
}