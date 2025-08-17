/**
 * React Hook for @-trigger File Autocomplete
 * 
 * Extracted from ChatInput to be reusable in other components like NewDraftModal
 */

import { useState, useCallback, useEffect } from 'react';
import { useFileSearch } from '@/hooks/useFileSearch';
import { SearchMatch } from '@/lib/tauri/fileSelector';

export interface AtTriggerPosition {
  start: number;
  end: number;
}

export interface UseAtFileAutocompleteOptions {
  /** Optional code path to include in search */
  codePath?: string;
  /** Maximum number of file results to show */
  limit?: number;
  /** Debounce delay for file search */
  debounceMs?: number;
}

export interface UseAtFileAutocompleteResult {
  /** Whether the file picker is currently shown */
  showFilePicker: boolean;
  /** Current file search query */
  fileQuery: string;
  /** File search results */
  fileResults: SearchMatch[];
  /** Whether file search is loading */
  isSearchingFiles: boolean;
  /** Currently selected file index for keyboard navigation */
  selectedFileIndex: number;
  /** Position of the @ trigger in the text */
  atTriggerPosition: AtTriggerPosition | null;
  /** Handle input change to detect @ triggers */
  handleInputChange: (text: string, cursorPosition: number) => void;
  /** Handle keyboard navigation in file picker */
  handleKeyDown: (e: React.KeyboardEvent, onInsertFile: (file: SearchMatch) => void) => boolean;
  /** Insert a file link at the @ trigger position */
  insertFileLink: (file: SearchMatch, text: string, onTextChange: (newText: string) => void, onCursorPosition?: (position: number) => void) => void;
  /** Close the file picker */
  closePicker: () => void;
  /** Set selected file index */
  setSelectedFileIndex: (index: number) => void;
}

/**
 * Hook for handling @-trigger file autocomplete functionality
 */
export function useAtFileAutocomplete(options: UseAtFileAutocompleteOptions = {}): UseAtFileAutocompleteResult {
  const {
    codePath,
    limit = 10,
    debounceMs = 200
  } = options;

  // File picker state
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [fileQuery, setFileQuery] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [atTriggerPosition, setAtTriggerPosition] = useState<AtTriggerPosition | null>(null);

  // File search hook
  const { results: fileResults, isLoading: isSearchingFiles } = useFileSearch(fileQuery, {
    debounceMs,
    limit,
    minQueryLength: 1,
    codePath
  });

  // Debug logging for codePath changes
  useEffect(() => {
    console.log('🔍 [useAtFileAutocomplete] codePath changed:', codePath);
  }, [codePath]);

  // Reset selected file index when results change
  useEffect(() => {
    setSelectedFileIndex(0);
  }, [fileResults]);

  // Detect @ trigger and extract file query
  const detectAtTrigger = useCallback((text: string, cursorPosition: number) => {
    // Look for @ followed by word characters, starting from cursor position backwards
    const beforeCursor = text.slice(0, cursorPosition);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      const start = beforeCursor.length - atMatch[0].length;
      const end = cursorPosition;
      const query = atMatch[1] || '';
      
      return {
        found: true,
        start,
        end,
        query
      };
    }
    
    return { found: false, start: 0, end: 0, query: '' };
  }, []);

  // Handle input change with @ detection
  const handleInputChange = useCallback((text: string, cursorPosition: number) => {
    // Detect @ trigger
    const atDetection = detectAtTrigger(text, cursorPosition);
    
    if (atDetection.found) {
      setShowFilePicker(true);
      setFileQuery(atDetection.query);
      setAtTriggerPosition({ start: atDetection.start, end: atDetection.end });
      setSelectedFileIndex(0);
    } else {
      setShowFilePicker(false);
      setFileQuery('');
      setAtTriggerPosition(null);
    }
  }, [detectAtTrigger]);

  // Handle keyboard navigation in file picker
  const handleKeyDown = useCallback((e: React.KeyboardEvent, onInsertFile: (file: SearchMatch) => void): boolean => {
    // Only handle keys if file picker is open and has results
    if (!showFilePicker || fileResults.length === 0) {
      return false; // Let the caller handle the key
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedFileIndex(prev => Math.min(prev + 1, fileResults.length - 1));
      return true; // Key was handled
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedFileIndex(prev => Math.max(prev - 1, 0));
      return true; // Key was handled
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onInsertFile(fileResults[selectedFileIndex]);
      return true; // Key was handled
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      closePicker();
      return true; // Key was handled
    }

    return false; // Key was not handled, let caller handle it
  }, [showFilePicker, fileResults, selectedFileIndex]);

  // Insert file link at @ trigger position
  const insertFileLink = useCallback((
    file: SearchMatch, 
    text: string, 
    onTextChange: (newText: string) => void,
    onCursorPosition?: (position: number) => void
  ) => {
    if (!atTriggerPosition) return;
    
    const beforeAt = text.slice(0, atTriggerPosition.start);
    const afterQuery = text.slice(atTriggerPosition.end);
    const fileLink = `[@${file.display}](@file:${file.full_path})`;
    
    const newText = beforeAt + fileLink + afterQuery;
    onTextChange(newText);
    
    // Close file picker
    closePicker();
    
    // Position cursor after the inserted link
    if (onCursorPosition) {
      const newCursorPosition = beforeAt.length + fileLink.length;
      onCursorPosition(newCursorPosition);
    }
  }, [atTriggerPosition]);

  // Close the file picker
  const closePicker = useCallback(() => {
    setShowFilePicker(false);
    setFileQuery('');
    setAtTriggerPosition(null);
  }, []);

  return {
    showFilePicker,
    fileQuery,
    fileResults,
    isSearchingFiles,
    selectedFileIndex,
    atTriggerPosition,
    handleInputChange,
    handleKeyDown,
    insertFileLink,
    closePicker,
    setSelectedFileIndex
  };
}