import React, { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import mermaid from 'mermaid';

interface MermaidViewProps {
  node: {
    attrs: {
      diagramCode: string;
      theme: string;
    };
  };
  updateAttributes: (attrs: any) => void;
  selected: boolean;
}

// Initialize Mermaid once
let mermaidInitialized = false;

const initializeMermaid = (theme: string = 'default') => {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: 'loose',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 14,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
      },
      sequence: {
        useMaxWidth: true,
      },
      gantt: {
        useMaxWidth: true,
      },
    });
    mermaidInitialized = true;
  }
};

// Preprocess Mermaid code to handle common issues
const preprocessMermaidCode = (code: string): string => {
  if (!code || typeof code !== 'string') return '';
  
  // Replace Chinese colons with English colons
  code = code.replace(/\uff1a/g, ':');
  
  // Trim whitespace
  return code.trim();
};

export const MermaidView: React.FC<MermaidViewProps> = ({
  node,
  selected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderedSvg, setRenderedSvg] = useState<string>('');

  const { diagramCode, theme } = node.attrs;

  // Initialize Mermaid on component mount
  useEffect(() => {
    initializeMermaid(theme);
  }, []);

  // Re-render when diagramCode or theme changes
  useEffect(() => {
    if (!diagramCode) {
      setRenderedSvg('');
      setError(null);
      return;
    }

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      setIsRendering(true);
      setError(null);

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Preprocess the diagram code
        const processedCode = preprocessMermaidCode(diagramCode);
        
        if (!processedCode) {
          throw new Error('Empty diagram code');
        }

        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Update Mermaid configuration for current theme
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'var(--font-family-mono)',
          fontSize: 14,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
          sequence: {
            useMaxWidth: true,
          },
          gantt: {
            useMaxWidth: true,
          },
        });

        // Validate and render the diagram
        const isValid = await mermaid.parse(processedCode);
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        const { svg } = await mermaid.render(id, processedCode);
        
        // Set the rendered SVG
        setRenderedSvg(svg);
        containerRef.current.innerHTML = svg;

        // Apply theme-aware styling to the SVG
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          svgElement.style.maxWidth = '100%';
          svgElement.style.height = 'auto';
          
          // Add theme class for CSS targeting
          if (theme === 'dark') {
            svgElement.classList.add('theme-dark');
          } else {
            svgElement.classList.remove('theme-dark');
          }
        }

      } catch (err) {
        console.error('Mermaid rendering error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
        setError(errorMessage);
        setRenderedSvg('');
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [diagramCode, theme]);

  return (
    <NodeViewWrapper
      className={`mermaid-wrapper ${selected ? 'ProseMirror-selectednode' : ''}`}
      style={{
        margin: 'var(--space-6) 0',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Loading indicator */}
      {isRendering && (
        <div
          style={{
            padding: 'var(--space-4)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          Rendering diagram...
        </div>
      )}

      {/* Error display */}
      {error && !isRendering && (
        <pre
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-accent-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-accent-error)',
            fontFamily: 'var(--font-family-mono)',
            fontSize: 'var(--font-size-sm)',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}
        >
          <strong>Mermaid Error:</strong>
          {'\n'}
          {error}
        </pre>
      )}

      {/* Diagram container */}
      {!error && !isRendering && (
        <div ref={containerRef} className="mermaid-content" />
      )}

      {/* Empty state */}
      {!diagramCode && !isRendering && !error && (
        <div
          style={{
            padding: 'var(--space-4)',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-sm)',
            fontStyle: 'italic',
          }}
        >
          Empty Mermaid diagram
        </div>
      )}

      {/* Selection indicator */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--space-2)',
            right: 'var(--space-2)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            backgroundColor: 'var(--color-surface-0)',
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border-primary)',
          }}
        >
          Mermaid Diagram
        </div>
      )}
    </NodeViewWrapper>
  );
};