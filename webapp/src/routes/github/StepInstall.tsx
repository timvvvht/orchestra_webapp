import React, { useMemo, useState } from "react";
import { supabase } from "../../auth/SupabaseClient";
import { acsGithubApi, withApiV1 } from "@/services/acsGitHubApi";
import { CONFIG } from "../../config";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Separator } from "../../components/ui/separator";

export default function StepInstall() {
  const acsBase = CONFIG.ACS_BASE_URL;
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);
  const [status, setStatus] = useState(
    "Install the GitHub App and verify installations/repos."
  );
  const [result, setResult] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepoName, setSelectedRepoName] = useState<string>("");

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
    
    // Console log the full response for debugging
    console.log("🔍 [StepInstall] Full listInstallations response:", res);
    console.log("🔍 [StepInstall] Installations data:", res.data);
    
    if (res.ok) {
      setStatus(`Found ${res.data?.count ?? 0} installations`);
    } else if (res.status === 401 || res.status === 403) {
      setStatus('Not authenticated with ACS. Please run "Exchange for ACS Cookies" in previous step.');
    } else {
      setStatus("Failed to list installations");
    }
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
    
    // Console log the full response for debugging
    console.log("🔍 [StepInstall] Full listRepos response:", res);
    console.log("🔍 [StepInstall] Response data:", res.data);
    console.log("🔍 [StepInstall] Response data type:", typeof res.data);
    
    if (res.ok) {
      const repoData = res.data?.repositories || res.data?.repos || [];
      console.log("🔍 [StepInstall] Extracted repositories:", repoData);
      console.log("🔍 [StepInstall] First repo sample:", repoData[0]);
      
      setRepos(repoData);
      setSelectedRepoName(""); // Clear any previous selection
      setStatus(`Found ${res.data?.count ?? repoData.length ?? 0} repos`);
    } else if (res.status === 401 || res.status === 403) {
      setStatus('Not authenticated with ACS. Please run "Exchange for ACS Cookies" in previous step.');
      setRepos([]);
      setSelectedRepoName(""); // Clear any previous selection
    } else {
      setStatus("Failed to list repos");
      setRepos([]);
      setSelectedRepoName(""); // Clear any previous selection
    }
    setResult(res);
  };

  // Optional provisioning fields still editable by user (not ACS URL)
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
        <div style={{ color: "#777" }}>
          ACS Base URL (locked): <code>{acsBase}</code> | API:{" "}
          <code>{withApiV1(acsBase)}</code>
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

        {/* Repository List Display */}
        {repos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              📚 Available Repositories ({repos.length})
            </h3>
            <div style={{ 
              maxHeight: 400, 
              overflowY: 'auto', 
              border: '1px solid #e9ecef', 
              borderRadius: 6,
              background: '#f8f9fa'
            }}>
              {repos.map((repo, index) => (
                <div 
                  key={repo.id || index} 
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < repos.length - 1 ? '1px solid #e9ecef' : 'none',
                    background: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    // Auto-fill the form fields when clicking a repo
                    if (repo.id) setRepoId(repo.id);
                    if (repo.full_name) setRepoName(repo.full_name);
                    setSelectedRepoName(repo.full_name || repo.name || 'Unknown Repository');
                    console.log("🔍 [StepInstall] Selected repo:", repo);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: '#0969da',
                        marginBottom: 4 
                      }}>
                        {repo.full_name || repo.name || 'Unknown Repository'}
                      </div>
                      
                      {repo.description && (
                        <div style={{ 
                          fontSize: 13, 
                          color: '#656d76', 
                          marginBottom: 6,
                          lineHeight: 1.4
                        }}>
                          {repo.description}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                        <span style={{ color: '#656d76' }}>
                          🆔 ID: <strong>{repo.id || 'N/A'}</strong>
                        </span>
                        
                        {repo.language && (
                          <span style={{ color: '#656d76' }}>
                            💻 {repo.language}
                          </span>
                        )}
                        
                        {repo.private !== undefined && (
                          <span style={{ color: repo.private ? '#d1242f' : '#1f883d' }}>
                            {repo.private ? '🔒 Private' : '🌍 Public'}
                          </span>
                        )}
                        
                        {repo.stargazers_count !== undefined && (
                          <span style={{ color: '#656d76' }}>
                            ⭐ {repo.stargazers_count}
                          </span>
                        )}
                        
                        {repo.forks_count !== undefined && (
                          <span style={{ color: '#656d76' }}>
                            🍴 {repo.forks_count}
                          </span>
                        )}
                        
                        {repo.default_branch && (
                          <span style={{ color: '#656d76' }}>
                            🌿 {repo.default_branch}
                          </span>
                        )}
                      </div>
                      
                      {repo.updated_at && (
                        <div style={{ fontSize: 11, color: '#8c959f', marginTop: 4 }}>
                          Updated: {new Date(repo.updated_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginLeft: 12, fontSize: 11, color: '#8c959f' }}>
                      Click to select
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#8c959f', marginTop: 8, fontStyle: 'italic' }}>
              💡 Click any repository above to auto-fill the provisioning form below
            </div>
          </div>
        )}

        {/* Show message when repos were fetched but none found */}
        {result?.ok && repos.length === 0 && result?.data && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: 6,
            fontSize: 14,
            color: '#856404'
          }}>
            📭 No repositories found. Make sure you have:
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>Installed the GitHub App on your repositories</li>
              <li>Granted access to the repositories you want to use</li>
              <li>Completed the cookie exchange in the previous step</li>
            </ul>
          </div>
        )}

        <Separator />

        {selectedRepoName && (
          <div style={{ 
            padding: 12, 
            background: '#d1ecf1', 
            border: '1px solid #bee5eb', 
            borderRadius: 6,
            fontSize: 14,
            color: '#0c5460',
            marginBottom: 16
          }}>
            ✅ Selected repository: <strong>{selectedRepoName}</strong>
          </div>
        )}

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
