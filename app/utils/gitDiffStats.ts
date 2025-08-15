/**
 * Utility functions for extracting GitHub-style diff statistics from unified diff strings
 */

import { parseMultiFileDiff } from '@/utils/diffParser';

export interface UnifiedDiffStats {
  filesChanged: number;
  additions: number;
  deletions: number;
}

/**
 * Return GitHub-style stats (files changed, total additions, deletions)
 * from a unified diff string produced by SCMManager.diff().
 * 
 * @param diff - Unified diff string from git diff command
 * @returns Object with filesChanged, additions, and deletions counts
 */
export function getDiffStatsFromUnifiedDiff(diff: string): UnifiedDiffStats {
  if (!diff || diff.trim() === '') {
    return { filesChanged: 0, additions: 0, deletions: 0 };
  }

  let filesChanged = 0;
  let additions = 0;
  let deletions = 0;

  try {
    // Try to parse using the existing multi-file diff parser
    const parsed = parseMultiFileDiff(diff);
    filesChanged = parsed.files.length;
    
    // Count additions and deletions from the original diff string
    // We need to parse the raw diff lines since the parser reconstructs content
    const lines = diff.split('\n');
    
    for (const line of lines) {
      // Skip file headers and hunk headers
      if (line.startsWith('+++') || line.startsWith('---') || 
          line.startsWith('@@') || line.startsWith('diff --git') ||
          line.startsWith('index ')) {
        continue;
      }
      
      // Count actual additions and deletions
      if (line.startsWith('+')) {
        additions++;
      } else if (line.startsWith('-')) {
        deletions++;
      }
    }
  } catch (parseError) {
    console.warn('[gitDiffStats] Failed to parse diff with parseMultiFileDiff, using fallback:', parseError);
    
    // Fallback: use regex parsing when structured parser fails
    const lines = diff.split('\n');
    
    // Count files from diff headers
    const headerLines = lines.filter(line => line.startsWith('diff --git'));
    filesChanged = headerLines.length;
    
    // Count additions and deletions
    for (const line of lines) {
      // Skip file headers
      if (line.startsWith('+++') || line.startsWith('---') || 
          line.startsWith('@@') || line.startsWith('diff --git') ||
          line.startsWith('index ')) {
        continue;
      }
      
      if (line.startsWith('+')) {
        additions++;
      } else if (line.startsWith('-')) {
        deletions++;
      }
    }
  }

  return { filesChanged, additions, deletions };
}