import mermaid from 'mermaid';

// Initialize mermaid with default configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose', // Allows rendering of external links
  fontFamily: 'var(--font-monospace, monospace)',
});

/**
 * Renders a Mermaid diagram and returns the SVG content
 * @param content The Mermaid diagram content
 * @param isDarkMode Whether to use dark mode theme
 * @returns A promise that resolves to the SVG content
 */
export async function renderMermaidDiagram(content: string, isDarkMode: boolean): Promise<string> {
  try {
    // Set theme based on dark mode
    mermaid.initialize({
      theme: isDarkMode ? 'dark' : 'default',
    });
    
    // Generate a unique ID for the diagram
    const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
    
    // Render the diagram
    const { svg } = await mermaid.render(id, content);
    return svg;
  } catch (error) {
    console.error('Error rendering Mermaid diagram:', error);
    return `<div class="mermaid-error">
      <h4>Diagram Error</h4>
      <p>${error.message || 'Error rendering diagram'}</p>
    </div>`;
  }
}

/**
 * Checks if a string is a valid Mermaid diagram
 * @param content The content to check
 * @returns True if the content is a valid Mermaid diagram
 */
export function isMermaidDiagram(content: string): boolean {
  try {
    // Basic validation - check if it starts with a valid Mermaid diagram type
    const trimmedContent = content.trim();
    const validStarts = [
      'graph ', 'flowchart ', 'sequenceDiagram', 'classDiagram',
      'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie',
      'flowchart-v2', 'timeline', 'mindmap', 'requirement', 'gitGraph'
    ];
    
    return validStarts.some(start => 
      trimmedContent.startsWith(start) || 
      trimmedContent.startsWith(`${start}\n`)
    );
  } catch (error) {
    console.error('Error validating Mermaid diagram:', error);
    return false;
  }
}