import React, { useMemo, useState } from "react";
import { acsGithubApi, withApiV1 } from "@/services/acsGitHubApi";
import { CONFIG } from "../../config";
import { Button } from "../../components/ui/Button";
import { Separator } from "../../components/ui/separator";
import { Input } from "../../components/ui/Input";

export default function StepConfig() {
  const [acsBase, setAcsBase] = useState<string>(CONFIG.ACS_BASE_URL);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);
  const [status, setStatus] = useState<string>(
    "Set your ACS base URL and verify connectivity"
  );
  const [me, setMe] = useState<any>(null);

  const testConnectivity = async () => {
    setStatus("Testing /auth/me (unauthenticated)...");
    const res = await api.whoAmI(); // unauthenticated should likely 401 — but checks reachability
    if (res.status === 401 || res.status === 200) {
      setStatus(`Reachable at ${withApiV1(acsBase)} (status ${res.status})`);
      setMe(res.data);
    } else {
      setStatus(`Unexpected response: ${res.status}`);
      setMe(res.data);
    }
  };

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Configure ACS Endpoint</h2>
      <p style={{ color: "#555" }}>{status}</p>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <div style={{ minWidth: 420 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            ACS Base URL (no /api/v1)
          </label>
          <Input
            value={acsBase}
            onChange={(e) => setAcsBase(e.target.value)}
            placeholder="http://localhost:8001"
          />
          <small style={{ color: "#777" }}>
            Ngrok example: https://your-ngrok-url.ngrok-free.app
          </small>
        </div>
        <Button onClick={testConnectivity}>Verify</Button>
      </div>

      <Separator style={{ margin: "16px 0" }} />
      <pre style={preStyle}>
        {JSON.stringify({ acsBase, api: withApiV1(acsBase), me }, null, 2)}
      </pre>
    </section>
  );
}

const preStyle: React.CSSProperties = {
  background: "#f8f9fa",
  padding: "1rem",
  whiteSpace: "pre-wrap",
  borderRadius: 6,
  border: "1px solid #e9ecef",
  fontSize: 12,
  maxHeight: 300,
  overflow: "auto",
};
