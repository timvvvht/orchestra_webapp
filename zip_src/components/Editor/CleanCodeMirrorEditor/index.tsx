import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState, Extension, StateEffect, EditorSelection } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLine } from '@codemirror/view';
import { insertTableOfContents } from './extensions/table-of-contents';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxTree } from '@codemirror/language';
// import { foldGutter, foldKeymap } from '@codemirror/language'; - removed to eliminate left border
import { searchKeymap } from '@codemirror/search';
// createAppTheme import fully removed
import { useTheme } from '@/components/theme/theme-provider';
import { createTokyoNightTheme } from './utils/tokyo-night-theme-css-vars';
// Removed helix theme - Orchestra theme only
import { createEnhancedTableExtension } from './extensions/enhanced-table';
import { createInteractiveTableExtension, insertTable } from './extensions/interactive-table';
import { createMermaidDiagramExtension } from './extensions/mermaid-diagram';
import { createMarkdownExtensions } from './extensions/markdown-extensions';
import { createCodeBlockWithCopyExtension } from './extensions/code-block-with-copy';
import { createInlineCodeStylingExtension } from './extensions/inline-code-styling';
import { createTaskListStylingExtension } from './extensions/task-list-styling';
import { wikiLinkHandler } from './wiki-link-handler';
import debugCodeBlock from './extensions/debug-code-block';
// Legacy CSS imports removed - migrating to Tiptap with fresh theming

// Import the extension system
import { DecorationManager, ExtensionManager } from './core';
import { ActiveLineExtension } from './extensions/core';
import { createFormattingExtension } from './extensions/formatting'; // Import the formatting CSS
import { listNestingPlugin } from './extensions/list-nesting-plugin';
import { mermaidInspector } from './utils/mermaid-inspector';

interface CodeMirrorEditorProps {
  content: string;
  filePath: string | null;
  isLoading: boolean;
  onChange: (content: string) => void;
  onSave: () => Promise<boolean>;
}

/**
 * Clean, performant CodeMirror 6 editor component for Markdown editing
 * with Obsidian-like live preview features.
 */
const CleanCodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  content,
  filePath,
  isLoading,
  onChange,
  onSave,
}) => {
  console.log('CleanCodeMirrorEditor rendering with props:', {
    content: typeof content === 'string' ? `string[${content.length}]` : typeof content,
    filePath,
    isLoading
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  // Line removed due to duplication
  const { theme: currentAppTheme } = useTheme();
  const isDarkMode = currentAppTheme.includes('dark');

  // Helper function to count words in text
  const countWords = (text: string): number => {
    if (!text || text.trim() === '') return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  // Create decoration and extension managers
  const decorationManagerRef = useRef<DecorationManager>(new DecorationManager());
  const extensionManagerRef = useRef<ExtensionManager>(new ExtensionManager(decorationManagerRef.current));

  // Initialize extension manager with core extensions
  const initializeExtensionManager = useCallback(() => {
    const manager = extensionManagerRef.current;
    console.log('[Editor] Initializing extension manager');

    // Register core extensions
    console.log('[Editor] Registering ActiveLineExtension');
    manager.registerExtension(new ActiveLineExtension());

    // We no longer need to register the UnifiedFormattingExtension here
    // as we'll use the createFormattingExtension function directly in createExtensions
    console.log('[Editor] Using new modular formatting extensions');

    // Log registered extensions
    console.log('[Editor] Registered extensions:', manager.getStats());

    // If we already have a view, set it for all extensions
    if (editorViewRef.current) {
      console.log('[Editor] Setting view for extensions after initialization');
      manager.setView(editorViewRef.current);
    }
  }, []);

  // Create editor extensions - memoized to prevent unnecessary recreation
  const createExtensions = useCallback((): Extension[] => {
    // Make sure content is a string
    if (typeof content !== 'string') {
      console.error('Invalid content type provided to CleanCodeMirrorEditor:', content);
      return [];
    }

    // Initialize extension manager if needed
    if (extensionManagerRef.current.getAllExtensions().length === 0) {
      initializeExtensionManager();
    }

    return [
      // Basic editor setup
      // lineNumbers() - removed as requested
      // foldGutter() - removed to eliminate left border
      highlightActiveLine(),
      history(),

      // Enable line wrapping for the entire editor
      EditorView.lineWrapping,

      // Apply Tokyo Night theme (always dark mode)
      // Removed createTokyoNightTheme extension call

      // Keymaps - with our global shortcuts taking precedence
      keymap.of([
        // Our global shortcuts MUST come first to override defaults
        // Override the default Mod-/ (comment toggle) with our theme toggle
        {
          key: 'Mod-/',
          run: () => {
            // Stop propagation and prevent default
            console.log('Intercepted Mod-/ in CodeMirror, preventing default behavior');
            // Return true to indicate we handled it
            return true;
          },
          preventDefault: true
        },
        // Other global shortcuts
        {
          key: 'Mod-,',
          run: () => {
            console.log('Intercepted Mod-, in CodeMirror, preventing default behavior');
            return true;
          },
          preventDefault: true
        },
        {
          key: 'Shift-?',
          run: () => {
            console.log('Intercepted Shift-? in CodeMirror, preventing default behavior');
            return true;
          },
          preventDefault: true
        },
        // Then include the default keymaps
        ...defaultKeymap.filter(k => k.key !== 'Mod-/'), // Remove the default comment toggle
        ...historyKeymap,
        // ...foldKeymap, - removed since fold gutter is disabled
        ...searchKeymap,
        // Custom save command
        {
          key: 'Mod-s',
          run: () => {
            onSave();
            return true;
          },
        },
        // Insert table of contents command
        {
          key: 'Alt-t',
          run: insertTableOfContents
        },
      ]),

      // Add a context menu item for inserting table of contents
      EditorView.domEventHandlers({
        contextmenu: (event, view) => {
          // Prevent default context menu
          event.preventDefault();

          // Create custom context menu
          const menu = document.createElement('div');
          menu.className = 'cm-context-menu';
          menu.style.position = 'absolute';
          menu.style.left = `${event.clientX}px`;
          menu.style.top = `${event.clientY}px`;
          menu.style.backgroundColor = 'var(--background-primary)';
          menu.style.border = '1px solid var(--background-modifier-border)';
          menu.style.borderRadius = '4px';
          menu.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
          menu.style.zIndex = '1000';
          menu.style.padding = '4px 0';

          // Add menu items
          // Table of Contents item
          const tocItem = document.createElement('div');
          tocItem.className = 'cm-context-menu-item';
          tocItem.textContent = 'Insert Table of Contents';
          tocItem.style.padding = '6px 12px';
          tocItem.style.cursor = 'pointer';
          tocItem.style.fontSize = '14px';
          // --- keep code-block extension LAST so its line decoration wins ---
          tocItem.style.color = 'var(--text-normal)';

          tocItem.addEventListener('mouseover', () => {
            tocItem.style.backgroundColor = 'var(--background-modifier-hover)';
          });

          tocItem.addEventListener('mouseout', () => {
            tocItem.style.backgroundColor = 'transparent';
          });

          tocItem.addEventListener('click', () => {
            // Remove menu
            document.body.removeChild(menu);
            // Insert TOC
            insertTableOfContents(view);
          });

          menu.appendChild(tocItem);

          // Insert Table item
          const tableItem = document.createElement('div');
          tableItem.className = 'cm-context-menu-item';
          tableItem.textContent = 'Insert Table';
          tableItem.style.padding = '6px 12px';
          tableItem.style.cursor = 'pointer';
          tableItem.style.fontSize = '14px';
          tableItem.style.color = 'var(--text-normal)';

          tableItem.addEventListener('mouseover', () => {
            tableItem.style.backgroundColor = 'var(--background-modifier-hover)';
          });

          tableItem.addEventListener('mouseout', () => {
            tableItem.style.backgroundColor = 'transparent';
          });

          tableItem.addEventListener('click', () => {
            // Remove menu
            document.body.removeChild(menu);
            // Insert a 3x3 table
            insertTable(view, 3, 3);
          });

          menu.appendChild(tableItem);

          // Insert Mermaid Diagram item
          const mermaidItem = document.createElement('div');
          mermaidItem.className = 'cm-context-menu-item';
          mermaidItem.textContent = 'Insert Mermaid Diagram';
          mermaidItem.style.padding = '6px 12px';
          mermaidItem.style.cursor = 'pointer';
          mermaidItem.style.fontSize = '14px';
          mermaidItem.style.color = 'var(--text-normal)';

          mermaidItem.addEventListener('mouseover', () => {
            mermaidItem.style.backgroundColor = 'var(--background-modifier-hover)';
          });

          mermaidItem.addEventListener('mouseout', () => {
            mermaidItem.style.backgroundColor = 'transparent';
          });

          mermaidItem.addEventListener('click', () => {
            // Remove menu
            document.body.removeChild(menu);
            // Insert a sample Mermaid diagram
            const sampleDiagram = '```mermaid\nflowchart TD\n    A[Start] --> B{Is it?}\n    B -->|Yes| C[OK]\n    C --> D[Rethink]\n    D --> B\n    B ---->|No| E[End]\n```';
            view.dispatch({
              changes: { from: view.state.selection.main.from, insert: sampleDiagram }
            });
          });

          menu.appendChild(mermaidItem);

          // Add menu to document
          document.body.appendChild(menu);

          // Close menu when clicking outside
          const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
              document.body.removeChild(menu);
              document.removeEventListener('click', closeMenu);
            }
          };

          // Add a small delay to prevent immediate closing
          setTimeout(() => {
            document.addEventListener('click', closeMenu);
          }, 100);

          return true;
        }
      }),

      // Markdown support with enhanced language support
      markdown({
        base: markdownLanguage, // markdownLanguage already includes GFM tables
        // Use the languages array from @codemirror/language-data which is properly formatted
        codeLanguages: languages,
        addKeymap: true,
        defaultCodeLanguage: markdownLanguage,
        // No extensions needed - markdownLanguage includes GFM by default
      }),

      // Apply Tokyo Night theme with syntax highlighting - MUST come after markdown extension
      ...createTokyoNightTheme(isDarkMode),

      // // Instead of trying to add language extensions directly,
      // // we rely on the codeLanguages provided to markdown extension
      // // Which handles loading the languages properly when needed

      // Debug extension to inspect syntax tree for table nodes
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const doc = update.state.doc.toString();
          
          // Check for code blocks with language markers
          const codeBlockRegex = /^```([a-zA-Z0-9_+#-]+)\s*$/gm;
          let match;
          while ((match = codeBlockRegex.exec(doc)) !== null) {
            const lang = match[1];
            if (lang) {
              console.log(`[CodeMirror] Detected code block with language: '${lang}'`);
            }
          }
          
          // Check for table syntax in the document
          if (doc.includes('|')) {
            console.log('[TableDebug] Document contains pipe characters, checking syntax tree...');
            const tree = syntaxTree(update.state);
            console.log('[TableDebug] Full syntax tree:', tree.toString());
            
            // Look for table-related nodes
            let foundTableNodes = false;
            tree.iterate({
              enter: (node) => {
                if (node.name.toLowerCase().includes('table') || 
                    node.name === 'Table' || 
                    node.name === 'TableRow' || 
                    node.name === 'TableCell' ||
                    node.name === 'TableHeader' ||
                    node.name === 'TableDelimiter') {
                  console.log(`[TableDebug] Found ${node.name} node at [${node.from}, ${node.to}]`);
                  const nodeText = doc.slice(node.from, node.to);
                  console.log(`[TableDebug] Node content: "${nodeText}"`);
                  foundTableNodes = true;
                }
              }
            });
            
            if (!foundTableNodes) {
              console.log('[TableDebug] No table nodes found in syntax tree');
              // Log all node types to see what's being parsed
              const nodeTypes = new Set();
              tree.iterate({
                enter: (node) => {
                  nodeTypes.add(node.name);
                }
              });
              console.log('[TableDebug] All node types in document:', Array.from(nodeTypes).sort());
            }
          }
        }
      }),

      // Orchestra theme dominates - majestic and vibey!
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

          // Notify parent component of the change
          // No need for internal update flag - content comparison in useEffect
          // will prevent circular updates naturally
          onChange(content);
          setWordCount(countWords(content));
        }
      }),

      // Code block styling extension with copy button - handles background color and copy functionality

      // Mermaid diagram rendering support - MUST come before code fence extension
      ...createMermaidDiagramExtension(),

      // Enhanced code fence extension for better code block handling
      // This extension handles hiding the code fence markers (```) and language hint
      // ...createEnhancedCodeFenceExtension(), // Disabled to avoid conflicts with code-block-styling

      // Enhanced table extension for better table rendering - TEMPORARILY DISABLED FOR DEBUGGING
      // ...createEnhancedTableExtension(),

      // Interactive table extension for keyboard navigation and editing
      ...createInteractiveTableExtension(),

      // Inline code styling with proper background
      ...createInlineCodeStylingExtension(),

      // Task list styling with custom checkboxes
      ...createTaskListStylingExtension(),

      // All markdown extensions
      ...createMarkdownExtensions(),

      // Add the new formatting extension
      ...createFormattingExtension({
        renderHeadings: true,
        renderEmphasis: true,
        renderCode: true,
        renderLinks: true,
        renderLists: false  // Temporarily disable list rendering to see if it's hiding bullets
      }),

      // // Add extensions from the extension manager
      ...extensionManagerRef.current.createExtensions(),
      ...createCodeBlockWithCopyExtension(),
      listNestingPlugin(),

      // Debug plugin (development only)
      ...debugCodeBlock(),

    ];
  }, [initializeExtensionManager, currentAppTheme]);

  // Set up wiki link click handler
  const handleWikiLinkClick = (e: Event) => {
    const customEvent = e as CustomEvent;
    const target = customEvent.detail?.target;
    if (target) {
      console.log('[Editor] Wiki link clicked:', target);
      wikiLinkHandler.navigateToLink(target);
    }
  };
  // Initialize editor - only once on mount
  useEffect(() => {
    console.log('Editor initialization effect running', {
      hasEditorRef: !!editorRef.current,
      hasEditorViewRef: !!editorViewRef.current,
    });

    if (!editorRef.current) {
      console.warn('Editor ref is not available yet, skipping initialization');
      return;
    }

    if (editorViewRef.current) {
      console.log('Editor view already exists, skipping initialization');
      return;
    }

    // Ensure content is a string
    const initialDoc = typeof content === 'string' ? content : '';
    console.log('Initializing editor with content:', initialDoc.substring(0, 100) + '...');

    try {
      const state = EditorState.create({
        doc: initialDoc,
        extensions: createExtensions(),
      });

      const view = new EditorView({
        state,
        parent: editorRef.current,
      });

      editorViewRef.current = view;

      // Set the view in the Mermaid inspector
      mermaidInspector.setView(view);

      // Set the view in the decoration manager and extension manager
      console.log('[Editor] Setting view in decoration manager and extension manager');
      decorationManagerRef.current.setView(view);
      extensionManagerRef.current.setView(view);

      // Log the current state of the decoration manager and extensions
      console.log('[Editor] Decoration manager stats after view set:', decorationManagerRef.current.getStats());
      console.log('[Editor] Extension manager stats after view set:', extensionManagerRef.current.getStats());

      setWordCount(countWords(initialDoc));


      // Set up wiki link click handler
      const handleWikiLinkClick = (e: Event) => {
        const customEvent = e as CustomEvent;
        const target = customEvent.detail?.target;
        if (target) {
          console.log('[Editor] Wiki link clicked:', target);
          wikiLinkHandler.navigateToLink(target);
        }
      };

      // Add event listener for wiki link clicks
      document.addEventListener('wiki-link-click', handleWikiLinkClick);

      // Register navigation handler
      wikiLinkHandler.onNavigate((path) => {
        console.log('[Editor] Navigating to:', path);
        // Here you would typically open the file or navigate to it
        // This could be handled by a callback passed to the editor component
      });

      // Add a DOM observer to check CSS rules
      setTimeout(() => {
        console.log('[Editor] Checking CSS rules for formatting characters');
        // Check if the CSS rules for hiding/showing formatting characters are working
        const formattingElements = document.querySelectorAll('.cm-formatting');
        const activeLineFormattingElements = document.querySelectorAll('.cm-line.cm-activeLine .cm-formatting');
        const headerElements = document.querySelectorAll('.cm-header');
        const codeBlockElements = document.querySelectorAll('.cm-code-block-start, .cm-code-block-content, .cm-code-block-end');

        console.log('[Editor] CSS check:', {
          totalFormattingElements: formattingElements.length,
          activeLineFormattingElements: activeLineFormattingElements.length,
          headerElements: headerElements.length,
          codeBlockElements: codeBlockElements.length,
          cssRules: Array.from(document.styleSheets)
            .flatMap(sheet => {
              try {
                return Array.from(sheet.cssRules);
              } catch (e) {
                return [];
              }
            })
            .filter(rule => rule.cssText.includes('.cm-formatting') ||
              rule.cssText.includes('.cm-header') ||
              rule.cssText.includes('.cm-code-block'))
            .map(rule => rule.cssText)
        });

        // Check computed styles
        if (formattingElements.length > 0) {
          const inactiveFormatting = Array.from(formattingElements)
            .filter(el => !el.closest('.cm-line.cm-activeLine'));

          if (inactiveFormatting.length > 0) {
            const sample = inactiveFormatting[0];
            const style = window.getComputedStyle(sample);
            console.log('[Editor] Inactive formatting element style:', {
              element: sample.outerHTML,
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity
            });
          }

          if (activeLineFormattingElements.length > 0) {
            const sample = activeLineFormattingElements[0];
            const style = window.getComputedStyle(sample);
            console.log('[Editor] Active line formatting element style:', {
              element: sample.outerHTML,
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity
            });
          }
        }

        // Check header elements
        if (headerElements.length > 0) {
          const sample = headerElements[0];
          console.log('[Editor] Header element:', {
            element: sample.outerHTML,
            class: sample.className,
            style: window.getComputedStyle(sample)
          });
        } else {
          console.warn('[Editor] No header elements found');
        }

        // Check code block elements
        if (codeBlockElements.length > 0) {
          const sample = codeBlockElements[0];
          console.log('[Editor] Code block element:', {
            element: sample.outerHTML,
            class: sample.className,
            style: window.getComputedStyle(sample)
          });
        } else {
          console.warn('[Editor] No code block elements found');
        }

        // Log decoration statistics
        console.log('[Editor] Decoration statistics:', decorationManagerRef.current.getStats());
      }, 500);

      return () => {
        // Clean up event listeners
        document.removeEventListener('wiki-link-click', handleWikiLinkClick);

        if (editorViewRef.current) {
          editorViewRef.current.destroy();
          editorViewRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error creating editor:', error);
    }
  }, [createExtensions]);

  // Handle filePath updates separately
  useEffect(() => {
    console.log('FilePath update effect running', {
      hasEditorViewRef: !!editorViewRef.current,
      filePath
    });

    // Update the current file path in the wiki link handler when it changes
    if (filePath) {
      wikiLinkHandler.setCurrentFilePath(filePath);
    }
  }, [filePath]);

  // Handle content updates from external sources
  useEffect(() => {
    console.log('Content update effect running', {
      hasEditorViewRef: !!editorViewRef.current,
      contentType: typeof content,
      contentLength: typeof content === 'string' ? content.length : 'N/A'
    });

    if (!editorViewRef.current) {
      console.warn('Editor view is not available yet, skipping content update');
      return;
    }

    if (typeof content !== 'string') {
      console.error('Invalid content type in update effect:', content);
      return;
    }

    try {
      const view = editorViewRef.current;
      const currentContent = view.state.doc.toString();

      // Only update if content is different from current editor content
      // This naturally prevents circular updates without needing a flag
      if (content !== currentContent) {
        console.log('Updating editor content from external source');

        // Save the current selection
        const { ranges } = view.state.selection;
        const selectionRanges = ranges.map(range => ({
          anchor: range.anchor,
          head: range.head
        }));

        // Prepare new selection ranges, ensuring they're within bounds
        const newRanges = selectionRanges.map(range => {
          const anchor = Math.min(range.anchor, content.length);
          const head = Math.min(range.head, content.length);
          return EditorSelection.range(anchor, head);
        });

        // Update content and restore selection in a single transaction
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
          selection: EditorSelection.create(newRanges)
        });

        setWordCount(countWords(content));
      }
    } catch (error) {
      console.error('Error updating editor content:', error);
    }
  }, [content]);

  // Update theme when it changes - but preserve cursor position
  useEffect(() => {
    console.log('Theme update effect running', {
      hasEditorViewRef: !!editorViewRef.current,
      filePath
    });

    const view = editorViewRef.current;
    if (!view) {
      console.warn('Editor view is not available yet, skipping theme update');
      return;
    }

    try {
      // Save the current selection and cursor position
      const { ranges } = view.state.selection;
      const selectionRanges = ranges.map(range => ({
        anchor: range.anchor,
        head: range.head
      }));

      // Create new state with the same document and selection
      const newState = EditorState.create({
        doc: view.state.doc,
        extensions: createExtensions(),
      });

      // Apply the new state
      view.setState(newState);

      // Restore the selection
      if (selectionRanges.length > 0) {
        view.dispatch({
          selection: EditorSelection.create(
            selectionRanges.map(range => EditorSelection.range(range.anchor, range.head))
          )
        });
      }


      console.log('Tokyo Night theme applied successfully with preserved cursor position');
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  }, [createExtensions]);

  // Function to toggle debug mode for formatting characters
  const toggleDebugFormatting = useCallback(() => {
    const editorContainer = editorRef.current?.closest('.codemirror-editor-container');
    if (editorContainer) {
      const hasDebugClass = editorContainer.classList.contains('debug-formatting');
      if (hasDebugClass) {
        editorContainer.classList.remove('debug-formatting');
        console.log('[Editor] Debug formatting disabled');
      } else {
        editorContainer.classList.add('debug-formatting');
        console.log('[Editor] Debug formatting enabled');
      }

      // Toggle Mermaid debug mode
      const hasMermaidDebugClass = editorContainer.classList.contains('debug-mermaid');
      if (hasMermaidDebugClass) {
        editorContainer.classList.remove('debug-mermaid');
        console.log('[Editor] Mermaid debug disabled');
      } else {
        editorContainer.classList.add('debug-mermaid');
        console.log('[Editor] Mermaid debug enabled');
      }

      // Force a re-render of the editor to apply the CSS changes
      if (editorViewRef.current) {
        console.log('[Editor] Forcing editor refresh to apply CSS changes');

        // Save the current selection and cursor position
        const view = editorViewRef.current;
        const { ranges } = view.state.selection;

        // Dispatch a dummy transaction to force a re-render
        view.dispatch({
          effects: StateEffect.reconfigure.of(createExtensions())
        });

        // Restore the selection using proper EditorSelection API
        if (ranges.length > 0) {
          // Create proper EditorSelection ranges
          const selectionRanges = ranges.map(range => EditorSelection.range(range.anchor, range.head));

          view.dispatch({
            selection: EditorSelection.create(selectionRanges)
          });
        }

        // CSS is now handled through the theme system
        setTimeout(() => {
          console.log('[Editor] Theme system handling CSS');
          // Log the current state of the decoration manager and extensions
          console.log('[Editor] Decoration manager stats:', decorationManagerRef.current.getStats());
          console.log('[Editor] Extension manager stats:', extensionManagerRef.current.getStats());

          // Check for any conflicts in decorations
          const conflicts = decorationManagerRef.current.checkForConflicts();
          if (conflicts.length > 0) {
            console.warn('[Editor] Decoration conflicts detected:', conflicts);
          } else {
            console.log('[Editor] No decoration conflicts detected');
          }
        }, 100);
      }
    }
  }, [createExtensions]);

  return (
    <div className={`codemirror-editor-container orchestra-markdown orchestra-theme markdown-editor ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      <div className="editor-content-wrapper">
        <div className="editor-content">
          <div ref={editorRef} className="codemirror-wrapper" />
        </div>
      </div>
      <div className="editor-footer">
        <div className="word-count">{wordCount} words</div>
        <div className="file-path">{filePath || ''}</div>
        <button
          onClick={toggleDebugFormatting}
          title="Toggle debug formatting"
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '0 8px'
          }}
        >
          Debug Format
        </button>
        <button
          onClick={() => {
            const editorContainer = editorRef.current?.closest('.codemirror-editor-container');
            if (editorContainer) {
              const hasMermaidDebugClass = editorContainer.classList.contains('debug-mermaid');
              if (hasMermaidDebugClass) {
                editorContainer.classList.remove('debug-mermaid');
                console.log('[Editor] Mermaid debug disabled');
              } else {
                editorContainer.classList.add('debug-mermaid');
                console.log('[Editor] Mermaid debug enabled');
              }
            }
          }}
          title="Toggle Mermaid debug mode"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '0 8px'
          }}
        >
          Debug Mermaid
        </button>
        <button
          onClick={() => mermaidInspector.inspect()}
          title="Inspect Mermaid diagrams"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '0 8px'
          }}
        >
          Inspect Mermaid
        </button>
      </div>
    </div>
  );
};

export default CleanCodeMirrorEditor;