/**
 * File Selector Component
 * 
 * A dropdown component for selecting files with fuzzy search
 */

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { SearchMatch, isCodeFile, isConfigFile, isDocumentationFile } from '@/lib/tauri/fileSelector';
import { useFileSearch } from '@/hooks/useFileSearch';

export interface FileSelectorProps {
  /** Current search query */
  query: string;
  /** Called when query changes */
  onQueryChange: (query: string) => void;
  /** Called when a file is selected */
  onFileSelect: (file: SearchMatch) => void;
  /** Called when the selector should be closed */
  onClose: () => void;
  /** Whether the selector is visible */
  isOpen: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Maximum number of results to show */
  limit?: number;
  /** CSS class name for styling */
  className?: string;
  /** Optional code path to include in search (e.g., selected project path) */
  codePath?: string;
}

/**
 * File selector with fuzzy search and keyboard navigation
 */
export function FileSelector({
  query,
  onQueryChange,
  onFileSelect,
  onClose,
  isOpen,
  placeholder = "Search files...",
  limit = 20,
  className = "",
  codePath,
}: FileSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { results, isLoading, error, hasResults } = useFileSearch(query, {
    limit,
    debounceMs: 200,
    minQueryLength: 1,
    codePath,
  });

  // Debug logging for codePath changes
  useEffect(() => {
    console.log('🔍 [FileSelector] codePath changed:', codePath);
  }, [codePath]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!hasResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          onFileSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && hasResults) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex, hasResults]);

  if (!isOpen) return null;

  return (
    <div className={`file-selector ${className}`}>
      {/* Search Input */}
      <div className="file-selector-input-container">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="file-selector-input"
          autoComplete="off"
        />
        {isLoading && (
          <div className="file-selector-loading">
            <div className="spinner" />
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      <div className="file-selector-dropdown">
        {error && (
          <div className="file-selector-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {!error && !isLoading && query.trim() && !hasResults && (
          <div className="file-selector-empty">
            <span className="empty-icon">📁</span>
            <span>No files found for "{query}"</span>
          </div>
        )}

        {hasResults && (
          <div ref={listRef} className="file-selector-results">
            {results.map((file, index) => (
              <FileResultItem
                key={`${file.full_path}-${file.score}`}
                file={file}
                isSelected={index === selectedIndex}
                onClick={() => onFileSelect(file)}
                onMouseEnter={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        )}

        {!error && !isLoading && !query.trim() && (
          <div className="file-selector-hint">
            <span className="hint-icon">💡</span>
            <span>Start typing to search files...</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface FileResultItemProps {
  file: SearchMatch;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function FileResultItem({ file, isSelected, onClick, onMouseEnter }: FileResultItemProps) {
  const fileIcon = getFileIcon(file);
  const fileType = getFileTypeLabel(file);

  return (
    <div
      className={`file-result-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div className="file-result-icon">{fileIcon}</div>
      <div className="file-result-content">
        <div className="file-result-name">{file.display}</div>
        <div className="file-result-path">{file.relative_path}</div>
      </div>
      <div className="file-result-meta">
        <span className="file-result-type">{fileType}</span>
        <span className="file-result-score">{file.score}</span>
      </div>
    </div>
  );
}

function getFileIcon(file: SearchMatch): string {
  if (isCodeFile(file)) return '📄';
  if (isConfigFile(file)) return '⚙️';
  if (isDocumentationFile(file)) return '📖';
  
  const ext = file.display.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return '🖼️';
    case 'pdf':
      return '📕';
    case 'zip':
    case 'tar':
    case 'gz':
      return '📦';
    default:
      return '📄';
  }
}

function getFileTypeLabel(file: SearchMatch): string {
  if (isCodeFile(file)) return 'Code';
  if (isConfigFile(file)) return 'Config';
  if (isDocumentationFile(file)) return 'Docs';
  return 'File';
}