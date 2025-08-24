/**
 * FileMentionPlugin - Lexical Plugin for File Mentions
 *
 * Handles @-trigger detection and file autocomplete functionality.
 * Integrates with existing FileSelector infrastructure.
 */

import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  TextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical";
import { $createFilePillNode } from "../nodes/FilePillNode";
import { FancyFileSelector } from "@/components/ui/fancy-file-selector";
import { useFileSearch } from "@/hooks/useFileSearch";

interface FileMentionPluginProps {
  codePath?: string;
  onTrigger?: (query: string, range: Range) => void;
}

interface MentionState {
  isOpen: boolean;
  query: string;
  anchorElement: HTMLElement | null;
  textNode: TextNode | null;
  startOffset: number;
  domRange: Range | null;
  selectedIndex: number;
}

export const FileMentionPlugin: React.FC<FileMentionPluginProps> = ({
  codePath,
  onTrigger,
}) => {
  const [editor] = useLexicalComposerContext();
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: "",
    anchorElement: null,
    textNode: null,
    startOffset: 0,
    domRange: null,
    selectedIndex: 0,
  });

  // File search hook - scoped to provided codePath
  const { results: fileResults, isLoading: isSearchingFiles } = useFileSearch(
    mentionState.query,
    {
      debounceMs: 200,
      limit: 10,
      minQueryLength: 0,
      codePath: codePath?.trim() || undefined,
    }
  );

  // Close mention popup
  const closeMention = useCallback(() => {
    setMentionState({
      isOpen: false,
      query: "",
      anchorElement: null,
      textNode: null,
      startOffset: 0,
      domRange: null,
      selectedIndex: 0,
    });
  }, []);

  // Handle file selection from autocomplete
  const handleFileSelect = useCallback(
    (file: { display: string; full_path: string }) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && mentionState.textNode) {
          // Remove the @query text
          const textContent = mentionState.textNode.getTextContent();
          const beforeMention = textContent.substring(
            0,
            mentionState.startOffset
          );
          const afterMention = textContent.substring(selection.anchor.offset);

          // Replace the text node content
          mentionState.textNode.setTextContent(beforeMention + afterMention);

          // Create and insert the file pill node
          const filePillNode = $createFilePillNode(
            file.display,
            file.full_path
          );

          // Position cursor after the mention start
          selection.anchor.set(
            mentionState.textNode.__key,
            mentionState.startOffset,
            "text"
          );
          selection.focus.set(
            mentionState.textNode.__key,
            mentionState.startOffset,
            "text"
          );

          // Insert the pill node
          selection.insertNodes([filePillNode]);

          // Add a space after the pill
          const spaceNode = $createTextNode(" ");
          selection.insertNodes([spaceNode]);
        }
      });

      closeMention();
    },
    [editor, mentionState, closeMention]
  );

  // Check for @ mentions in text
  const checkForMention = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        if (mentionState.isOpen) {
          closeMention();
        }
        return;
      }

      const anchor = selection.anchor;
      const node = anchor.getNode();

      if (!(node instanceof TextNode)) {
        if (mentionState.isOpen) {
          closeMention();
        }
        return;
      }

      const textContent = node.getTextContent();
      const offset = anchor.offset;

      // Look for @ symbol before cursor
      let mentionStart = -1;
      for (let i = offset - 1; i >= 0; i--) {
        const char = textContent[i];
        if (char === "@") {
          mentionStart = i;
          break;
        }
        if (char === " " || char === "\n") {
          break;
        }
      }

      if (mentionStart === -1) {
        if (mentionState.isOpen) {
          closeMention();
        }
        return;
      }

      // Extract query after @
      const query = textContent.substring(mentionStart + 1, offset);

      // Get DOM element for positioning
      const domSelection = window.getSelection();
      const range = domSelection?.getRangeAt(0);
      const anchorElement = range?.startContainer?.parentElement;

      if (anchorElement && range) {
        setMentionState({
          isOpen: true,
          query,
          anchorElement,
          textNode: node,
          startOffset: mentionStart,
          domRange: range.cloneRange(), // Store a copy of the range
          selectedIndex: 0,
        });

        onTrigger?.(query, range);
      }
    });
  }, [editor, mentionState.isOpen, closeMention, onTrigger]);

  // Set up text change listener
  useEffect(() => {
    return editor.registerTextContentListener(() => {
      checkForMention();
    });
  }, [editor, checkForMention]);

  // Cleanup: Close mention popup when component unmounts
  useEffect(() => {
    return () => {
      if (mentionState.isOpen) {
        closeMention();
      }
    };
  }, [mentionState.isOpen, closeMention]);

  // Handle keyboard navigation in mention popup
  useEffect(() => {
    if (!mentionState.isOpen) return;

    const removeCommands = [
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        () => {
          setMentionState((prev) => ({
            ...prev,
            selectedIndex: Math.min(
              prev.selectedIndex + 1,
              fileResults.length - 1
            ),
          }));
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => {
          setMentionState((prev) => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, 0),
          }));
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        () => {
          if (fileResults.length > 0) {
            handleFileSelect(fileResults[mentionState.selectedIndex]);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          closeMention();
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        () => {
          closeMention();
          return false; // Let tab continue normally
        },
        COMMAND_PRIORITY_LOW
      ),
    ];

    return () => {
      removeCommands.forEach((remove) => remove());
    };
  }, [
    editor,
    mentionState.isOpen,
    mentionState.selectedIndex,
    fileResults,
    handleFileSelect,
    closeMention,
  ]);

  if (!mentionState.isOpen || !mentionState.anchorElement) {
    return null;
  }

  // Calculate precise viewport position of the @ character for dropdown
  const getDropdownPosition = () => {
    try {
      // Try to use the stored DOM range first
      if (mentionState.domRange) {
        const rect = mentionState.domRange.getBoundingClientRect();
        return {
          top: rect.bottom + 4, // 4px gap below cursor (no need for scrollY since we're using fixed positioning)
          left: rect.left,
        };
      }

      // Fallback: Create a range at the @ symbol position
      const textNode = mentionState.textNode?.getLatest().__element;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.setStart(textNode, mentionState.startOffset);
        range.setEnd(textNode, mentionState.startOffset + 1);

        const rect = range.getBoundingClientRect();
        return {
          top: rect.bottom + 4, // 4px gap below @ symbol
          left: rect.left,
        };
      }
    } catch (error) {
      console.warn("Failed to calculate dropdown position:", error);
    }

    // Final fallback: Use current selection
    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      return {
        top: rect.bottom + 4,
        left: rect.left,
      };
    }

    return { top: 0, left: 0 };
  };

  const rawPosition = getDropdownPosition();

  // Adjust position to keep dropdown within viewport bounds
  const adjustedPosition = {
    top: Math.max(4, Math.min(rawPosition.top, window.innerHeight - 300)), // Keep 300px space for dropdown height
    left: Math.max(4, Math.min(rawPosition.left, window.innerWidth - 400)), // Keep 400px space for dropdown width
  };

  // Create the dropdown element
  const dropdownElement = (
    <FancyFileSelector
      isOpen={mentionState.isOpen}
      query={mentionState.query}
      results={fileResults}
      selectedIndex={mentionState.selectedIndex}
      onFileSelect={handleFileSelect}
      onClose={closeMention}
      anchorPosition={adjustedPosition}
      isSearching={isSearchingFiles}
      className="fixed z-[9999]"
    />
  );

  // Portal the dropdown to document.body to avoid clipping and stacking issues
  return ReactDOM.createPortal(dropdownElement, document.body);
};
