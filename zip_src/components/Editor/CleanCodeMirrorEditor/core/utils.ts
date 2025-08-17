/**
 * Utility functions for the Markdown extension system
 */

import { EditorView } from '@codemirror/view';

/**
 * Check if a line is within the visible viewport
 * @param view The CodeMirror editor view
 * @param line The line number to check
 * @returns True if the line is visible, false otherwise
 */
export function isLineVisible(view: EditorView, line: number): boolean {
  const { viewport } = view;
  const linePos = view.state.doc.line(line);
  return linePos.from >= viewport.from && linePos.to <= viewport.to;
}

/**
 * Get the active line number (where the cursor is)
 * @param view The CodeMirror editor view
 * @returns The active line number
 */
export function getActiveLine(view: EditorView): number {
  const { state } = view;
  return state.doc.lineAt(state.selection.main.head).number;
}

/**
 * Check if a position is on the active line
 * @param view The CodeMirror editor view
 * @param pos The position to check
 * @returns True if the position is on the active line, false otherwise
 */
export function isOnActiveLine(view: EditorView, pos: number): boolean {
  const { state } = view;
  const activeLine = state.doc.lineAt(state.selection.main.head).number;
  const posLine = state.doc.lineAt(pos).number;
  return activeLine === posLine;
}

/**
 * Get the visible line range
 * @param view The CodeMirror editor view
 * @returns An object with the first and last visible line numbers
 */
export function getVisibleLineRange(view: EditorView): { first: number; last: number } {
  const { viewport } = view;
  const firstLine = view.state.doc.lineAt(viewport.from).number;
  const lastLine = view.state.doc.lineAt(viewport.to).number;
  return { first: firstLine, last: lastLine };
}

/**
 * Normalize a language name for syntax highlighting
 * @param lang The language name to normalize
 * @returns The normalized language name
 */
export function normalizeLanguageName(lang: string): string {
  if (!lang) return '';
  
  // Convert to lowercase for case-insensitive matching
  const langLower = lang.toLowerCase();
  
  // Map of common language aliases to their standard names
  const languageMap: Record<string, string> = {
    // JavaScript family
    'js': 'javascript',
    'jsx': 'jsx',
    'javascript': 'javascript',
    'ts': 'typescript',
    'tsx': 'tsx',
    'typescript': 'typescript',
    
    // Python
    'py': 'python',
    'python': 'python',
    'python3': 'python',
    
    // Ruby
    'rb': 'ruby',
    'ruby': 'ruby',
    
    // Go
    'go': 'go',
    'golang': 'go',
    
    // JVM languages
    'java': 'java',
    'kotlin': 'kotlin',
    'scala': 'scala',
    'groovy': 'groovy',
    
    // C-family
    'c': 'c',
    'cpp': 'cpp',
    'c++': 'cpp',
    'cxx': 'cpp',
    'cs': 'csharp',
    'csharp': 'csharp',
    'c#': 'csharp',
    'objective-c': 'objectivec',
    'objc': 'objectivec',
    
    // Web
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'php': 'php',
    
    // Shell
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'shell': 'bash',
    'powershell': 'powershell',
    'ps': 'powershell',
    'ps1': 'powershell',
    'batch': 'batch',
    'bat': 'batch',
    'cmd': 'batch',
    
    // Data formats
    'yaml': 'yaml',
    'yml': 'yaml',
    'json': 'json',
    'xml': 'xml',
    'toml': 'toml',
    'ini': 'ini',
    'csv': 'csv',
    
    // Markup
    'md': 'markdown',
    'markdown': 'markdown',
    'tex': 'latex',
    'latex': 'latex',
    'rst': 'restructuredtext',
    
    // Query languages
    'sql': 'sql',
    'graphql': 'graphql',
    'gql': 'graphql',
    
    // Mobile
    'swift': 'swift',
    'dart': 'dart',
    
    // Systems programming
    'rust': 'rust',
    'rs': 'rust',
    'haskell': 'haskell',
    'hs': 'haskell',
    'elixir': 'elixir',
    'ex': 'elixir',
    'erlang': 'erlang',
    'erl': 'erlang',
    
    // Data science
    'r': 'r',
    'julia': 'julia',
    'matlab': 'matlab',
    
    // DevOps
    'dockerfile': 'dockerfile',
    'docker': 'dockerfile',
    'makefile': 'makefile',
    'make': 'makefile',
    'terraform': 'terraform',
    'tf': 'terraform',
    'hcl': 'hcl',
    
    // Other
    'diff': 'diff',
    'patch': 'diff',
    'lua': 'lua',
    'clojure': 'clojure',
    'clj': 'clojure',
    'elm': 'elm',
    'ocaml': 'ocaml',
    'ml': 'ocaml',
  };
  
  // Return the mapped language or the original if not found
  return languageMap[langLower] || lang;
}