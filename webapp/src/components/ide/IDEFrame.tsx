import React, { useCallback, useEffect, useRef, useState } from "react";

interface IDEFrameProps {
  sessionId: string;
  className?: string;
  style?: React.CSSProperties;
  reloadSignal?: number;
  onAuthFailed?: () => Promise<void>;
}

const IDEFrame: React.FC<IDEFrameProps> = ({ sessionId, className, style, reloadSignal, onAuthFailed }) => {
  const ACS_BASE = (import.meta.env.VITE_ACS_BASE_URL || "https://orchestra-acs-web.fly.dev").replace(/\/$/, "");
  const effectiveIDEUrl = `${ACS_BASE}/api/v1/ide/${sessionId}/`;

  const [iframeKey, setIframeKey] = useState<number>(() => Date.now());
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagData, setDiagData] = useState<any>(null);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [autoTriggeredExchange, setAutoTriggeredExchange] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const refreshIframe = useCallback(() => {
    setIframeKey(Date.now());
  }, []);

  const openInNewTab = useCallback(() => {
    // Open a normal window/tab so the browser will set the Referer header.
    const newWin = window.open(effectiveIDEUrl, "_blank");
    // Attempt to null the opener to retain the security benefits of `noopener`.
    // This is a widely used pattern — some very old browsers may not allow it,
    // but modern browsers do.
    if (newWin) {
      try {
        newWin.opener = null;
      } catch (e) {
        console.error("Failed to nullify opener:", e);
      }
    }
  }, [effectiveIDEUrl]);

  const fetchDebugEcho = useCallback(async () => {
    if (!sessionId) return;
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await fetch(`${ACS_BASE}/api/v1/ide/${sessionId}/debug-echo`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDiagData(data);
        setDiagOpen(true);
        // If cookies were sent but server reports no authenticated user, try exchange
        if ((!data?.authenticated_user || !data.authenticated_user.id) && onAuthFailed && !autoTriggeredExchange) {
          setAutoTriggeredExchange(true);
          try {
            await onAuthFailed();
          } catch (e) {
            // ignore - parent handles errors/logging
          }
          return;
        }
      } else {
        const txt = await res.text();
        setDiagError(`HTTP ${res.status} ${txt}`);
        // If unauthorized and parent provided an exchange handler, attempt it once
        if (res.status === 401 && onAuthFailed && !autoTriggeredExchange) {
          setAutoTriggeredExchange(true);
          try {
            await onAuthFailed();
          } catch (e) {}
          return;
        }
      }
    } catch (e: any) {
      setDiagError(String(e?.message || e));
      setDiagData(null);
      setDiagOpen(true);
    } finally {
      setDiagLoading(false);
    }
  }, [ACS_BASE, sessionId, onAuthFailed, autoTriggeredExchange]);

  const copyDiag = useCallback(() => {
    if (!diagData) return;
    try {
      navigator.clipboard.writeText(JSON.stringify(diagData, null, 2));
    } catch (e) {
      // ignore
    }
  }, [diagData]);

  useEffect(() => {
    // auto-refresh diagnostics when sessionId changes (but do not auto-open)
    setDiagData(null);
    setDiagError(null);
  }, [sessionId]);

  useEffect(() => {
    if (typeof reloadSignal !== "undefined") {
      setIframeKey(Date.now());
    }
  }, [reloadSignal]);

  return (
    <div className={className} style={style}>
      <div className="flex items-center justify-between gap-3 p-2 border-b border-white/10 bg-black/10">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">IDE</div>
          <div className="text-xs text-white/60">{sessionId || "(no session)"}</div>
          {/* badge */}
          <div className="ml-2 flex items-center gap-2">
            {(() => {
              const status = diagLoading ? "checking" : diagError ? "error" : diagData ? (diagData.authenticated_user?.id ? "ok" : "noauth") : "unknown";
              const color = status === "ok" ? "bg-emerald-400" : status === "checking" ? "bg-yellow-400" : status === "noauth" || status === "error" ? "bg-red-400" : "bg-white/30";
              const label = status === "ok" ? "Authed" : status === "checking" ? "Checking" : status === "noauth" ? "No Auth" : status === "error" ? "Error" : "Unknown";
              return (
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} title={label} />
                  <span className="text-xs text-white/70">{label}</span>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openInNewTab}
            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-sm"
            title="Open IDE in new tab"
          >
            Open
          </button>
          <button
            onClick={refreshIframe}
            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-sm"
            title="Reload iframe"
          >
            Refresh
          </button>
          <button
            onClick={fetchDebugEcho}
            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-sm"
            title="Fetch debug info from ACS for this IDE request"
          >
            {diagLoading ? "Loading…" : "Diagnostics"}
          </button>
        </div>
      </div>

      <div className="w-full h-full">
        {sessionId ? (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={effectiveIDEUrl}
            title={`IDE ${sessionId}`}
            className="w-full h-full border-0"
            onLoad={() => {
              fetchDebugEcho();
              // Log iframe load for debugging
              console.log(`[IDEFrame] Iframe loaded: ${effectiveIDEUrl}`);
            }}
            onError={(e) => {
              console.error(`[IDEFrame] Iframe error:`, e);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-white/60">No session selected</div>
        )}
      </div>

      {diagOpen && (
        <div className="absolute left-4 bottom-4 w-96 max-w-[90%] bg-black/80 border border-white/10 p-3 rounded-lg shadow-lg text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">IDE Request Diagnostics</div>
            <div className="flex items-center gap-2">
              <button onClick={copyDiag} className="px-2 py-1 bg-white/5 rounded">Copy</button>
              <button onClick={() => setDiagOpen(false)} className="px-2 py-1 bg-white/5 rounded">Close</button>
            </div>
          </div>
          <div className="h-48 overflow-auto font-mono text-[11px]">
            {diagLoading && <div>Loading diagnostics…</div>}
            {diagError && <div className="text-red-400">Error: {diagError}</div>}
            {diagData && <pre className="whitespace-pre-wrap">{JSON.stringify(diagData, null, 2)}</pre>}
            {!diagLoading && !diagData && !diagError && <div className="text-white/40">No diagnostics yet. Click Diagnostics.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default IDEFrame;
