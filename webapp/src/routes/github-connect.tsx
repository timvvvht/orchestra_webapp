// webapp/src/routes/GitHubConnectPage.tsx
import React, { useCallback, useMemo, useState } from "react";
import { supabase } from "../auth/SupabaseClient";
import { acsGithubApi, withApiV1 } from "@/services/acsGitHubApi";

type Status = { type: "info" | "success" | "error"; message: string };

const ENV_ACS_BASE =
  (import.meta as any).env?.VITE_ACS_URL_GH ||
  import.meta.env?.VITE_ACS_URL_GH ||
  "http://localhost:8001";
const DEFAULT_SUPABASE_EMAIL = "test@example.com";
const DEFAULT_SUPABASE_PASSWORD = "testpassword123";
const DEFAULT_ACS_BASE = (ENV_ACS_BASE as string).replace(/\/$/, "");

export default function GitHubConnectPage() {
  const [acsBase, setAcsBase] = useState<string>(DEFAULT_ACS_BASE);
  const [status, setStatus] = useState<Status>({
    type: "info",
    message: "Ready to test Supabase → ACS → GitHub flow",
  });
  const [email, setEmail] = useState<string>(DEFAULT_SUPABASE_EMAIL);
  const [password, setPassword] = useState<string>(DEFAULT_SUPABASE_PASSWORD);
  const [output, setOutput] = useState<any>({});

  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);

  const setInfo = (m: string) => setStatus({ type: "info", message: m });
  const setSuccess = (m: string) => setStatus({ type: "success", message: m });
  const setError = (m: string) => setStatus({ type: "error", message: m });
  const log = (title: string, data: any) => {
    setOutput({ title, time: new Date().toLocaleTimeString(), data });
    // eslint-disable-next-line no-console
    console.log(title, data);
  };

  const updateConfig = useCallback(() => {
    const clean = acsBase.replace(/\/$/, "");
    setAcsBase(clean);
    setSuccess(`Configuration updated. ACS Base: ${withApiV1(clean)}`);
    log("Config Update", { base: clean, api: withApiV1(clean) });
  }, [acsBase]);

  const resetConfig = useCallback(() => {
    setAcsBase(DEFAULT_ACS_BASE);
    setInfo("Configuration reset to local development");
    log("Config Reset", {
      base: DEFAULT_ACS_BASE,
      api: withApiV1(DEFAULT_ACS_BASE),
    });
  }, []);

  const onRegister = useCallback(async () => {
    setInfo("Registering with Supabase...");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setError(`Registration failed: ${error.message}`);
    else
      setSuccess("Registration successful! Check your email for confirmation.");
    log("Supabase Register", { data, error });
  }, [email, password]);

  const onLogin = useCallback(async () => {
    setInfo("Logging in with Supabase...");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(`Login failed: ${error.message}`);
    else setSuccess(`Login successful! Welcome ${data.user?.email}`);
    log("Supabase Login", { data, error });
  }, [email, password]);

  const onLogout = useCallback(async () => {
    setInfo("Logging out...");
    const { error } = await supabase.auth.signOut();
    if (error) setError(`Logout failed: ${error.message}`);
    else setSuccess("Logged out successfully");
    log("Supabase Logout", { ok: !error, error });
  }, []);

  const onShowSession = useCallback(async () => {
    setInfo("Fetching Supabase session...");
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (session) setSuccess(`Session active for ${session.user?.email}`);
    else setInfo("No active session");
    log("Supabase Session", { session, error });
  }, []);

  const onExchange = useCallback(async () => {
    setInfo("Exchanging Supabase token for ACS cookies...");
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      setError("No Supabase session found. Please login first.");
      log("ACS Exchange", { error: error || "No session/access_token" });
      return;
    }
    const res = await api.exchangeSupabaseJwt({
      access_token: session.access_token,
      user: session.user || {},
    });
    if (res.ok) setSuccess("Successfully exchanged for ACS cookies!");
    else setError(`Exchange failed: ${res.data?.detail ?? "Unknown error"}`);
    log("ACS Exchange Response", res);
  }, [api]);

  const onWhoAmI = useCallback(async () => {
    setInfo("Checking ACS authentication...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : undefined;
    const res = await api.whoAmI(authHeader);
    if (res.ok)
      setSuccess(
        `Authenticated as ${res.data.email} (${res.data.authentication_method})`
      );
    else
      setError(
        `Authentication failed: ${res.data?.detail ?? "Please exchange tokens first"}`
      );
    log("ACS /auth/me", res);
  }, [api]);

  const onOpenGithubAppInstall = useCallback(() => {
    setInfo("Opening GitHub App installation page...");
    const url = "https://github.com/apps/orchestra-agents/installations/new";
    window.open(url, "_blank", "noopener,noreferrer");
    log("GitHub Install URL (Hardcoded)", { install_url: url });
  }, []);

  const onListInstalls = useCallback(async () => {
    setInfo("Fetching GitHub installations...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : undefined;
    const res = await api.listInstallations(authHeader);
    if (res.ok) setSuccess(`Found ${res.data.count || 0} GitHub installations`);
    else
      setError(
        `Failed to list installations: ${res.data?.detail ?? "Please authenticate first"}`
      );
    log("GitHub Installations", res);
  }, [api]);

  const onListRepos = useCallback(async () => {
    setInfo("Fetching accessible GitHub repositories...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : undefined;
    const res = await api.listRepos(authHeader);
    if (res.ok)
      setSuccess(`Found ${res.data.count || 0} accessible repositories`);
    else
      setError(
        `Failed to list repos: ${res.data?.detail ?? "Please authenticate first"}`
      );
    log("GitHub Repos", res);
  }, [api]);

  const onProvisionTest = useCallback(async () => {
    setInfo("Testing provisioning (no auth required)...");
    const res = await api.provisionTest();
    if (res.ok) setSuccess(`Provisioning test initiated: ${res.data.status}`);
    else
      setError(
        `Provisioning test failed: ${res.data?.detail ?? "Unknown error"}`
      );
    log("/infrastructure/provision-test", res);
  }, [api]);

  const onProvision = useCallback(async () => {
    setInfo("Starting authenticated provisioning...");
    const res = await api.provision();
    if (res.ok) setSuccess(`Provisioning initiated: ${res.data.status}`);
    else
      setError(
        `Provisioning failed: ${res.data?.detail ?? "Please authenticate first"}`
      );
    log("/infrastructure/provision", res);
  }, [api]);

  const [repoId, setRepoId] = useState<number>(123456789);
  const [repoName, setRepoName] = useState<string>("octocat/Hello-World");
  const [branch, setBranch] = useState<string>("main");

  const onProvisionWithRepo = useCallback(async () => {
    setInfo("Starting repository provisioning...");
    if (!repoId || !repoName || !branch) {
      setError("Please fill in all repository fields");
      return;
    }
    const res = await api.provisionWithRepo({
      repo_id: Number(repoId),
      repo_name: repoName.trim(),
      branch: branch.trim(),
    });
    if (res.ok)
      setSuccess(`Repository provisioning initiated: ${res.data.status}`);
    else
      setError(
        `Repository provisioning failed: ${res.data?.detail ?? "Please authenticate first"}`
      );
    log("/infrastructure/provision-with-repo", res);
  }, [api, repoId, repoName, branch]);

  return (
    <div
      style={{
        maxWidth: 940,
        margin: "2rem auto",
        padding: "0 1rem",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <h1>🎭 GitHub Access: Supabase → ACS → GitHub App</h1>

      <div
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 6,
          margin: "0.5rem 0",
          fontWeight: 500,
          background:
            status.type === "success"
              ? "#d4edda"
              : status.type === "error"
                ? "#f8d7da"
                : "#d1ecf1",
          color:
            status.type === "success"
              ? "#155724"
              : status.type === "error"
                ? "#721c24"
                : "#0c5460",
          border: `1px solid ${status.type === "success" ? "#c3e6cb" : status.type === "error" ? "#f5c6cb" : "#bee5eb"}`,
        }}
      >
        {status.message}
      </div>

      {/* Configuration */}
      <section style={sectionStyle}>
        <h2>⚙️ Configuration</h2>
        <div style={inputGroupStyle}>
          <label>ACS Server URL</label>
          <input
            type="url"
            placeholder="http://localhost:8001"
            value={acsBase}
            onChange={(e) => setAcsBase(e.target.value)}
            style={inputStyle}
          />
          <small style={{ color: "#6c757d", fontSize: 12 }}>
            Local: http://localhost:8001 | Ngrok:
            https://your-ngrok-url.ngrok-free.app
          </small>
        </div>
        <div style={buttonRow}>
          <button onClick={updateConfig} style={buttonStyle}>
            🔄 Update Configuration
          </button>
          <button onClick={resetConfig} style={buttonStyle}>
            🏠 Reset to Local
          </button>
        </div>
      </section>

      {/* Authentication */}
      <section style={sectionStyle}>
        <h2>🔐 Authentication</h2>
        <div style={inputGroupStyle}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={inputGroupStyle}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={buttonRow}>
          <button onClick={onRegister} style={buttonStyle}>
            📝 Supabase Register
          </button>
          <button onClick={onLogin} style={buttonStyle}>
            🔑 Supabase Login
          </button>
          <button onClick={onLogout} style={buttonStyle}>
            🚪 Supabase Logout
          </button>
        </div>
        <div style={buttonRow}>
          <button onClick={onShowSession} style={buttonStyle}>
            👁️ Show Supabase Session
          </button>
          <button onClick={onExchange} style={buttonStyle}>
            🔄 Exchange for ACS Cookies
          </button>
          <button onClick={onWhoAmI} style={buttonStyle}>
            👤 ACS: Who Am I
          </button>
        </div>
      </section>

      {/* GitHub */}
      <section style={sectionStyle}>
        <h2>🐙 GitHub Integration</h2>
        <div style={buttonRow}>
          <button onClick={onOpenGithubAppInstall} style={buttonStyle}>
            🔗 Connect GitHub (Install App)
          </button>
          <button onClick={onListInstalls} style={buttonStyle}>
            📦 My Installations
          </button>
          <button onClick={onListRepos} style={buttonStyle}>
            📚 My Repos
          </button>
        </div>
      </section>

      {/* Provisioning */}
      <section style={sectionStyle}>
        <h2>🏗️ Infrastructure Provisioning</h2>
        <h3>📚 Provision with Repository (Preferred)</h3>
        <div style={inputGroupStyle}>
          <label>Repository ID (number)</label>
          <input
            type="number"
            value={repoId}
            onChange={(e) => setRepoId(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div style={inputGroupStyle}>
          <label>Repository Full Name</label>
          <input
            type="text"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={inputGroupStyle}>
          <label>Branch</label>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={buttonRow}>
          <button onClick={onProvisionWithRepo} style={buttonStyle}>
            🚀 Provision With Repo (preferred)
          </button>
        </div>

        <h3>🔒 Legacy App-Per-User Provisioning</h3>
        <div style={buttonRow}>
          <button onClick={onProvisionTest} style={buttonStyle}>
            🧪 Provision (no auth)
          </button>
          <button onClick={onProvision} style={buttonStyle}>
            🔒 Provision (legacy)
          </button>
        </div>
      </section>

      {/* Output */}
      <section style={sectionStyle}>
        <h2>📋 Output</h2>
        <pre style={preStyle}>{JSON.stringify(output, null, 2)}</pre>
      </section>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  margin: "2rem 0",
  padding: "1.5rem",
  border: "1px solid #e9ecef",
  borderRadius: 8,
  background: "#fdfdfd",
};

const inputGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  margin: "0.5rem 0",
};

const inputStyle: React.CSSProperties = {
  margin: "0.25rem 0",
  padding: "0.6rem",
  width: "100%",
  maxWidth: 420,
  border: "1px solid #ddd",
  borderRadius: 4,
  fontSize: 14,
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
};

const buttonStyle: React.CSSProperties = {
  margin: "0.25rem 0",
  padding: "0.6rem 1rem",
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
};

const preStyle: React.CSSProperties = {
  background: "#f8f9fa",
  padding: "1rem",
  whiteSpace: "pre-wrap",
  borderRadius: 4,
  border: "1px solid #e9ecef",
  fontSize: 12,
  maxHeight: 400,
  overflowY: "auto",
};
