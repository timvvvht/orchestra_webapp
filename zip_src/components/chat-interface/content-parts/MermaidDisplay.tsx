import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import mermaid from 'mermaid';
import '../styles/mermaid.css';

interface MermaidDisplayProps {
  content: string;
}

const MermaidDisplay: React.FC<MermaidDisplayProps> = ({ content }) => {
  const { theme: currentAppTheme } = useTheme();
  const isDarkMode = true;
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid with appropriate theme
    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkMode ? 'dark' : 'default',
      securityLevel: 'loose', // Allows rendering of external links
      fontFamily: 'var(--font-monospace, monospace)',
    });

    const renderDiagram = async () => {
      if (!content) return;

      setIsLoading(true);
      setError(null);

      try {
        // Generate a unique ID for the diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, content);
        setSvg(svg);
        setIsLoading(false);

        // Log success
        console.log(`[MermaidDisplay] Successfully rendered diagram`);
      } catch (err) {
        console.error('[MermaidDisplay] Error rendering diagram:', err);
        setError(err.message || 'Failed to render diagram');
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [content, isDarkMode]);

  // When the SVG changes, apply it to the container
  useEffect(() => {
    if (containerRef.current && svg) {
      containerRef.current.innerHTML = svg;
    }
  }, [svg]);

  if (isLoading) {
    return (
      <div className="mermaid-placeholder">
        <div className="animate-pulse">Rendering diagram...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mermaid-error-container">
        <div className="mermaid-error">
          <h4>Diagram Error</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-rendered"
      data-theme={isDarkMode ? 'dark' : 'default'}
    />
  );
};

export default MermaidDisplay;