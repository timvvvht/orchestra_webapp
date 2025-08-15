/**
 * SCM Statistics Utilities
 * 
 * Extracted from ScmDebugPage.tsx for reuse in CheckpointService
 * and other components that need to calculate commit statistics.
 */

import { parseMultiFileDiff } from './diffParser';
import { detectLanguage } from '@/components/AdvancedMonacoDiffViewer';

export interface FileStats {
  path: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface CommitStats {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  fileList: FileStats[];
}

export interface DiffFile {
  id: string;
  filename: string;
  filepath: string;
  originalContent: string;
  modifiedContent: string;
  currentContent: string;
  language: string;
  hasUnsavedChanges: boolean;
}

/**
 * Calculate commit statistics from a diff string with per-file details
 */
export async function calculateCommitStats(diff: string): Promise<CommitStats> {
  try {
    // Parse diff to get per-file statistics
    const lines = diff.split('\n');
    let totalLinesAdded = 0;
    let totalLinesRemoved = 0;
    const fileStats = new Map<string, { linesAdded: number; linesRemoved: number }>();
    let currentFile: string | null = null;
    
    for (const line of lines) {
      // Track current file being processed
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (match) {
          currentFile = match[1]; // Use the 'a/' path as canonical
          if (!fileStats.has(currentFile)) {
            fileStats.set(currentFile, { linesAdded: 0, linesRemoved: 0 });
          }
        }
      } else if (currentFile && line.startsWith('+') && !line.startsWith('+++')) {
        // Line added
        fileStats.get(currentFile)!.linesAdded++;
        totalLinesAdded++;
      } else if (currentFile && line.startsWith('-') && !line.startsWith('---')) {
        // Line removed
        fileStats.get(currentFile)!.linesRemoved++;
        totalLinesRemoved++;
      }
    }
    
    // Convert to FileStats array
    const fileList: FileStats[] = Array.from(fileStats.entries()).map(([path, stats]) => ({
      path,
      linesAdded: stats.linesAdded,
      linesRemoved: stats.linesRemoved
    }));
    
    return {
      filesChanged: fileStats.size,
      linesAdded: totalLinesAdded,
      linesRemoved: totalLinesRemoved,
      fileList
    };
  } catch (error) {
    // Return default stats if calculation fails
    return { filesChanged: 0, linesAdded: 0, linesRemoved: 0, fileList: [] };
  }
}

/**
 * Convert a diff string to DiffFile objects for use with AdvancedMonacoDiffViewer
 */
export function diffToDiffFiles(diff: string, fromSha: string, toSha?: string): DiffFile[] {
  try {
    // Parse the multi-file diff
    const parsedMultiDiff = parseMultiFileDiff(diff);
    
    // Create DiffFile objects for advanced viewer
    const diffFiles: DiffFile[] = parsedMultiDiff.files.map((parsedFile, index) => {
      const language = detectLanguage(parsedFile.fileName || '');
      
      return {
        id: `${fromSha}-${toSha || 'working'}-${index}-${Date.now()}`,
        filename: parsedFile.fileName || `file-${index + 1}`,
        filepath: parsedFile.fileName || `file-${index + 1}`,
        originalContent: parsedFile.originalContent,
        modifiedContent: parsedFile.modifiedContent,
        currentContent: parsedFile.modifiedContent,
        language,
        hasUnsavedChanges: false
      };
    });
    
    return diffFiles;
  } catch (error) {
    console.error('Failed to parse multi-file diff:', error);
    return [];
  }
}

/**
 * Format commit stats for display
 */
export function formatCommitStats(stats: CommitStats): string {
  const { filesChanged, linesAdded, linesRemoved } = stats;
  
  if (filesChanged === 0) {
    return 'No changes';
  }
  
  const parts = [`${filesChanged} file${filesChanged === 1 ? '' : 's'}`];
  
  if (linesAdded > 0) {
    parts.push(`+${linesAdded}`);
  }
  
  if (linesRemoved > 0) {
    parts.push(`-${linesRemoved}`);
  }
  
  return parts.join(' ');
}