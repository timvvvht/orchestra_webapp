/**
 * Remaps file pill paths from original project root to worktree root.
 * 
 * File pills have the format: [@display-name](@file:/absolute/path)
 * This function rewrites paths that start with originalRoot to use worktreeRoot instead,
 * while leaving vault-absolute paths (outside originalRoot) untouched.
 * 
 * @param markdown - The markdown content containing file pills
 * @param originalRoot - The original project root path (codePath)
 * @param worktreeRoot - The worktree root path where agent will run
 * @returns The markdown with remapped file pill paths
 */
export function remapFilePills(
  markdown: string,
  originalRoot: string,
  worktreeRoot: string
): string {
  // Normalize paths by removing trailing slashes for consistent comparison
  const normalizedOriginal = originalRoot.replace(/\/+$/, '');
  const normalizedWorktree = worktreeRoot.replace(/\/+$/, '');
  
  // Regex to match file pills: [@display-name](@file:/absolute/path)
  const pillRegex = /\[@([^\]]+)]\(@file:([^)]+)\)/g;
  
  return markdown.replace(pillRegex, (match, displayName, filePath) => {
    // If the file path starts with the original root, remap it to worktree
    if (filePath.startsWith(normalizedOriginal)) {
      // Extract the relative path after the original root
      const relativePath = filePath.slice(normalizedOriginal.length);
      // Ensure we don't double up on path separators
      const separator = relativePath.startsWith('/') ? '' : '/';
      const newPath = `${normalizedWorktree}${separator}${relativePath}`;
      return `[@${displayName}](@file:${newPath})`;
    }
    
    // Leave vault paths and other absolute paths unchanged
    return match;
  });
}

/**
 * Helper function to check if a file path is within the project root.
 * 
 * @param filePath - The absolute file path to check
 * @param originalRoot - The original project root path
 * @returns True if the file is within the project root
 */
export function isInProject(filePath: string, originalRoot: string): boolean {
  const normalizedOriginal = originalRoot.replace(/\/+$/, '');
  return filePath.startsWith(normalizedOriginal);
}