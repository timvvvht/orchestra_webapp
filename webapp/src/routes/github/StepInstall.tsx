import React, { useMemo, useState } from "react";
import { supabase } from "../../auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";
import { CONFIG } from "../../config";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Separator } from "../../components/ui/separator";

export default function StepInstall() {
  const [acsBase, setAcsBase] = useState(CONFIG.ACS_BASE_URL);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);
  const [status, setStatus] = useState(
    "Install the GitHub App and verify installations/repos."
  );
  const [result, setResult] = useState<any>(null);

  const openInstall = () => {
    const url = "https://github.com/apps/orchestra-agents/installations/new";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const listInstallations = async () => {
    setStatus("Listing installations...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : undefined;
    const res = await api.listInstallations(authHeader);
    setStatus(
      res.ok
        ? `Found ${res.data?.count ?? 0} installations`
        : "Failed to list installations"
    );
    setResult(res);
  };

  const listRepos = async () => {
    setStatus("Listing repos...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : undefined;
    const res = await api.listRepos(authHeader);
    setStatus(
      res.ok ? `Found ${res.data?.count ?? 0} repos` : "Failed to list repos"
    );
    setResult(res);
  };

  // Optional: provisioning inputs
  const [repoId, setRepoId] = useState<number>(123456789);
  const [repoName, setRepoName] = useState<string>("octocat/Hello-World");
  const [branch, setBranch] = useState<string>("main");

  const provisionWithRepo = async () => {
    setStatus("Provisioning with repo...");
    const res = await api.provisionWithRepo({
      repo_id: Number(repoId),
      repo_name: repoName.trim(),
      branch: branch.trim(),
    });
    setStatus(
      res.ok ? `Provision started: ${res.data?.status}` : "Provision failed"
    );
    setResult(res);
  };

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>
        Install GitHub App & Verify
      </h2>
      <p style={{ color: "#555" }}>{status}</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 640 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            ACS Base URL
          </label>
          <Input value={acsBase} onChange={(e) => setAcsBase(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={openInstall}>Connect GitHub (Install App)</Button>
          <Button variant="secondary" onClick={listInstallations}>
            My Installations
          </Button>
          <Button variant="secondary" onClick={listRepos}>
            My Repos
          </Button>
        </div>

        <Separator />

        <h3 style={{ fontSize: 16, fontWeight: 600 }}>
          Provision With Repository (Preferred)
        </h3>
        <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
          <div>
            <label
              style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
            >
              Repository ID
            </label>
            <Input
              type="number"
              value={String(repoId)}
              onChange={(e) => setRepoId(Number(e.target.value))}
            />
          </div>
          <div>
            <label
              style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
            >
              Repository Full Name
            </label>
            <Input
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
            >
              Branch
            </label>
            <Input value={branch} onChange={(e) => setBranch(e.target.value)} />
          </div>
          <div>
            <Button onClick={provisionWithRepo}>Provision With Repo</Button>
          </div>
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
