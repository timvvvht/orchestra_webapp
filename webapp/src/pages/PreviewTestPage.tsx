import React, { useMemo } from "react";
import PreviewFrame from "@/components/preview/PreviewFrame";

interface PreviewTestPageProps {
  acsBaseUrl?: string;
}

// Basic page to exercise the PreviewFrame component.
// Use by mounting this route in your router and passing sessionId via query (?sid=...)
const PreviewTestPage: React.FC<PreviewTestPageProps> = ({ acsBaseUrl }) => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("sid") || "";
  const base = useMemo(() => acsBaseUrl || (import.meta.env.VITE_ACS_BASE_URL as string) || "http://localhost:8001", [acsBaseUrl]);

  if (!sessionId) {
    return (
      <div className="p-4 text-white/80">
        Provide a session id via ?sid=... to preview.
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black">
      <PreviewFrame acsBaseUrl={base} sessionId={sessionId} />
    </div>
  );
};

export default PreviewTestPage;
