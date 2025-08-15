import React from "react";

interface StreamDebugOverlayProps {
  isOpen?: boolean;
}

export const StreamDebugOverlay: React.FC<StreamDebugOverlayProps> = ({ isOpen = false }) => {
  const logs = (window as any).__STREAM_DEBUG?.logs ?? [];
  if (!isOpen || logs.length === 0 || !import.meta.env.DEV) return null;

  return (
    <div className="fixed top-16 right-4 w-72 max-h-[60vh] overflow-y-auto bg-black/90 text-white text-xs p-3 rounded shadow-lg z-[130] space-y-1">
      <div className="flex justify-between mb-2">
        <span className="font-semibold">Stream-complete log</span>
        <button
          onClick={() => {
            if ((window as any).__STREAM_DEBUG?.logs) {
              (window as any).__STREAM_DEBUG.logs.length = 0;
            }
          }}
          className="text-red-400 hover:text-red-300"
        >
          clear
        </button>
      </div>
      {logs
        .slice()
        .reverse()
        .map((l: any, i: number) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {l.timestamp.slice(11, 19)} – {l.sessionId}
          </div>
        ))}
    </div>
  );
};