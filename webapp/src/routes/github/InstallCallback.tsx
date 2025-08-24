import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../../auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";
import { CONFIG } from "../../config";
import { Button } from "../../components/ui/Button";

export default function InstallCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const acsBase = CONFIG.ACS_BASE_URL;
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);
  
  const [status, setStatus] = useState("Completing GitHub App installation...");
  const [pollCount, setPollCount] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installationData, setInstallationData] = useState<any>(null);

  // Read query parameters (read-only display)
  const installationId = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action');

  // Poll interval: 1500ms, attempts: 20 (30s total)
  const POLL_INTERVAL = 1500;
  const MAX_ATTEMPTS = 20;

  const pollInstallations = async () => {
    const currentAttempt = pollCount + 1;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? `Bearer ${session.access_token}` : undefined;
      
      // Log poll attempt details
      console.log(`[InstallCallback] Starting poll attempt ${currentAttempt}/${MAX_ATTEMPTS}`);
      console.log(`[InstallCallback] Auth header present:`, !!authHeader);
      console.log(`[InstallCallback] Session user:`, session?.user?.email || 'No user');
      
      const res = await api.listInstallations(authHeader);
      
      // Log detailed response summary
      console.log(`[InstallCallback] Poll attempt ${currentAttempt}/${MAX_ATTEMPTS} response:`, {
        status: res.status,
        ok: res.ok,
        count: res.data?.count || 0,
        hasInstallations: res.data?.count > 0,
        dataKeys: res.data ? Object.keys(res.data) : []
      });
      console.log(`[InstallCallback] Full response data:`, res.data);
      
      if (res.ok && res.data?.count > 0) {
        // Success - installations found
        console.log(`[InstallCallback] ✅ SUCCESS: Found ${res.data.count} installation(s) after ${currentAttempt} attempts`);
        console.log(`[InstallCallback] Installation data:`, res.data.installations);
        console.log(`[InstallCallback] Navigating back to wizard in 2 seconds...`);
        
        setStatus("GitHub App installation completed successfully!");
        setInstallationData(res.data);
        setIsPolling(false);
        
        // Navigate back to install step after a brief delay
        setTimeout(() => {
          navigate('/github/connect/install');
        }, 2000);
        
        return true;
      } else if (res.ok && res.data?.count === 0) {
        // No installations yet, continue polling
        console.log(`[InstallCallback] ⏳ No installations found yet (attempt ${currentAttempt}/${MAX_ATTEMPTS})`);
        console.log(`[InstallCallback] Will retry in ${POLL_INTERVAL}ms...`);
        
        setStatus(`Waiting for installation to complete... (${currentAttempt}/${MAX_ATTEMPTS})`);
        return false;
      } else {
        // API error
        console.error(`[InstallCallback] ❌ API error on attempt ${currentAttempt}/${MAX_ATTEMPTS}:`, {
          status: res.status,
          ok: res.ok,
          data: res.data,
          detail: res.data?.detail
        });
        
        let userFriendlyMsg;
        if (res.status === 401 || res.status === 403) {
          userFriendlyMsg = 'Authentication expired. Please return to the GitHub wizard and complete the "Exchange for ACS Cookies" step, then try the installation again.';
        } else if (res.status === 404) {
          userFriendlyMsg = 'Installation service not found. This might be a temporary issue. Please try refreshing the page or contact support.';
        } else if (res.status === 500) {
          userFriendlyMsg = 'Server error occurred while checking installations. Please wait a moment and try again, or contact support if the issue persists.';
        } else if (res.status >= 500) {
          userFriendlyMsg = 'Server is temporarily unavailable. Please try again in a few minutes or contact support.';
        } else {
          userFriendlyMsg = `Unable to check installation status (Error ${res.status}). ${res.data?.detail || 'Please try again or contact support if the issue persists.'}`;
        }
        setError(userFriendlyMsg);
        setIsPolling(false);
        return true;
      }
    } catch (error) {
      console.error(`[InstallCallback] ❌ Exception on poll attempt ${currentAttempt}/${MAX_ATTEMPTS}:`, error);
      console.error(`[InstallCallback] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const userFriendlyMsg = "Network connection error. Please check your internet connection and try again. If the problem persists, contact support.";
      setError(userFriendlyMsg);
      setIsPolling(false);
      return true;
    }
  };

  useEffect(() => {
    if (!isPolling) return;

    const poll = async () => {
      const shouldStop = await pollInstallations();
      
      if (shouldStop) {
        return;
      }
      
      const newPollCount = pollCount + 1;
      setPollCount(newPollCount);
      
      if (newPollCount >= MAX_ATTEMPTS) {
        // Timeout
        setStatus('Installation check timed out');
        setError('The installation is taking longer than expected (30+ seconds). This could mean: (1) The GitHub App installation is still processing, (2) There was an issue with the installation, or (3) Network connectivity problems. Please check your GitHub installations manually at github.com/settings/installations, or try the installation process again.');
        setIsPolling(false);
        return;
      }
      
      // Schedule next poll
      setTimeout(poll, POLL_INTERVAL);
    };

    // Start polling after a brief initial delay
    const initialDelay = setTimeout(poll, 1000);
    
    return () => {
      clearTimeout(initialDelay);
    };
  }, [pollCount, isPolling]);

  const retryPolling = () => {
    setError(null);
    setPollCount(0);
    setIsPolling(true);
    setStatus("Retrying installation check...");
  };

  const goBackToWizard = () => {
    navigate('/github/connect/install');
  };

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>
        GitHub App Installation Callback
      </h2>
      
      <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
        {/* Status Display */}
        <div style={{ 
          padding: 16, 
          background: error ? '#f8d7da' : isPolling ? '#d1ecf1' : '#d4edda', 
          border: `1px solid ${error ? '#f5c6cb' : isPolling ? '#bee5eb' : '#c3e6cb'}`, 
          borderRadius: 6,
          fontSize: 14,
          color: error ? '#721c24' : isPolling ? '#0c5460' : '#155724'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {error ? '❌ Error' : isPolling ? '⏳ Processing' : '✅ Complete'}
          </div>
          <div>{error || status}</div>
          
          {isPolling && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Checking for installations every {POLL_INTERVAL/1000} seconds...
            </div>
          )}
        </div>

        {/* Query Parameters Display (Read-only) */}
        {(installationId || setupAction) && (
          <div style={{ 
            padding: 12, 
            background: '#f8f9fa', 
            border: '1px solid #e9ecef', 
            borderRadius: 6,
            fontSize: 13
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>GitHub Callback Parameters:</div>
            {installationId && (
              <div>📦 Installation ID: <code>{installationId}</code></div>
            )}
            {setupAction && (
              <div>⚙️ Setup Action: <code>{setupAction}</code></div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: '#6c757d', fontStyle: 'italic' }}>
              Note: These parameters are handled server-side. The client does not parse or consume the state parameter.
            </div>
          </div>
        )}

        {/* Installation Data Display */}
        {installationData && (
          <div style={{ 
            padding: 12, 
            background: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: 6,
            fontSize: 13
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>✅ Installation Found:</div>
            <div>Count: {installationData.count}</div>
            {installationData.installations && installationData.installations.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 500 }}>Latest Installation:</div>
                <pre style={{ 
                  fontSize: 11, 
                  background: '#ffffff', 
                  padding: 8, 
                  borderRadius: 4, 
                  marginTop: 4,
                  overflow: 'auto',
                  maxHeight: 200
                }}>
                  {JSON.stringify(installationData.installations[0], null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {error && (
            <Button onClick={retryPolling}>
              Retry Installation Check
            </Button>
          )}
          <Button variant="secondary" onClick={goBackToWizard}>
            Return to GitHub Wizard
          </Button>
        </div>

        {/* Help Text */}
        <div style={{ 
          fontSize: 12, 
          color: '#6c757d', 
          fontStyle: 'italic',
          padding: 12,
          background: '#f8f9fa',
          borderRadius: 6
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>What's happening?</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>GitHub redirected you here after the app installation</li>
            <li>We're polling the ACS server to confirm the installation was processed</li>
            <li>Once confirmed, you'll be redirected back to the wizard</li>
            <li>The entire process should take less than 30 seconds</li>
          </ul>
        </div>
      </div>
    </section>
  );
}