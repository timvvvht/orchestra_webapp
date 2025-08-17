import React, { useState, useEffect } from 'react';
import { Github, Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDefaultACSClient } from '@/services/acs';
import type { GitHubStatus, GitHubRepo } from '@/services/acs/shared/types';

const GitHubConnectPanel: React.FC = () => {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [settingRepo, setSettingRepo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRepoSelect, setShowRepoSelect] = useState(false);

  const acs = getDefaultACSClient();

  // Load GitHub status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  // Load repos when connected
  useEffect(() => {
    if (status?.connected) {
      loadRepos();
    }
  }, [status?.connected]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const githubStatus = await acs.github.getStatus();
      setStatus(githubStatus);
    } catch (err) {
      console.error('Failed to load GitHub status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const loadRepos = async () => {
    try {
      const repoList = await acs.github.listRepos();
      setRepos(repoList);
    } catch (err) {
      console.error('Failed to load repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const { url } = await acs.github.startConnect();
      // Redirect to GitHub OAuth
      window.location.assign(url);
    } catch (err) {
      console.error('Failed to start GitHub connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to GitHub');
      setConnecting(false);
    }
  };

  const handleSetRepo = async (repoFullName: string) => {
    try {
      setSettingRepo(true);
      setError(null);
      await acs.github.setRepo(repoFullName);
      // Reload status to get updated repo info
      await loadStatus();
      setShowRepoSelect(false);
    } catch (err) {
      console.error('Failed to set repository:', err);
      setError(err instanceof Error ? err.message : 'Failed to set repository');
    } finally {
      setSettingRepo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Loading GitHub status...</span>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/20 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400">{error}</span>
        <button
          onClick={loadStatus}
          className="ml-2 text-xs text-red-300 hover:text-red-200 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="space-y-2">
        <motion.button
          onClick={handleConnect}
          disabled={connecting}
          className={`
            group relative px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
            ${connecting 
              ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
            }
          `}
          whileHover={!connecting ? { scale: 1.02 } : {}}
          whileTap={!connecting ? { scale: 0.95 } : {}}
        >
          {connecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Github className="w-4 h-4" />
          )}
          <span>
            {connecting ? 'Connecting...' : 'Connect GitHub'}
          </span>
        </motion.button>
        
        {error && (
          <div className="text-xs text-red-400 px-2">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-500/20 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-400">GitHub Connected</span>
      </div>

      {/* Repository Selection */}
      <div className="relative">
        <button
          onClick={() => setShowRepoSelect(!showRepoSelect)}
          disabled={settingRepo}
          className={`
            w-full flex items-center justify-between px-4 py-2 rounded-lg font-medium text-sm transition-all
            ${settingRepo 
              ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
            }
          `}
        >
          <span className="truncate">
            {status.repo ? `Repository: ${status.repo}` : 'Select Repository'}
          </span>
          <div className="flex items-center gap-1">
            {settingRepo && <Loader2 className="w-3 h-3 animate-spin" />}
            <ChevronDown className={`w-4 h-4 transition-transform ${showRepoSelect ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Repository Dropdown */}
        {showRepoSelect && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {repos.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">
                No repositories found
              </div>
            ) : (
              repos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => handleSetRepo(repo.full_name)}
                  className={`
                    w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors
                    ${status.repo === repo.full_name ? 'bg-gray-700 text-blue-400' : 'text-gray-300'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{repo.full_name}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {repo.private && <span>Private</span>}
                      <span>{repo.default_branch}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-400 px-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default GitHubConnectPanel;