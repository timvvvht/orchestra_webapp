/**
 * LexicalPillEditor - Complete Lexical Editor with File Pills
 *
 * A drop-in replacement for PillTextarea that provides native rich text editing
 * with seamless file pill integration using Lexical.
 */

import React, { useCallback, useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  EditorState,
  $createParagraphNode,
  $createTextNode,
} from "lexical";
import { cn } from "@/lib/utils";
import { FilePillNode, $createFilePillNode } from "./nodes/FilePillNode";
import { FileMentionPlugin } from "./plugins/FileMentionPlugin";
import "@/components/chat-interface/LexicalChatInput.css";

interface LexicalPillEditorProps {
  value: string;
  onChange: (value: string) => void;
  codePath?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

// AutoFocus plugin
function AutoFocusPlugin({ autoFocus }: { autoFocus?: boolean }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (autoFocus) {
      // Focus the editor after a short delay to ensure it's mounted
      const timer = setTimeout(() => {
        editor.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editor, autoFocus]);

  return null;
}

// Content synchronization component
function ContentSyncPlugin({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const isUpdatingRef = useRef(false);

  // Handle editor state changes
  const handleEditorChange = useCallback(
    (editorState: EditorState) => {
      if (isUpdatingRef.current) return;

      editorState.read(() => {
        const root = $getRoot();
        const markdown = serializeToMarkdown(root);
        onChange(markdown);
      });
    },
    [onChange]
  );

  // Update editor when value prop changes
  useEffect(() => {
    if (isUpdatingRef.current) return;

    const currentMarkdown = editor.getEditorState().read(() => {
      const root = $getRoot();
      return serializeToMarkdown(root);
    });

    if (currentMarkdown !== value) {
      isUpdatingRef.current = true;
      editor.update(() => {
        const root = $getRoot();
        root.clear();

        if (value.trim()) {
          const nodes = parseMarkdownToNodes(value);
          root.append(...nodes);
        } else {
          root.append($createParagraphNode());
        }
      });
      isUpdatingRef.current = false;
    }
  }, [editor, value]);

  // Register change listener
  useEffect(() => {
    return editor.registerUpdateListener(
      ({ editorState }: { editorState: EditorState }) => {
        handleEditorChange(editorState);
      }
    );
  }, [editor, handleEditorChange]);

  return null;
}

// Serialize Lexical nodes to markdown
function serializeToMarkdown(root: any): string {
  const children = root.getChildren();
  let markdown = "";

  for (const child of children) {
    if (child.getType() === "paragraph") {
      const paragraphChildren = child.getChildren();
      let paragraphText = "";

      for (const node of paragraphChildren) {
        if (node instanceof FilePillNode) {
          paragraphText += `[@${node.getFileName()}](@file:${node.getFilePath()})`;
        } else if (node.getType() === "text") {
          paragraphText += node.getTextContent();
        }
      }

      markdown += paragraphText + "\n";
    }
  }

  return markdown.trim();
}

// Parse markdown to Lexical nodes
function parseMarkdownToNodes(markdown: string) {
  const paragraph = $createParagraphNode();
  const fileRefRegex = /\[@([^\]]+)\]\(@file:([^)]+)\)/g;

  let lastIndex = 0;
  let match;

  while ((match = fileRefRegex.exec(markdown)) !== null) {
    // Add text before the file reference
    if (match.index > lastIndex) {
      const textBefore = markdown.substring(lastIndex, match.index);
      if (textBefore) {
        paragraph.append($createTextNode(textBefore));
      }
    }

    // Add the file pill node
    const [, fileName, filePath] = match;
    paragraph.append($createFilePillNode(fileName, filePath));

    lastIndex = fileRefRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < markdown.length) {
    const remainingText = markdown.substring(lastIndex);
    if (remainingText) {
      paragraph.append($createTextNode(remainingText));
    }
  }

  return [paragraph];
}

// Main editor configuration
const createEditorConfig = () => ({
  namespace: "LexicalPillEditor",
  theme: {
    root: "lexical-editor-root",
    paragraph: "lexical-paragraph",
    text: {
      bold: "font-bold",
      italic: "italic",
      underline: "underline",
    },
  },
  onError: (error: Error) => {
    console.error("Lexical Editor Error:", error);
  },
  nodes: [FilePillNode],
});

export const LexicalPillEditor: React.FC<LexicalPillEditorProps> = ({
  value,
  onChange,
  codePath,
  placeholder = "Start typing...",
  className,
  disabled = false,
  autoFocus = false,
}) => {
  const editorConfig = createEditorConfig();

  // Check if this is being used in chat context
  const isChatContext = className?.includes("lexical-chat-input");

  return (
    <div className={cn("relative", className)}>
      <LexicalComposer initialConfig={editorConfig}>
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  "outline-none resize-none overflow-hidden",
                  // Chat-specific styling
                  isChatContext
                    ? [
                        "lexical-editor-root",
                        "bg-transparent border-0 text-white placeholder:text-white/40",
                        "focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed",
                        "px-5 pr-24 min-h-12 max-h-[200px]",
                      ]
                    : [
                        // Default styling for other contexts
                        "p-3 border rounded-md min-h-[100px]",
                        "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500",
                      ],
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                disabled={disabled}
                spellCheck={false}
                style={
                  isChatContext ? { minHeight: "48px" } : { minHeight: "100px" }
                }
              />
            }
            placeholder={
              <div
                className={cn(
                  "pointer-events-none select-none",
                  isChatContext
                    ? ["absolute top-3 left-5 text-white/40"]
                    : ["absolute top-3 left-3 text-gray-400"]
                )}
              >
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin autoFocus={autoFocus} />
          <ContentSyncPlugin value={value} onChange={onChange} />
          <FileMentionPlugin codePath={codePath} />
        </div>
      </LexicalComposer>
    </div>
  );
};

export default LexicalPillEditor;
