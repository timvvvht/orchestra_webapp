import { fileNavigationService } from './fileNavigation';
import { useSettingsStore } from '@/stores/settingsStore';

export interface FilePathMatch {
  original: string;
  path: string;
  startIndex: number;
  endIndex: number;
}

export class FilePathDetector {
  private static readonly FILE_EXTENSIONS = [
    'md', 'txt', 'json', 'yaml', 'yml', 'js', 'ts', 'tsx', 'jsx', 
    'py', 'rs', 'toml', 'html', 'css', 'scss', 'less', 'xml', 'csv'
  ];

  private static readonly CONTEXT_PATTERNS = [
    'saved to',
    'created',
    'updated',
    'wrote to',
    'file at',
    'path:',
    'saved as',
    'exported to',
    'generated',
    'output to'
  ];

  /**
   * Detects file paths in text and converts them to markdown links
   * @param text - Input text to process
   * @returns Text with file paths converted to vault:// markdown links
   */
  static detectAndConvertFilePaths(text: string): string {
    console.log('[FilePathDetector] Processing text:', text.substring(0, 200) + '...');
    
    const matches = this.findFilePathMatches(text);
    
    if (matches.length === 0) {
      console.log('[FilePathDetector] No file paths found');
      return text;
    }

    console.log('[FilePathDetector] Found matches:', matches);

    // Sort matches by start index in reverse order to avoid index shifting
    matches.sort((a, b) => b.startIndex - a.startIndex);
    
    let processedText = text;
    
    for (const match of matches) {
      // Skip if this is already a vault:// link
      if (match.original.includes('vault://')) {
        console.log('[FilePathDetector] Skipping already processed vault link:', match.original);
        continue;
      }
      
      const vaultLink = fileNavigationService.createVaultLink(match.path);
      const markdownLink = `[${match.original}](${vaultLink})`;
      
      console.log('[FilePathDetector] Converting:', {
        original: match.original,
        path: match.path,
        vaultLink: vaultLink,
        markdownLink: markdownLink
      });
      
      processedText = 
        processedText.slice(0, match.startIndex) + 
        markdownLink + 
        processedText.slice(match.endIndex);
    }
    
    console.log('[FilePathDetector] Converted', matches.length, 'file paths to links');
    return processedText;
  }

  /**
   * Finds all file path matches in text
   * @param text - Text to search
   * @returns Array of file path matches
   */
  private static findFilePathMatches(text: string): FilePathMatch[] {
    const matches: FilePathMatch[] = [];
    const extensionPattern = this.FILE_EXTENSIONS.join('|');
    
    // Get the current vault path from settings
    const vaultPath = useSettingsStore.getState().settings.vault.path;
    console.log('[FilePathDetector] Using vault path from settings:', vaultPath);
    
    const patterns = [
      // Absolute paths: /path/to/file.md (improved to capture full paths)
      {
        regex: new RegExp(`\\/[^\\s\\]\\)\\}]+\\.(${extensionPattern})\\b`, 'g'),
        extractPath: (match: string) => match
      },
      
      // Vault-specific paths: use dynamic vault path from settings
      ...(vaultPath ? [{
        regex: new RegExp(`${vaultPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s\\]\\)\\}]*\\.(${extensionPattern})\\b`, 'g'),
        extractPath: (match: string) => match
      }] : []),
      
      // Relative paths: ./docs/file.md or ../file.md
      {
        regex: new RegExp(`\\.[\\/\\\\][^\\s\\]\\)\\}]+\\.(${extensionPattern})\\b`, 'g'),
        extractPath: (match: string) => match
      },
      
      // Quoted paths: "path/to/file.md"
      {
        regex: new RegExp(`"([^"]+\\.(${extensionPattern}))"`, 'g'),
        extractPath: (match: string) => match.slice(1, -1) // Remove quotes
      },
      
      // Code-quoted paths: `path/to/file.md`
      {
        regex: new RegExp(`\`([^\`]+\\.(${extensionPattern}))\``, 'g'),
        extractPath: (match: string) => match.slice(1, -1) // Remove backticks
      },
      
      // Markdown link paths: [text](path/to/file.md)
      {
        regex: new RegExp(`\\]\\(([^\\)]+\\.(${extensionPattern}))\\)`, 'g'),
        extractPath: (match: string) => {
          // Extract path from markdown link syntax
          const pathMatch = match.match(/\]\(([^)]+)\)/);
          return pathMatch ? pathMatch[1] : match;
        }
      },
      
      // Context-aware simple filenames: "saved to filename.md"
      {
        regex: new RegExp(
          `(?:${this.CONTEXT_PATTERNS.join('|')})\\s+([^\\s\\]\\)\\}]+\\.(${extensionPattern}))\\b`, 
          'gi'
        ),
        extractPath: (match: string) => {
          // Extract just the filename part
          const parts = match.split(/\s+/);
          return parts[parts.length - 1];
        }
      }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const extractedPath = pattern.extractPath(fullMatch);
        
        // Check if this match is inside a markdown link [text](url)
        const beforeMatch = text.substring(0, match.index);
        const afterMatch = text.substring(match.index + fullMatch.length);
        
        // Skip if this appears to be inside a markdown link
        const isInsideMarkdownLink = beforeMatch.match(/\[[^\]]*$/) && afterMatch.match(/^\]\([^)]*\)/);
        if (isInsideMarkdownLink) {
          console.log('[FilePathDetector] Skipping path inside markdown link:', fullMatch);
          continue;
        }
        
        // Avoid duplicate matches at the same position
        const existingMatch = matches.find(m => 
          m.startIndex === match.index && m.endIndex === match.index + fullMatch.length
        );
        
        if (!existingMatch) {
          matches.push({
            original: fullMatch,
            path: extractedPath,
            startIndex: match.index,
            endIndex: match.index + fullMatch.length
          });
        }
      }
    }

    return matches;
  }

  /**
   * Checks if a string looks like a file path
   * @param text - Text to check
   * @returns true if it looks like a file path
   */
  static looksLikeFilePath(text: string): boolean {
    const extensionPattern = this.FILE_EXTENSIONS.join('|');
    const pathPattern = new RegExp(`\\.(${extensionPattern})$`, 'i');
    
    return pathPattern.test(text) && (
      text.includes('/') || 
      text.includes('\\') || 
      text.includes('.')
    );
  }
}

// Export convenience function
export const detectAndConvertFilePaths = FilePathDetector.detectAndConvertFilePaths.bind(FilePathDetector);