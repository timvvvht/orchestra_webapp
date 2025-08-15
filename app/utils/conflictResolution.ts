/**
 * Git conflict resolution utilities
 * Provides functions to parse and resolve Git conflict markers
 */

/**
 * Result of stripping conflict markers
 */
export interface ConflictResolutionResult {
  cleaned: string;
  hadMarkers: boolean;
}

/**
 * Regular expressions for Git conflict markers
 */
const CONFLICT_START = /^<<<<<<< .+$/m;
const CONFLICT_SEPARATOR = /^=======$/m;
const CONFLICT_END = /^>>>>>>> .+$/m;

/**
 * Strip Git conflict markers from content, keeping the "current" (HEAD) side by default
 *
 * @param content - File content that may contain conflict markers
 * @returns Object with cleaned content and boolean indicating if markers were found
 */
export function stripGitConflictMarkers(
  content: string
): ConflictResolutionResult {
  const lines = content.split("\n");
  const result: string[] = [];
  let inConflict = false;
  let hadMarkers = false;
  let conflictStart = -1;
  let conflictSeparator = -1;
  let conflictEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (CONFLICT_START.test(line)) {
      // Start of conflict block
      inConflict = true;
      hadMarkers = true;
      conflictStart = i;
      // Skip the marker line
      continue;
    } else if (inConflict && CONFLICT_SEPARATOR.test(line)) {
      // Middle of conflict block - this separates "ours" from "theirs"
      conflictSeparator = i;
      // Skip the marker line
      continue;
    } else if (inConflict && CONFLICT_END.test(line)) {
      // End of conflict block
      inConflict = false;
      conflictEnd = i;
      // Skip the marker line
      continue;
    }

    if (!inConflict) {
      result.push(line);
    }
  }

  // If we found conflict markers but didn't complete a block,
  // include the remaining lines as-is (partial conflict)
  if (hadMarkers && inConflict) {
    // Push remaining lines that were part of an incomplete conflict
    for (let i = conflictStart + 1; i < lines.length; i++) {
      if (i !== conflictSeparator && i !== conflictEnd) {
        result.push(lines[i]);
      }
    }
  }

  return {
    cleaned: result.join("\n"),
    hadMarkers,
  };
}

/**
 * Alternative version that keeps the "incoming" (theirs) side instead of "current" (HEAD)
 *
 * @param content - File content that may contain conflict markers
 * @returns Object with cleaned content and boolean indicating if markers were found
 */
export function stripGitConflictMarkersKeepTheirs(
  content: string
): ConflictResolutionResult {
  const lines = content.split("\n");
  const result: string[] = [];
  let inConflict = false;
  let inTheirsSection = false;
  let hadMarkers = false;

  for (const line of lines) {
    if (CONFLICT_START.test(line)) {
      // Start of conflict block
      inConflict = true;
      hadMarkers = true;
      inTheirsSection = false;
      // Skip the marker line
      continue;
    } else if (inConflict && CONFLICT_SEPARATOR.test(line)) {
      // Middle of conflict block - switch to "theirs" section
      inTheirsSection = true;
      // Skip the marker line
      continue;
    } else if (inConflict && CONFLICT_END.test(line)) {
      // End of conflict block
      inConflict = false;
      inTheirsSection = false;
      // Skip the marker line
      continue;
    }

    // Only include lines from "theirs" section when in conflict
    if (!inConflict || inTheirsSection) {
      result.push(line);
    }
  }

  return {
    cleaned: result.join("\n"),
    hadMarkers,
  };
}
