import React, { useEffect, useState, useCallback } from "react";

type Status = { running: boolean; port?: number };

interface PreviewFrameProps {
  acsBaseUrl: string; // e.g., http://localhost:8001
  sessionId: string;
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ acsBaseUrl, sessionId }) => {
  const [status, setStatus] = useState<Status>({ running: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusUrl = `${acsBaseUrl}/api/v1/preview/${sessionId}/status`;
  const baseProxyUrlDefault = `${acsBaseUrl}/api/v1/preview/${sessionId}/`;
  const baseProxyUrlSimple = `${acsBaseUrl}/api/v1/preview_simple/${sessionId}/`;

  const [useSimple, setUseSimple] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(`preview_use_simple_${sessionId}`);
      return v === "1";
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`preview_use_simple_${sessionId}`, useSimple ? "1" : "0");
    } catch (e) {
      // ignore
    }
  }, [useSimple, sessionId]);

  const baseProxyUrl = useSimple ? baseProxyUrlSimple : baseProxyUrlDefault;

  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(statusUrl, { credentials: "include" });
      const data = await res.json();
      setStatus(data);
    } catch (e: any) {
      setError(e?.message || "Failed to get status");
    }
  }, [statusUrl]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${acsBaseUrl}/api/v1/preview/${sessionId}/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || "Failed to start preview");
    } finally {
      setLoading(false);
    }
  }, [acsBaseUrl, sessionId, refreshStatus]);

  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${acsBaseUrl}/api/v1/preview/${sessionId}/stop`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || "Failed to stop preview");
    } finally {
      setLoading(false);
    }
  }, [acsBaseUrl, sessionId, refreshStatus]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-2 p-2 border-b border-white/10">
        <button
          onClick={refreshStatus}
          className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white/80 text-xs"
        >
          Refresh
        </button>
        <button
          onClick={start}
          disabled={loading}
          className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-300 text-xs disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={loading}
          className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs disabled:opacity-50"
        >
          Stop
        </button>
        <label className="ml-2 flex items-center gap-2 text-xs text-white/80">
          <input
            type="checkbox"
            checked={useSimple}
            onChange={(e) => setUseSimple(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Use simple preview (5173 / 3000)</span>
        </label>
        <div className="text-white/60 text-xs ml-2">
          {status.running ? `Running on port ${status.port}` : "Stopped"}
        </div>
        {error && <div className="text-red-400 text-xs ml-4">{error}</div>}
      </div>
      <div className="flex-1 overflow-hidden">
        {status.running ? (
          <iframe
            src={baseProxyUrl}
            title="Dev Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/60 text-sm">
            Preview not running. Click Start.
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewFrame;
