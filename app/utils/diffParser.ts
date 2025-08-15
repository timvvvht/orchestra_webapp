/**
 * Utility functions for parsing Git diff output into original and modified content
 * for use with Monaco Editor's diff viewer
 */

export interface ParsedDiff {
  originalContent: string;
  modifiedContent: string;
  fileName?: string;
}

export interface ParsedMultiFileDiff {
  files: ParsedDiff[];
}

/**
 * Parse a unified diff string into original and modified content
 * This handles the standard Git diff format
 */
export function parseUnifiedDiff(diffString: string): ParsedDiff {
  const lines = diffString.split("\n");
  const originalLines: string[] = [];
  const modifiedLines: string[] = [];
  let fileName: string | undefined;

  let inHunk = false;
  let originalLineNum = 0;
  let modifiedLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract filename from diff header
    if (line.startsWith("diff --git")) {
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (match) {
        fileName = match[1];
      }
    }

    // Handle hunk headers (@@)
    if (line.startsWith("@@")) {
      inHunk = true;
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        originalLineNum = parseInt(match[1]) - 1;
        modifiedLineNum = parseInt(match[2]) - 1;
      }
      continue;
    }

    // Skip file headers
    if (
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("index ") ||
      line.startsWith("diff --git")
    ) {
      continue;
    }

    if (!inHunk) continue;

    // Handle diff content
    if (line.startsWith("-")) {
      // Removed line (only in original)
      originalLines[originalLineNum] = line.substring(1);
      originalLineNum++;
    } else if (line.startsWith("+")) {
      // Added line (only in modified)
      modifiedLines[modifiedLineNum] = line.substring(1);
      modifiedLineNum++;
    } else if (line.startsWith(" ") || line === "") {
      // Context line (in both files)
      const content = line.startsWith(" ") ? line.substring(1) : line;
      originalLines[originalLineNum] = content;
      modifiedLines[modifiedLineNum] = content;
      originalLineNum++;
      modifiedLineNum++;
    }
  }

  // Fill in any gaps with empty lines to maintain line alignment
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (originalLines[i] === undefined) originalLines[i] = "";
    if (modifiedLines[i] === undefined) modifiedLines[i] = "";
  }

  return {
    originalContent: originalLines.join("\n"),
    modifiedContent: modifiedLines.join("\n"),
    fileName,
  };
}

/**
 * Parse a multi-file unified diff string into separate file diffs
 * This handles Git diffs that contain multiple files
 */
export function parseMultiFileDiff(diffString: string): ParsedMultiFileDiff {
  const files: ParsedDiff[] = [];

  // Split the diff into individual file sections
  const fileSections = diffString
    .split(/(?=^diff --git)/gm)
    .filter((section) => section.trim());

  for (const section of fileSections) {
    if (!section.trim()) continue;

    try {
      const parsedFile = parseUnifiedDiff(section);
      if (parsedFile.fileName) {
        files.push(parsedFile);
      }
    } catch (error) {
      // If parsing fails for a file, try to extract basic info
      const lines = section.split("\n");
      let fileName: string | undefined;

      for (const line of lines) {
        if (line.startsWith("diff --git")) {
          const match = line.match(/diff --git a\/(.+) b\/(.+)/);
          if (match) {
            fileName = match[1];
            break;
          }
        }
      }

      if (fileName) {
        files.push({
          originalContent: section,
          modifiedContent: section,
          fileName,
        });
      }
    }
  }

  return { files };
}

/**
 * Simple fallback parser for when we can't parse the diff properly
 * Just shows the raw diff in both panels
 */
export function parseRawDiff(diffString: string): ParsedDiff {
  return {
    originalContent: diffString,
    modifiedContent: diffString,
    fileName: "diff",
  };
}

/**
 * Detect the language for syntax highlighting based on file extension
 */
export function detectLanguage(fileName?: string): string {
  if (!fileName) return "plaintext";

  const extension: string = fileName.split(".").pop()?.toLowerCase() || "";

  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    css: "css",
    scss: "scss",
    html: "html",
    xml: "xml",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",
  };

  return languageMap[extension] || "plaintext";
}
