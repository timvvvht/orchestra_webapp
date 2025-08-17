import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import mermaid from 'mermaid';

interface MermaidComponentProps {
  node: {
    attrs: {
      code: string;
      mode: 'edit' | 'preview';
    };
  };
  updateAttributes: (attributes: Record<string, any>) => void;
  editor: any;
}

const MermaidComponent: React.FC<MermaidComponentProps> = ({
  node,
  updateAttributes,
  editor,
}) => {
  const { code, mode } = node.attrs;
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editCode, setEditCode] = useState(code);

  // Initialize Mermaid once
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 14,
    });
  }, []);

  // Render Mermaid diagram when code changes or mode switches to preview
  useEffect(() => {
    if (mode === 'preview' && code) {
      renderMermaid(code);
    }
  }, [code, mode]);

  const renderMermaid = useCallback(async (mermaidCode: string) => {
    if (!mermaidCode.trim()) {
      setSvg(null);
      setError('No diagram code provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate unique ID for this diagram
      const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Render the diagram
      const { svg: renderedSvg } = await mermaid.render(diagramId, mermaidCode);
      
      setSvg(renderedSvg);
      setError(null);
    } catch (e: any) {
      console.error('Mermaid rendering error:', e);
      setSvg(null);
      setError(e.message || 'Failed to render Mermaid diagram');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggleMode = useCallback(() => {
    const newMode = mode === 'edit' ? 'preview' : 'edit';
    updateAttributes({ mode: newMode });
    
    if (newMode === 'edit') {
      setEditCode(code);
    }
  }, [mode, code, updateAttributes]);

  const handleSaveCode = useCallback(() => {
    updateAttributes({ code: editCode, mode: 'preview' });
  }, [editCode, updateAttributes]);

  const handleCancelEdit = useCallback(() => {
    setEditCode(code);
    updateAttributes({ mode: 'preview' });
  }, [code, updateAttributes]);

  const handleCodeChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditCode(event.target.value);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Cmd/Ctrl + Enter
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSaveCode();
    }
    // Cancel on Escape
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveCode, handleCancelEdit]);

  return (
    <NodeViewWrapper className="mermaid-block">
      <div className="mermaid-header">
        <div className="mermaid-title">
          <span className="mermaid-icon">📊</span>
          <span>Mermaid Diagram</span>
        </div>
        <div className="mermaid-controls">
          <button
            type="button"
            onClick={handleToggleMode}
            className="mermaid-toggle-btn"
            title={mode === 'edit' ? 'Preview diagram' : 'Edit diagram'}
          >
            {mode === 'edit' ? '👁️ Preview' : '✏️ Edit'}
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <div className="mermaid-editor">
          <textarea
            value={editCode}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter Mermaid diagram code here..."
            className="mermaid-textarea"
            rows={10}
            autoFocus
          />
          <div className="mermaid-editor-controls">
            <button
              type="button"
              onClick={handleSaveCode}
              className="mermaid-save-btn"
              title="Save and preview (Cmd/Ctrl + Enter)"
            >
              💾 Save
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="mermaid-cancel-btn"
              title="Cancel editing (Escape)"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mermaid-viewer" ref={mermaidContainerRef}>
          {isLoading ? (
            <div className="mermaid-loading">
              <div className="mermaid-spinner"></div>
              <span>Rendering diagram...</span>
            </div>
          ) : error ? (
            <div className="mermaid-error">
              <div className="mermaid-error-icon">⚠️</div>
              <div className="mermaid-error-message">
                <strong>Diagram Error:</strong>
                <pre>{error}</pre>
              </div>
            </div>
          ) : svg ? (
            <div 
              className="mermaid-svg-container"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="mermaid-placeholder">
              <div className="mermaid-placeholder-icon">📊</div>
              <div>No diagram to display</div>
              <button
                type="button"
                onClick={handleToggleMode}
                className="mermaid-edit-btn"
              >
                ✏️ Add diagram code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden content for Tiptap */}
      <NodeViewContent className="mermaid-content" style={{ display: 'none' }} />

      <style jsx>{`
        .mermaid-block {
          border: 1px solid var(--color-border-primary);
          border-radius: var(--radius-md);
          margin: var(--space-4) 0;
          background: var(--color-surface-1);
          overflow: hidden;
        }

        .mermaid-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          background: var(--color-surface-2);
          border-bottom: 1px solid var(--color-border-primary);
        }

        .mermaid-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 600;
          font-size: var(--font-size-sm);
          color: var(--color-text-primary);
        }

        .mermaid-icon {
          font-size: var(--font-size-base);
        }

        .mermaid-controls {
          display: flex;
          gap: var(--space-2);
        }

        .mermaid-toggle-btn,
        .mermaid-save-btn,
        .mermaid-cancel-btn,
        .mermaid-edit-btn {
          padding: var(--space-1) var(--space-3);
          border: 1px solid var(--color-border-primary);
          border-radius: var(--radius-sm);
          background: var(--color-surface-0);
          color: var(--color-text-primary);
          font-size: var(--font-size-xs);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mermaid-toggle-btn:hover,
        .mermaid-save-btn:hover,
        .mermaid-cancel-btn:hover,
        .mermaid-edit-btn:hover {
          background: var(--color-hover);
          border-color: var(--color-border-hover);
        }

        .mermaid-save-btn {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .mermaid-save-btn:hover {
          background: var(--color-primary-hover);
          border-color: var(--color-primary-hover);
        }

        .mermaid-editor {
          padding: var(--space-4);
        }

        .mermaid-textarea {
          width: 100%;
          min-height: 200px;
          padding: var(--space-3);
          border: 1px solid var(--color-border-primary);
          border-radius: var(--radius-sm);
          background: var(--color-surface-0);
          color: var(--color-text-primary);
          font-family: var(--font-family-mono);
          font-size: var(--font-size-sm);
          line-height: 1.5;
          resize: vertical;
          outline: none;
        }

        .mermaid-textarea:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-alpha);
        }

        .mermaid-editor-controls {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-3);
        }

        .mermaid-viewer {
          padding: var(--space-4);
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mermaid-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          color: var(--color-text-secondary);
        }

        .mermaid-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--color-border-primary);
          border-top: 2px solid var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .mermaid-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          color: var(--color-error);
          text-align: center;
          max-width: 100%;
        }

        .mermaid-error-icon {
          font-size: var(--font-size-xl);
        }

        .mermaid-error-message {
          font-size: var(--font-size-sm);
        }

        .mermaid-error-message pre {
          margin-top: var(--space-2);
          padding: var(--space-2);
          background: var(--color-surface-2);
          border-radius: var(--radius-sm);
          font-family: var(--font-family-mono);
          font-size: var(--font-size-xs);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .mermaid-svg-container {
          width: 100%;
          text-align: center;
        }

        .mermaid-svg-container :global(svg) {
          max-width: 100%;
          height: auto;
        }

        .mermaid-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          color: var(--color-text-tertiary);
          text-align: center;
        }

        .mermaid-placeholder-icon {
          font-size: var(--font-size-xl);
          opacity: 0.5;
        }

        .mermaid-content {
          display: none;
        }
      `}</style>
    </NodeViewWrapper>
  );
};

export default MermaidComponent;