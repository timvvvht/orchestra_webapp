import React, { useState, useCallback, useMemo } from "react";

interface PreviewFrameProps {
  acsBaseUrl?: string; // Legacy, not used with Router
  sessionId: string;
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ sessionId }) => {
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [useLegacy, setUseLegacy] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(`preview_use_legacy_${sessionId}`);
      return v === "1";
    } catch (e) {
      return false;
    }
  });

  // Router host-based preview configuration
  const PREVIEW_DOMAIN = "preview.n0thing.ai" 
  const PREVIEW_SCHEME = ((import.meta.env.VITE_PREVIEW_SCHEME as string | undefined) || "https").replace(/:$/, "");
  
  const routerPreviewUrl = useMemo(() => {
    return `${PREVIEW_SCHEME}://${sessionId}.${PREVIEW_DOMAIN}/`;
  }, [PREVIEW_SCHEME, sessionId, PREVIEW_DOMAIN]);

  console.log(`PREVIEWFRAME: ${routerPreviewUrl}`)

  // Legacy fallback URLs (for development/testing)
  const legacyProxyUrl = useMemo(() => {
    return import.meta.env.DEV
      ? `/api/v1/preview/${sessionId}/`
      : `https://orchestra-acs-web.fly.dev/api/v1/preview/${sessionId}/`;
  }, [sessionId]);

  // Use Router URL by default, legacy only if explicitly toggled
  const previewUrl = useLegacy ? legacyProxyUrl : routerPreviewUrl;

  const toggleLegacy = useCallback((checked: boolean) => {
    setUseLegacy(checked);
    try {
      localStorage.setItem(`preview_use_legacy_${sessionId}`, checked ? "1" : "0");
    } catch (e) {
      // ignore
    }
    setFrameLoaded(false); // Reset frame loaded state when switching
  }, [sessionId]);

  const openInNewTab = useCallback(() => {
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }, [previewUrl]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
    } catch (e) {
      // ignore
    }
  }, [previewUrl]);

  const refreshFrame = useCallback(() => {
    setFrameLoaded(false);
    // Force iframe reload by changing src slightly then back
    const iframe = document.querySelector('iframe[title="Dev Preview"]') as HTMLIFrameElement;
    if (iframe) {
      const currentSrc = iframe.src;
      iframe.src = 'about:blank';
      setTimeout(() => {
        iframe.src = currentSrc;
      }, 100);
    }
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-2 p-2 border-b border-white/10">
        <button
          onClick={refreshFrame}
          className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white/80 text-xs"
        >
          Refresh
        </button>
        <button
          onClick={openInNewTab}
          className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-xs"
          title="Open preview in a new tab"
        >
          Open
        </button>
        <button
          onClick={copyLink}
          className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white/80 text-xs"
          title="Copy preview link"
        >
          Copy Link
        </button>
        <label className="ml-2 flex items-center gap-2 text-xs text-white/80">
          <input
            type="checkbox"
            checked={useLegacy}
            onChange={(e) => toggleLegacy(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Use legacy proxy</span>
        </label>
        <div className="text-white/40 text-[11px] ml-auto">
          {useLegacy ? "Legacy" : `Router: ${routerPreviewUrl}`}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe
          src={previewUrl}
          title="Dev Preview"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          onLoad={() => setFrameLoaded(true)}
        />
      </div>
      <div className="p-2 text-white/50 text-xs border-t border-white/10">
        {frameLoaded ? "Frame loaded" : "Loading preview..."}
        <span className="ml-4 text-white/30">URL: {previewUrl}</span>
      </div>
    </div>
  );
};

export default PreviewFrame;