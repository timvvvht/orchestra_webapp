import React, { useEffect, useRef, useState } from 'react';
// import { useTheme } from '@/components/theme/theme-provider'; // Not available in webapp
import { Maximize2, X } from 'lucide-react';
import { cn } from 'cn-utility';
import mermaid from 'mermaid';
// // import '../styles/mermaid.css'; // CSS file may not exist in webapp // CSS file may not exist in webapp

interface MermaidDisplayProps {
  content: string;
}

const MermaidDisplay: React.FC<MermaidDisplayProps> = ({ content }) => {
  // const { theme: currentAppTheme } = useTheme(); // Not available in webapp
  const isDarkMode = true;
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid with appropriate theme
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose', // Allows rendering of external links
      fontFamily: 'var(--font-monospace, monospace)',
      themeVariables: {
        background: '#0B1221',
        textColor: '#E6EDF3',
        lineColor: '#5B7DB1',
        primaryColor: '#1F2A44',
        primaryTextColor: '#E6EDF3',
        primaryBorderColor: '#5B7DB1',
        clusterBkg: '#0F1A30',
        clusterBorder: '#5B7DB1',
        edgeLabelBackground: '#0B1221',
        labelBackground: '#0B1221',
        // Additional variables for better dark mode support
        secondaryColor: '#2A3F5F',
        tertiaryColor: '#12203A',
        nodeTextColor: '#E6EDF3',
        mainBkg: '#1F2A44',
        secondBkg: '#2A3F5F',
        tertiaryBkg: '#12203A'
      }
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

  // When the SVG changes, apply it to both containers
  useEffect(() => {
    if (containerRef.current && svg) {
      containerRef.current.innerHTML = svg;
    }
    if (fullscreenContainerRef.current && svg) {
      fullscreenContainerRef.current.innerHTML = svg;
    }
  }, [svg]);

  // Handle keyboard shortcuts for fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when fullscreen
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsFullscreen(false);
    }
  };

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
    <>
      {/* Normal view with expand button */}
      <div className="relative group">
        <div
          ref={containerRef}
          className="mermaid-rendered"
          data-theme={isDarkMode ? 'dark' : 'default'}
        />
        
        {/* Expand button overlay */}
        <button
          onClick={handleFullscreenToggle}
          className={cn(
            "absolute top-2 right-2 p-2 rounded-md",
            "bg-black/50 backdrop-blur-sm",
            "border border-white/20",
            "opacity-0 group-hover:opacity-100",
            "hover:bg-black/70 hover:border-white/30",
            "transition-all duration-200",
            "transform hover:scale-105 active:scale-95",
            "z-10"
          )}
          title="Expand to fullscreen"
          aria-label="Expand diagram to fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-white/80 hover:text-white" />
        </button>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div
          className={cn(
            "fixed inset-0 z-50",
            "bg-black/90 backdrop-blur-sm",
            "flex items-center justify-center",
            "p-4 md:p-8"
          )}
          onClick={handleOverlayClick}
        >
          {/* Close button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className={cn(
              "absolute top-4 right-4 p-3 rounded-full",
              "bg-white/10 backdrop-blur-sm",
              "border border-white/20",
              "hover:bg-white/20 hover:border-white/30",
              "transition-all duration-200",
              "transform hover:scale-105 active:scale-95",
              "z-10"
            )}
            title="Close fullscreen (ESC)"
            aria-label="Close fullscreen view"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Fullscreen diagram container */}
          <div
            className={cn(
              "max-w-full max-h-full",
              "bg-[#0B1221] rounded-lg",
              "border border-white/10",
              "p-6 overflow-auto",
              "shadow-2xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={fullscreenContainerRef}
              className="mermaid-rendered-fullscreen"
              data-theme="dark"
              style={{
                background: 'transparent',
                padding: 0,
                margin: 0,
                minWidth: 'max-content'
              }}
            />
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <p className="text-white/60 text-sm">
                Press <kbd className="bg-white/20 px-2 py-1 rounded text-xs">ESC</kbd> or click outside to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MermaidDisplay;