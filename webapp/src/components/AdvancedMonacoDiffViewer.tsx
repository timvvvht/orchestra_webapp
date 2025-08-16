/**
 * Advanced Monaco Diff Viewer component
 * Stub implementation for web app - Monaco editor functionality
 */

import React from 'react';

export interface AdvancedMonacoDiffViewerProps {
  original: string;
  modified: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
}

/**
 * Detect programming language from file extension or content
 */
export function detectLanguage(filePath: string, content?: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini',
    'md': 'markdown',
    'markdown': 'markdown',
    'sql': 'sql',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'gitignore': 'gitignore'
  };

  return languageMap[extension || ''] || 'plaintext';
}

/**
 * Stub implementation of Monaco Diff Viewer
 */
export function AdvancedMonacoDiffViewer({
  original,
  modified,
  language = 'plaintext',
  theme = 'vs-dark',
  readOnly = true
}: AdvancedMonacoDiffViewerProps) {
  return (
    <div className="w-full h-full bg-gray-900 text-white p-4 font-mono text-sm">
      <div className="mb-4 text-gray-400">
        Monaco Diff Viewer (Stub Implementation)
      </div>
      <div className="grid grid-cols-2 gap-4 h-full">
        <div className="border border-gray-700 rounded p-2">
          <div className="text-red-400 mb-2">Original</div>
          <pre className="whitespace-pre-wrap text-xs overflow-auto">
            {original}
          </pre>
        </div>
        <div className="border border-gray-700 rounded p-2">
          <div className="text-green-400 mb-2">Modified</div>
          <pre className="whitespace-pre-wrap text-xs overflow-auto">
            {modified}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default AdvancedMonacoDiffViewer;