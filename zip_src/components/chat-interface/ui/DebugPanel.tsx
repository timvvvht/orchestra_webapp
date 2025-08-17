import React, { useState, useEffect } from 'react';
import { useChatUI } from '@/context/ChatUIContext';

interface DebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible, onToggle }) => {
  const { sseEvents, messages, currentSessionId, isAuthenticated } = useChatUI();

  // Keyboard shortcut: Cmd/Ctrl + Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'D' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggle}
          className="bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg text-xs font-mono transition-colors"
          title="Open Debug Panel (⌘⇧D)"
        >
          🔬 Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-gray-900/95 backdrop-blur-md border border-yellow-500/30 rounded-lg shadow-2xl">
      <div className="flex items-center justify-between p-3 border-b border-yellow-500/20">
        <h3 className="text-yellow-400 font-mono text-sm font-bold">🔬 Debug Panel</h3>
        <button
          onClick={onToggle}
          className="text-yellow-400 hover:text-yellow-300 text-lg leading-none"
          title="Close Debug Panel (⌘⇧D)"
        >
          ×
        </button>
      </div>
      
      <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
        {/* Status Info */}
        <div className="text-xs space-y-1">
          <div className="text-gray-400">
            <span className="text-yellow-400">Session:</span> {currentSessionId?.slice(0, 8) || 'None'}...
          </div>
          <div className="text-gray-400">
            <span className="text-yellow-400">Auth:</span> {isAuthenticated ? '✅' : '❌'}
          </div>
          <div className="text-gray-400">
            <span className="text-yellow-400">Messages:</span> {messages.length}
          </div>
          <div className="text-gray-400">
            <span className="text-yellow-400">SSE Events:</span> {sseEvents?.length || 0}
          </div>
        </div>

        {/* SSE Events */}
        {sseEvents && sseEvents.length > 0 && (
          <details className="bg-gray-800/50 border border-yellow-500/20 rounded p-2">
            <summary className="cursor-pointer text-yellow-400 text-xs font-mono">
              🔄 SSE Event Log ({sseEvents.length})
            </summary>
            <div className="mt-2 max-h-48 overflow-y-auto text-xs text-yellow-200 space-y-1">
              {sseEvents.slice(-10).map((e: any, idx: number) => (
                <div key={idx} className="border-b border-yellow-700/30 pb-1">
                  <div className="font-mono">
                    <strong>{e.type ?? e.event_type}</strong> |
                    mid: {String(e.messageId || e.message_id)} |
                    sid: {e.sessionId || e.session_id}
                    {e.delta && <> | deltaLen: {e.delta.length}</>}
                  </div>
                  <details className="ml-2 mt-1">
                    <summary className="text-yellow-400 cursor-pointer text-xs">json</summary>
                    <pre className="text-yellow-300 text-xs mt-1 whitespace-pre-wrap">
                      {JSON.stringify(e, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Recent Messages */}
        <details className="bg-gray-800/50 border border-blue-500/20 rounded p-2">
          <summary className="cursor-pointer text-blue-400 text-xs font-mono">
            💬 Recent Messages ({messages.length})
          </summary>
          <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1">
            {messages.slice(-3).map((m) => (
              <div key={m.id} className="text-gray-300">
                <span className="text-blue-400">{m.role}:</span> {
                  m.content
                    .filter(p => p.type === 'text')
                    .map(p => (p as any).text)
                    .join('')
                    .slice(0, 50)
                }...
              </div>
            ))}
          </div>
        </details>

        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
          Press ⌘⇧D to toggle • Development mode only
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;