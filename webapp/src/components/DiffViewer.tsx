import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
// Used in Checkpoints Pane

interface DiffViewerProps {
  originalContent: string;
  modifiedContent: string;
  originalTitle?: string;
  modifiedTitle?: string;
  language?: string;
  onClose: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalContent,
  modifiedContent,
  originalTitle = 'Original',
  modifiedTitle = 'Modified',
  language = 'plaintext',
  onClose
}) => {
  // VS Code-like configuration options
  const editorOptions = {
    renderSideBySide: true,        // Side-by-side view (default)
    readOnly: true,                // Prevent editing in diff view
    ignoreTrimWhitespace: true,    // Ignore whitespace changes
    diffWordWrap: 'on' as const,   // Enable word wrapping
    showMoves: true,               // Highlight moved code blocks
    minimap: { enabled: true },    // Show minimap
    scrollBeyondLastLine: false,   // Don't scroll past last line
    automaticLayout: true,         // Auto-resize with container
    fontSize: 14,                  // Font size
    lineNumbers: 'on' as const,    // Show line numbers
    glyphMargin: true,             // Show glyph margin
    folding: true,                 // Enable code folding
    selectOnLineNumbers: true,     // Allow selecting line numbers
    renderOverviewRuler: true,     // Show overview ruler
    enableSplitViewResizing: true, // Allow resizing panels
  };

  const handleEditorDidMount = (editor: any) => {
    console.log('Monaco Diff Editor mounted:', editor);
    // You can access editor.getOriginalEditor() and editor.getModifiedEditor() here
    // for further customization if needed
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - The Void */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
      
      {/* Modal Container - The Presence */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden w-[95vw] h-[90vh] flex flex-col">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-medium text-white/90">Diff Viewer</h2>
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2 text-white/70 font-light">
                <div className="w-3 h-3 bg-red-400/70 rounded-full"></div>
                {originalTitle}
              </span>
              <span className="flex items-center gap-2 text-white/70 font-light">
                <div className="w-3 h-3 bg-green-400/70 rounded-full"></div>
                {modifiedTitle}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.05] text-white/70 hover:text-white/90 rounded-lg border border-white/10 transition-all duration-200 font-light"
          >
            ✕ Close
          </button>
        </div>

        {/* Monaco Diff Editor Container */}
        <div className="relative flex-1 p-6">
          <div className="w-full h-full border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
            <DiffEditor
              original={originalContent}
              modified={modifiedContent}
              language={language}
              theme="vs-dark"
              height="100%"
              width="100%"
              options={editorOptions}
              onMount={handleEditorDidMount}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin mx-auto mb-3"></div>
                    <div className="text-white/70 font-light">Loading Monaco Editor...</div>
                  </div>
                </div>
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="relative p-6 border-t border-white/10 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-white/50 font-light">
                <div className="w-2 h-2 bg-red-400/70 rounded-full"></div>
                Removed lines
              </span>
              <span className="flex items-center gap-2 text-white/50 font-light">
                <div className="w-2 h-2 bg-green-400/70 rounded-full"></div>
                Added lines
              </span>
              <span className="flex items-center gap-2 text-white/50 font-light">
                <div className="w-2 h-2 bg-blue-400/70 rounded-full"></div>
                Modified lines
              </span>
            </div>
            <div className="text-xs text-white/40 font-light">
              Ctrl+F to search • Scroll to navigate • Side-by-side view
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};