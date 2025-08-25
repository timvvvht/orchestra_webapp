import React from "react";

interface CloudflaredFrameProps {
  url: string;
}

const CloudflaredFrame: React.FC<CloudflaredFrameProps> = ({ url }) => {
  // Ensure URL has protocol
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  
  return (
    <div className="w-full h-full">
      <div className="text-xs text-orange-300 p-2 bg-orange-500/10 border-b border-orange-500/20">
        Loading: {fullUrl}
      </div>
      <iframe
        src={fullUrl}
        title="Cloudflared Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
};

export default CloudflaredFrame;