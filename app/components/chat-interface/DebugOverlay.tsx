import React from 'react';

interface DebugOverlayProps {
  isVisible?: boolean;
  debugInfo?: any;
  className?: string;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ isVisible = false, debugInfo, className = '' }) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono max-w-sm ${className}`}>
      <div className="font-bold mb-2">Debug Info (Webapp Stub)</div>
      <pre className="whitespace-pre-wrap">
        {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'No debug info available'}
      </pre>
    </div>
  );
};

export default DebugOverlay;
