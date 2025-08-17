import mermaid from 'mermaid';

/**
 * Extracts Mermaid diagrams from text content
 * @param content The text content to extract diagrams from
 * @returns An array of extracted diagrams with their IDs and content
 */
export const extractMermaidDiagrams = (content: string): { id: string; content: string }[] => {
  const diagrams: { id: string; content: string }[] = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const diagramContent = match[1].trim();
    const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
    diagrams.push({ id, content: diagramContent });
  }

  return diagrams;
};

/**
 * Replaces Mermaid diagram code blocks with placeholder divs
 * @param content The text content with Mermaid diagrams
 * @param diagrams The extracted diagrams
 * @returns The content with diagrams replaced by placeholders
 */
export const replaceMermaidWithPlaceholders = (content: string, diagrams: { id: string; content: string }[]): string => {
  let processedContent = content;
  let index = 0;

  // Replace each Mermaid diagram with a placeholder
  processedContent = processedContent.replace(/```mermaid\n([\s\S]*?)```/g, () => {
    const diagram = diagrams[index];
    index++;
    return `<div id="${diagram.id}-placeholder"></div>`;
  });

  return processedContent;
};

/**
 * Checks if a string contains Mermaid diagrams
 * @param content The content to check
 * @returns True if the content contains Mermaid diagrams
 */
export const containsMermaidDiagrams = (content: string): boolean => {
  return /```mermaid\n[\s\S]*?```/g.test(content);
};