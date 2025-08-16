import React, { useMemo, useState } from "react";
import { supabase } from "../../auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";
import { CONFIG } from "../../config";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Separator } from "../../components/ui/separator";

export default function StepExchange() {
  const [acsBase, setAcsBase] = useState(CONFIG.ACS_BASE_URL);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);
  const [status, setStatus] = useState(
    "Exchange your Supabase JWT for ACS cookies. This is CRITICAL."
  );
  const [result, setResult] = useState<any>(null);

  const exchange = async () => {
    setStatus("Exchanging...");
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      setStatus("No Supabase session found. Please login first.");
      return;
    }
    const res = await api.exchangeSupabaseJwt({
      access_token: session.access_token,
      user: session.user || {},
    });
    setStatus(
      res.ok
        ? "Success: cookies set"
        : `Failed: ${res.data?.detail ?? "Unknown"}`
    );
    setResult(res);
  };

  const whoAmI = async () => {
    setStatus("Checking /auth/me...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : undefined;
    const res = await api.whoAmI(authHeader);
    setStatus(
      res.ok
        ? `Authenticated as ${res.data?.email}`
        : `Not authenticated: ${res.data?.detail ?? res.status}`
    );
    setResult(res);
  };

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Exchange Tokens</h2>
      <p style={{ color: "#555" }}>{status}</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 480 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            ACS Base URL
          </label>
          <Input value={acsBase} onChange={(e) => setAcsBase(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={exchange}>Exchange for ACS Cookies</Button>
          <Button variant="secondary" onClick={whoAmI}>
            Who Am I
          </Button>
        </div>
      </div>

      <Separator style={{ margin: "16px 0" }} />
      <pre style={preStyle}>{JSON.stringify(result, null, 2)}</pre>
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
