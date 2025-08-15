/**
 * Filename sanitization utilities for markdown files
 */

export interface SanitizeResult {
  ok: boolean;
  name?: string;
  error?: string;
}

/**
 * Sanitizes a filename for markdown files
 * - Trims whitespace
 * - Removes invalid characters: <>:"/\|?* and control chars
 * - Collapses multiple spaces to single spaces
 * - Ensures .md extension
 * - Validates non-empty result
 */
export function sanitizeMarkdownFileName(input: string): SanitizeResult {
  if (!input || typeof input !== 'string') {
    return {
      ok: false,
      error: 'Filename cannot be empty'
    };
  }

  // Trim whitespace
  let sanitized = input.trim();
  
  if (!sanitized) {
    return {
      ok: false,
      error: 'Filename cannot be empty'
    };
  }

  // Remove invalid characters: <>:"/\|?* and control chars (0-31, 127)
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '');
  
  // Collapse multiple spaces to single spaces
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Trim again after character removal
  sanitized = sanitized.trim();
  
  if (!sanitized) {
    return {
      ok: false,
      error: 'Filename contains only invalid characters'
    };
  }

  // Ensure .md extension (case insensitive check)
  if (!sanitized.toLowerCase().endsWith('.md')) {
    sanitized += '.md';
  } else if (sanitized.toLowerCase().endsWith('.md') && sanitized !== sanitized.toLowerCase().replace(/\.md$/i, '') + '.md') {
    // Normalize extension to lowercase .md
    sanitized = sanitized.replace(/\.md$/i, '.md');
  }

  // Final validation - check for reserved names on Windows
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = sanitized.replace(/\.md$/i, '').toUpperCase();
  
  if (reservedNames.includes(nameWithoutExt)) {
    return {
      ok: false,
      error: `"${nameWithoutExt}" is a reserved filename`
    };
  }

  // Check length (most filesystems support 255 chars, leave some buffer)
  if (sanitized.length > 200) {
    return {
      ok: false,
      error: 'Filename is too long (max 200 characters)'
    };
  }

  return {
    ok: true,
    name: sanitized
  };
}