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

  // Normalize various repo shapes (ACS vs GitHub API) into a single view model
  function normalizeRepo(repo: any) {
    const normalized = {
      // Core identifiers
      githubRepoId: repo?.repo_id ?? repo?.id ?? null, // GitHub numeric ID (for provisioning)
      acsRecordId: repo?.id && typeof repo.id === 'string' && repo.id.length > 20 ? repo.id : null, // ACS UUID
      
      // Names and URLs
      fullName: repo?.repo_full_name ?? repo?.full_name ?? repo?.name ?? 'unknown/repo',
      name: repo?.repo_name ?? repo?.name ?? undefined,
      url: repo?.repo_url ?? repo?.html_url ?? undefined,
      
      // Repository metadata
      isPrivate: repo?.is_private ?? repo?.private ?? undefined,
      language: repo?.language ?? undefined,
      description: repo?.description ?? undefined,
      stars: repo?.stargazers_count ?? undefined,
      forks: repo?.forks_count ?? undefined,
      defaultBranch: repo?.default_branch ?? 'main',
      
      // ACS-specific fields
      accessLevel: repo?.access_level ?? undefined,
      installationId: repo?.installation?.github_installation_id ?? repo?.installation_id ?? undefined,
      installationAccount: repo?.installation?.account_login ?? undefined,
      
      // Timestamps
      updatedAt: repo?.updated_at ?? undefined,
      createdAt: repo?.created_at ?? undefined,
      
      // Keep raw for debugging
      raw: repo,
    };
    
    return normalized;
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return undefined;
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

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
      const rawRepoData = res.data?.repositories || res.data?.repos || [];
      console.log("🔍 [StepInstall] Raw repositories:", rawRepoData);
      console.log("🔍 [StepInstall] First raw repo sample:", rawRepoData[0]);
      
      // Normalize the repository data
      const normalizedRepos = rawRepoData.map(normalizeRepo);
      console.log("🔍 [StepInstall] Normalized repositories:", normalizedRepos);
      console.log("🔍 [StepInstall] First normalized repo sample:", normalizedRepos[0]);
      console.table(normalizedRepos.slice(0, 3)); // Show first 3 in table format
      
      setRepos(normalizedRepos);
      setSelectedRepoName(""); // Clear any previous selection
      setStatus(`Found ${res.data?.count ?? normalizedRepos.length ?? 0} repos`);
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
                  key={repo.acsRecordId || repo.githubRepoId || index} 
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < repos.length - 1 ? '1px solid #e9ecef' : 'none',
                    background: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    cursor: repo.githubRepoId ? 'pointer' : 'not-allowed',
                    opacity: repo.githubRepoId ? 1 : 0.6
                  }}
                  onClick={() => {
                    // Auto-fill the form fields when clicking a repo - use GitHub repo ID for provisioning
                    if (repo.githubRepoId) {
                      setRepoId(repo.githubRepoId);
                      setRepoName(repo.fullName);
                      setSelectedRepoName(repo.fullName || 'Unknown Repository');
                      console.log("🔍 [StepInstall] Selected normalized repo:", repo);
                      console.log("✅ [StepInstall] Form filled with GitHub ID:", repo.githubRepoId, "and name:", repo.fullName);
                    } else {
                      console.warn("⚠️ [StepInstall] No GitHub repo ID available for:", repo);
                      alert("This repository doesn't have a GitHub ID available for provisioning. Please try another repository.");
                    }
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
                        {repo.url ? (
                          <a href={repo.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0969da', textDecoration: 'none' }}>
                            {repo.fullName}
                          </a>
                        ) : (
                          repo.fullName
                        )}
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
                          🆔 GitHub ID: <strong>{repo.githubRepoId || 'N/A'}</strong>
                        </span>
                        
                        {repo.acsRecordId && (
                          <span style={{ color: '#8c959f', fontSize: 10 }}>
                            ACS: {repo.acsRecordId.slice(0, 8)}...
                          </span>
                        )}
                        
                        {repo.language && (
                          <span style={{ color: '#656d76' }}>
                            💻 {repo.language}
                          </span>
                        )}
                        
                        {repo.isPrivate !== undefined && (
                          <span style={{ color: repo.isPrivate ? '#d1242f' : '#1f883d' }}>
                            {repo.isPrivate ? '🔒 Private' : '🌍 Public'}
                          </span>
                        )}
                        
                        {repo.accessLevel && (
                          <span style={{ color: '#656d76' }}>
                            🔑 {repo.accessLevel}
                          </span>
                        )}
                        
                        {repo.stars !== undefined && (
                          <span style={{ color: '#656d76' }}>
                            ⭐ {repo.stars}
                          </span>
                        )}
                        
                        {repo.forks !== undefined && (
                          <span style={{ color: '#656d76' }}>
                            🍴 {repo.forks}
                          </span>
                        )}
                        
                        {repo.defaultBranch && (
                          <span style={{ color: '#656d76' }}>
                            🌿 {repo.defaultBranch}
                          </span>
                        )}
                        
                        {repo.installationId && (
                          <span style={{ color: '#8c959f', fontSize: 11 }}>
                            📦 Install: {repo.installationId}
                          </span>
                        )}
                      </div>
                      
                      {(repo.updatedAt || repo.createdAt) && (
                        <div style={{ fontSize: 11, color: '#8c959f', marginTop: 4 }}>
                          {repo.updatedAt && `Updated: ${formatDate(repo.updatedAt)}`}
                          {repo.updatedAt && repo.createdAt && ' • '}
                          {repo.createdAt && `Created: ${formatDate(repo.createdAt)}`}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginLeft: 12, fontSize: 11, color: '#8c959f' }}>
                      {repo.githubRepoId ? 'Click to select' : 'No GitHub ID'}
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
