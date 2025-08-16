import React, { useMemo, useState } from "react";
import { supabase } from "../../auth/SupabaseClient";
import { acsGithubApi, withApiV1 } from "@/services/acsGitHubApi";
import { CONFIG } from "../../config";
import { Button } from "../../components/ui/Button";
import { Separator } from "../../components/ui/separator";

export default function StepExchange() {
  const acsBase = CONFIG.ACS_BASE_URL;
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
    
    if (res.ok) {
      setStatus("Success: cookies set");
      setResult(res);
      // Auto-advance to install/verify step
      window.dispatchEvent(new Event("stepSuccess"));
    } else {
      setStatus(`Failed: ${res.data?.detail ?? "Unknown"}`);
      setResult(res);
    }
  };



  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Exchange Tokens</h2>
      <p style={{ color: "#555" }}>{status}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button onClick={exchange}>Exchange for ACS Cookies</Button>
      </div>

      <div style={{ marginTop: 8, color: "#777" }}>
        ACS Base URL (locked): <code>{acsBase}</code> | API:{" "}
        <code>{withApiV1(acsBase)}</code>
      </div>

      <Separator style={{ margin: "16px 0" }} />
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
