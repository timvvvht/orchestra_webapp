import React, { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Markdown, MarkdownStorage } from "tiptap-markdown";
import { StarterKit } from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { useTheme } from "@/components/theme/theme-provider";
import { MermaidAutoTransformExtension } from '@/components/Editor/extensions/MermaidAutoTransformExtension';
import MermaidExtension from '@/components/Editor/extensions/MermaidExtension';

// import { WikiLinkExtension, wikiLinkResolver } from './extensions/wikiLink';
import ElixirCommandBarExtension from "./extensions/ElixirCommandBar";
import { ElixirSidebarContainer } from "./ui/ElixirSidebarContainer";

import "./styles/base-editor.css";
import "../styles.css";
import "@/styles/editor/prism-orchestra.css";
import "@/styles/editor/elixir-command.css";

// Register languages for syntax highlighting
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";

// Create lowlight instance and register languages
const lowlight = createLowlight();

// Debug: Log lowlight instance
console.log("🔍 Lowlight instance created:", lowlight);

try {
  lowlight.register("js", javascript);
  lowlight.register("javascript", javascript);
  lowlight.register("ts", typescript);
  lowlight.register("typescript", typescript);
  lowlight.register("python", python);
  lowlight.register("py", python);
  lowlight.register("css", css);
  lowlight.register("html", html);
  lowlight.register("xml", html);
  lowlight.register("json", json);
  lowlight.register("bash", bash);
  lowlight.register("sh", bash);

  console.log(
    "✅ Languages registered successfully:",
    lowlight.listLanguages()
  );
} catch (error) {
  console.error("❌ Error registering languages:", error);
}

// Extend the Storage interface to include markdown
declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

interface TiptapEditorProps {
  content: string;
  filePath: string | null;
  isLoading: boolean;
  onChange: (content: string) => void;
  onSave: () => Promise<boolean>;
}

/**
 * Modern Tiptap-based editor component for rich markdown editing
 * with tables, task lists, and extensible architecture.
 */
const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  filePath,
  isLoading,
  onChange,
  onSave,
}) => {
  console.log("TiptapEditor rendering with props:", {
    content:
      typeof content === "string"
        ? `string[${content.length}]`
        : typeof content,
    filePath,
    isLoading,
  });

  const [wordCount, setWordCount] = useState<number>(0);
  const { theme: currentAppTheme } = useTheme();
  const isDarkMode = currentAppTheme.includes("dark");

  // Update wiki link resolver with current file path
  // useEffect(() => {
  //   wikiLinkResolver.setCurrentFilePath(filePath);
  // }, [filePath]);

  // Helper function to count words in text
  const countWords = (text: string): number => {
    if (!text || text.trim() === "") return 0;
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  };

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      Markdown.configure({
        transformPastedText: true,
      }),
      StarterKit.configure({
        // Configure built-in extensions
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: false, // Disable default code block to use CodeBlockLowlight
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),

      // Syntax highlighting for code blocks
      CodeBlockLowlight.configure({
        lowlight,
        languageClassPrefix: "language-",
        defaultLanguage: "javascript",
      }),

      // Table support
      Table.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 50,
      }),
      TableRow,
      TableHeader,
      TableCell,

      // Link support
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),

      // Task list support
      TaskList.configure({
        HTMLAttributes: {
          class: "tiptap-task-list",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "tiptap-task-item",
        },
      }),

      // Mermaid diagram support
      MermaidAutoTransformExtension,
      MermaidExtension,

      // WikiLink support
      // WikiLinkExtension.configure({
      //   HTMLAttributes: {
      //     class: 'wikilink',
      //   },
      //   onNavigate: (id: string) => {
      //     console.log('WikiLink navigation:', id);
      //     wikiLinkResolver.navigateToLink(id);
      //   },
      //   validate: (id: string) => {
      //     // Basic validation - ensure the ID is not empty
      //     return id.trim().length > 0;
      //   },
      // }),

      // ElixirCommandBar AI editing support
      // ElixirCommandBarExtension,
    ],
    content: content || "",
    editable: !isLoading,
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown();
      const text = editor.getText();

      // Emit markdown content instead of HTML
      onChange(markdown);
      setWordCount(countWords(text));
    },
    onCreate: ({ editor }) => {
      console.log("TiptapEditor created successfully");
      console.log(
        "🔍 Editor extensions:",
        editor.extensionManager.extensions.map((ext) => ext.name)
      );

      // Debug: Check raw document JSON after editor creation
      console.log('[mermaid] RAW DOC JSON after editor creation:', editor.getJSON());
      console.log('[mermaid] Schema nodes available in TiptapEditor:', Object.keys(editor.schema.nodes));

      // Test ElixirCommandBar extension
      const elixirExt = editor.extensionManager.extensions.find(
        (ext) => ext.name === "elixirCommandBar"
      );
      console.log("🧪 ElixirCommandBar extension:", elixirExt);

      // Test CodeBlockLowlight extension
      const codeBlockExt = editor.extensionManager.extensions.find(
        (ext) => ext.name === "codeBlockLowlight"
      );
      console.log("🔍 CodeBlockLowlight extension:", codeBlockExt);

      // Test Mermaid extensions
      const mermaidExt = editor.extensionManager.extensions.find(ext => ext.name === 'mermaid');
      const mermaidAutoExt = editor.extensionManager.extensions.find(ext => ext.name === 'mermaidAutoTransform');
      console.log('[mermaid] MermaidExtension found:', !!mermaidExt);
      console.log('[mermaid] MermaidAutoTransformExtension found:', !!mermaidAutoExt);

      setWordCount(countWords(editor.getText()));
    },
    onDestroy: () => {
      console.log("TiptapEditor destroyed");
    },
  });

  // Update Mermaid theme when app theme changes
  // useEffect(() => {
  //   if (editor) {
  //     editor.commands.updateMermaidTheme(isDarkMode);
  //   }
  // }, [isDarkMode, editor]);

  // Handle content updates from external sources
  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = editor.storage.markdown.getMarkdown();

    // Only update if content is different from current editor content
    if (content !== currentMarkdown) {
      console.log("Updating TiptapEditor content from external source");
      editor.commands.setContent(content, { emitUpdate: false });
      setWordCount(countWords(editor.getText()));
    }
  }, [content, editor]);

  // Handle save command
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave();
    }
  }, [onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Save shortcut
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        handleSave();
        return;
      }

      // Prevent other global shortcuts from interfering
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && event.key === "?") {
        event.preventDefault();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor, handleSave]);

  // Context menu for inserting elements
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (!editor) return;

      event.preventDefault();

      // Create custom context menu
      const menu = document.createElement("div");
      menu.className = "tiptap-context-menu";
      menu.style.position = "absolute";
      menu.style.left = `${event.clientX}px`;
      menu.style.top = `${event.clientY}px`;
      menu.style.backgroundColor = "var(--color-surface-1)";
      menu.style.border = "1px solid var(--color-border-primary)";
      menu.style.borderRadius = "var(--radius-md)";
      menu.style.boxShadow = "var(--shadow-lg)";
      menu.style.zIndex = "1000";
      menu.style.padding = "var(--space-2) 0";
      menu.style.minWidth = "200px";

      // Helper function to create menu items
      const createMenuItem = (text: string, onClick: () => void) => {
        const item = document.createElement("div");
        item.className = "tiptap-context-menu-item";
        item.textContent = text;
        item.style.padding = "var(--space-2) var(--space-4)";
        item.style.cursor = "pointer";
        item.style.fontSize = "var(--font-size-sm)";
        item.style.color = "var(--color-text-primary)";
        item.style.transition = "background-color 0.2s ease";

        item.addEventListener("mouseover", () => {
          item.style.backgroundColor = "var(--color-hover)";
        });

        item.addEventListener("mouseout", () => {
          item.style.backgroundColor = "transparent";
        });

        item.addEventListener("click", () => {
          document.body.removeChild(menu);
          onClick();
        });

        return item;
      };

      // Add menu items
      menu.appendChild(
        createMenuItem("Insert Table", () => {
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        })
      );

      menu.appendChild(
        createMenuItem("Insert Code Block", () => {
          editor.chain().focus().setCodeBlock().run();
        })
      );

      menu.appendChild(
        createMenuItem("Insert Task List", () => {
          editor.chain().focus().toggleTaskList().run();
        })
      );

      menu.appendChild(
        createMenuItem("Insert Horizontal Rule", () => {
          editor.chain().focus().setHorizontalRule().run();
        })
      );

      // Add separator
      const separator = document.createElement("div");
      separator.style.height = "1px";
      separator.style.backgroundColor = "var(--color-border-primary)";
      separator.style.margin = "var(--space-2) 0";
      menu.appendChild(separator);

      menu.appendChild(createMenuItem('Insert Mermaid Diagram', () => {
        const mermaidCode = 'flowchart TD\n    A[Start] --> B{Is it?}\n    B -->|Yes| C[OK]\n    C --> D[Rethink]\n    D --> B\n    B ---->|No| E[End]';
        editor.commands.setMermaid({ content: mermaidCode });
      }));

      // Add menu to document
      document.body.appendChild(menu);

      // Close menu when clicking outside
      const closeMenu = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          document.body.removeChild(menu);
          document.removeEventListener("click", closeMenu);
        }
      };

      // Add a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener("click", closeMenu);
      }, 100);
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className="tiptap-editor loading">
        <div className="tiptap-editor-content">
          <p>Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tiptap-editor ${isDarkMode ? "theme-dark" : "theme-light"} ${
        isLoading ? "loading" : ""
      }`}
      style={{ position: "relative" }}
    >
      <div className="tiptap-editor-content" onContextMenu={handleContextMenu}>
        <EditorContent editor={editor} className="ProseMirror-wrapper" />
      </div>
      {/* <ElixirSidebarContainer /> */}
      <div className="editor-footer">
        <div className="word-count">{wordCount} words</div>
        <div className="file-path">{filePath || ""}</div>
        <button
          onClick={() => {
            if (editor) {
              const html = editor.getHTML();
              const markdown = editor.storage.markdown.getMarkdown();
              console.log("Current editor HTML:", html);
              console.log("Current editor text:", editor.getText());
              console.log("Native markdown:", markdown);
            }
          }}
          title="Debug editor content"
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: "var(--color-text-tertiary)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs)",
            padding: "0 var(--space-2)",
          }}
        >
          Debug Content
        </button>
        <button
          onClick={() => {
            if (editor) {
              const markdown = editor.storage.markdown.getMarkdown();
              navigator.clipboard.writeText(markdown).then(() => {
                console.log("Native markdown copied to clipboard");
              });
            }
          }}
          title="Copy as markdown"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-tertiary)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs)",
            padding: "0 var(--space-2)",
          }}
        >
          Copy MD
        </button>
        <button
          onClick={() => {
            if (editor) {
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
            }
          }}
          title="Insert table"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-tertiary)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs)",
            padding: "0 var(--space-2)",
          }}
        >
          Insert Table
        </button>
      </div>
    </div>
  );
};

export default TiptapEditor;