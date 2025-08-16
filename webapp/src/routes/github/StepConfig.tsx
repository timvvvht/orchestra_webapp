import React, { useMemo, useState, useEffect } from "react";
import { acsGithubApi, withApiV1 } from "@/services/acsGitHubApi";
import { CONFIG } from "../../config";
import { Separator } from "../../components/ui/separator";

export default function StepConfig() {
  // Lock to env
  const acsBase = CONFIG.ACS_BASE_URL;
  console.log(`acsBase: ${acsBase}`);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);
  const [status, setStatus] = useState<string>(
    "ACS base URL is managed by the environment and cannot be changed."
  );
  const [me, setMe] = useState<any>(null);
  const [connectivityState, setConnectivityState] = useState<
    "loading" | "success" | "error"
  >("loading");

  const testConnectivity = async () => {
    setConnectivityState("loading");
    setStatus("Testing /auth/me (unauthenticated) to verify reachability...");
    try {
      const res = await api.whoAmI(); // expect 401 or 200 if reachable
      if (res.status === 200) {
        setStatus(`Connected successfully to ${withApiV1(acsBase)}`);
        setMe(res.data);
        setConnectivityState("success");
        window.dispatchEvent(new CustomEvent("stepSuccess"));
      } else if (res.status === 401) {
        setStatus(
          `Reachable at ${withApiV1(acsBase)} but not authenticated (status ${res.status})`
        );
        setMe(res.data);
        setConnectivityState("error");
      } else {
        setStatus(`Unexpected response: ${res.status}`);
        setMe(res.data);
        setConnectivityState("error");
      }
    } catch (error) {
      setStatus(`Connection failed: ${error}`);
      setConnectivityState("error");
    }
  };

  useEffect(() => {
    testConnectivity();
  }, []);

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>ACS Endpoint</h2>
      <p style={{ color: "#555" }}>{status}</p>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            ACS Base URL (locked)
          </div>
          <code>{acsBase}</code>
          <div style={{ color: "#777" }}>
            API base: <code>{withApiV1(acsBase)}</code>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "#666" }}>Status:</span>
          {connectivityState === "loading" && (
            <div
              style={{
                width: 16,
                height: 16,
                border: "2px solid #e3e3e3",
                borderTop: "2px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
          {connectivityState === "success" && (
            <div style={{ color: "#22c55e", fontSize: 16 }}>✓</div>
          )}
          {connectivityState === "error" && (
            <div style={{ color: "#ef4444", fontSize: 16 }}>✗</div>
          )}
        </div>
      </div>

      <Separator style={{ margin: "16px 0" }} />
    </section>
  );
}
/*
const preStyle: React.CSSProperties = {
  background: "#f8f9fa",
  padding: "1rem",
  whiteSpace: "pre-wrap",
  borderRadius: 6,
  border: "1px solid #e9ecef",
  fontSize: 12,
  maxHeight: 300,
  overflow: "auto",
};*/

// Add CSS for spinner animation
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
