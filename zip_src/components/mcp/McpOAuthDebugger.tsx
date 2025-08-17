/**
 * MCP OAuth Flow Debugger
 * 
 * Step-by-step OAuth flow visualization with PKCE parameter inspection,
 * token display with expiration tracking, and authorization URL testing.
 */

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  EyeOff,
  Play,
  Square,
  RotateCcw,
  Shield,
  Lock,
  Unlock,
  Globe,
  Code,
  FileText,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  useMcpServerStore, 
  useServerInstances, 
  useServerById,
  useServerConfigById,
  useOAuthState,
  useServerTokens
} from '@/stores/mcpServerStore';
import { 
  McpOAuthConfig, 
  McpOAuthTokens, 
  McpServerConfig,
  MCP_PROVIDER_PRESETS 
} from '@/services/mcp/types';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface McpOAuthDebuggerProps {
  className?: string;
}

interface OAuthFlowStepProps {
  step: OAuthFlowStep;
  isActive: boolean;
  isCompleted: boolean;
  onExecute?: () => void;
}

interface TokenDisplayProps {
  tokens: McpOAuthTokens | undefined;
  serverId: string;
}

interface PKCEInspectorProps {
  config: McpOAuthConfig;
  serverId: string;
}

interface OAuthFlowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  details?: string;
  data?: any;
}

// ============================================================================
// OAUTH FLOW STEP COMPONENT
// ============================================================================

const OAuthFlowStep: React.FC<OAuthFlowStepProps> = ({ 
  step, 
  isActive, 
  isCompleted, 
  onExecute 
}) => {
  const [isExpanded, setIsExpanded] = useState(isActive);

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed': return CheckCircle;
      case 'error': return XCircle;
      case 'active': return Clock;
      default: return Clock;
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'active': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={clsx('w-5 h-5', getStatusColor())} />
            <div>
              <h4 className="font-medium text-white">{step.title}</h4>
              <p className="text-sm text-gray-400">{step.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onExecute && step.status === 'pending' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExecute();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                <Play className="w-4 h-4" />
                Execute
              </button>
            )}
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700">
          <div className="mt-4 space-y-3">
            {step.details && (
              <div>
                <label className="text-sm font-medium text-gray-300">Details</label>
                <p className="text-sm text-gray-400 mt-1">{step.details}</p>
              </div>
            )}
            
            {step.data && (
              <div>
                <label className="text-sm font-medium text-gray-300">Data</label>
                <pre className="mt-1 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-32">
                  {JSON.stringify(step.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TOKEN DISPLAY COMPONENT
// ============================================================================

const TokenDisplay: React.FC<TokenDisplayProps> = ({ tokens, serverId }) => {
  const [showTokens, setShowTokens] = useState(false);
  const { refreshToken } = useMcpServerStore();

  if (!tokens) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No tokens available</p>
        <p className="text-sm">Complete the OAuth flow to see tokens</p>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isExpired = tokens.expiresAt && Date.now() > tokens.expiresAt;
  const isExpiringSoon = tokens.expiresAt && Date.now() > (tokens.expiresAt - 300000); // 5 minutes

  const formatExpiry = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = timestamp - now.getTime();
    
    if (diff < 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const handleRefreshToken = async () => {
    try {
      await refreshToken(serverId);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-green-400" />
          Access Tokens
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTokens(!showTokens)}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              showTokens
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showTokens ? 'Hide' : 'Show'} Tokens
          </button>
          {tokens.refreshToken && (
            <button
              onClick={handleRefreshToken}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Token Status */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-3 h-3 rounded-full',
              isExpired ? 'bg-red-400' : isExpiringSoon ? 'bg-yellow-400' : 'bg-green-400'
            )} />
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className={clsx(
                'font-medium',
                isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-green-400'
              )}>
                {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Valid'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Expires In</p>
              <p className="font-medium text-white">
                {tokens.expiresAt ? formatExpiry(tokens.expiresAt) : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Token Type</p>
              <p className="font-medium text-white capitalize">{tokens.tokenType}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Details */}
      <div className="space-y-3">
        {/* Access Token */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">Access Token</label>
            <button
              onClick={() => copyToClipboard(tokens.accessToken)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <div className="font-mono text-sm text-gray-300 bg-gray-900 rounded p-3 break-all">
            {showTokens ? tokens.accessToken : '•'.repeat(40)}
          </div>
        </div>

        {/* Refresh Token */}
        {tokens.refreshToken && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Refresh Token</label>
              <button
                onClick={() => copyToClipboard(tokens.refreshToken!)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="font-mono text-sm text-gray-300 bg-gray-900 rounded p-3 break-all">
              {showTokens ? tokens.refreshToken : '•'.repeat(40)}
            </div>
          </div>
        )}

        {/* Token Metadata */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h5 className="text-sm font-medium text-gray-300 mb-3">Token Metadata</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Obtained At:</span>
              <span className="text-white">
                {new Date(tokens.obtainedAt).toLocaleString()}
              </span>
            </div>
            {tokens.expiresIn && (
              <div className="flex justify-between">
                <span className="text-gray-400">Expires In:</span>
                <span className="text-white">{tokens.expiresIn} seconds</span>
              </div>
            )}
            {tokens.scope && (
              <div className="flex justify-between">
                <span className="text-gray-400">Scope:</span>
                <span className="text-white">{tokens.scope}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PKCE INSPECTOR COMPONENT
// ============================================================================

const PKCEInspector: React.FC<PKCEInspectorProps> = ({ config, serverId }) => {
  const [mockPKCEData, setMockPKCEData] = useState<any>(null);

  useEffect(() => {
    if (config.usePKCE) {
      // Generate mock PKCE data for demonstration
      setMockPKCEData({
        codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        codeChallengeMethod: config.codeChallengeMethod || 'S256',
        state: 'xcoiv98y2kd22vusuye3kch'
      });
    }
  }, [config]);

  if (!config.usePKCE) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>PKCE not enabled</p>
        <p className="text-sm">This server doesn't use PKCE for OAuth</p>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          PKCE Parameters
        </h4>
        <span className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">
          Enabled
        </span>
      </div>

      {mockPKCEData && (
        <div className="space-y-3">
          {/* Code Verifier */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Code Verifier</label>
              <button
                onClick={() => copyToClipboard(mockPKCEData.codeVerifier)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="font-mono text-sm text-gray-300 bg-gray-900 rounded p-3 break-all">
              {mockPKCEData.codeVerifier}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Cryptographically random string (43-128 characters)
            </p>
          </div>

          {/* Code Challenge */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Code Challenge</label>
              <button
                onClick={() => copyToClipboard(mockPKCEData.codeChallenge)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="font-mono text-sm text-gray-300 bg-gray-900 rounded p-3 break-all">
              {mockPKCEData.codeChallenge}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Base64URL-encoded SHA256 hash of the code verifier
            </p>
          </div>

          {/* Challenge Method */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Challenge Method</label>
              <span className={clsx(
                'px-2 py-1 text-xs rounded',
                mockPKCEData.codeChallengeMethod === 'S256'
                  ? 'bg-green-600/20 text-green-300'
                  : 'bg-yellow-600/20 text-yellow-300'
              )}>
                {mockPKCEData.codeChallengeMethod}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {mockPKCEData.codeChallengeMethod === 'S256' 
                ? 'SHA256 hash (recommended for security)'
                : 'Plain text (less secure, not recommended)'
              }
            </p>
          </div>

          {/* State Parameter */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">State Parameter</label>
              <button
                onClick={() => copyToClipboard(mockPKCEData.state)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="font-mono text-sm text-gray-300 bg-gray-900 rounded p-3 break-all">
              {mockPKCEData.state}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Random string to prevent CSRF attacks
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN OAUTH DEBUGGER COMPONENT
// ============================================================================

const McpOAuthDebugger: React.FC<McpOAuthDebuggerProps> = ({ className }) => {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('flow');
  
  const serverInstances = useServerInstances();
  const selectedServer = selectedServerId ? useServerById(selectedServerId) : null;
  const selectedConfig = selectedServerId ? useServerConfigById(selectedServerId) : null;
  const oauthState = selectedServerId ? useOAuthState(selectedServerId) : 'idle';
  const tokens = selectedServerId ? useServerTokens(selectedServerId) : undefined;
  const { startOAuthFlow } = useMcpServerStore();

  // Filter servers with OAuth configuration
  const oauthServers = serverInstances.filter(server => 
    server.config.authType === 'oauth' && server.config.oauthConfig
  );

  // Auto-select first OAuth server
  useEffect(() => {
    if (!selectedServerId && oauthServers.length > 0) {
      setSelectedServerId(oauthServers[0].config.id);
    }
  }, [selectedServerId, oauthServers]);

  // Generate OAuth flow steps
  const generateFlowSteps = (): OAuthFlowStep[] => {
    if (!selectedConfig?.oauthConfig) return [];

    return [
      {
        id: 'generate-params',
        title: 'Generate PKCE Parameters',
        description: 'Create code verifier, challenge, and state parameters',
        status: oauthState === 'idle' ? 'pending' : 'completed',
        details: 'Generate cryptographically secure random strings for PKCE flow',
        data: selectedConfig.oauthConfig.usePKCE ? {
          usePKCE: true,
          codeChallengeMethod: selectedConfig.oauthConfig.codeChallengeMethod
        } : null
      },
      {
        id: 'build-auth-url',
        title: 'Build Authorization URL',
        description: 'Construct the OAuth authorization URL with parameters',
        status: oauthState === 'idle' ? 'pending' : 'completed',
        details: 'Include client_id, redirect_uri, scope, state, and PKCE parameters',
        data: {
          authorizationUrl: selectedConfig.oauthConfig.authorizationUrl,
          clientId: selectedConfig.oauthConfig.clientId,
          scopes: selectedConfig.oauthConfig.scopes
        }
      },
      {
        id: 'user-authorization',
        title: 'User Authorization',
        description: 'User grants permission in browser',
        status: oauthState === 'authorizing' ? 'active' : 
               oauthState === 'exchanging' || oauthState === 'completed' ? 'completed' : 'pending',
        details: 'User is redirected to authorization server to grant permissions'
      },
      {
        id: 'receive-callback',
        title: 'Receive Authorization Code',
        description: 'Handle the OAuth callback with authorization code',
        status: oauthState === 'exchanging' ? 'active' :
               oauthState === 'completed' ? 'completed' : 'pending',
        details: 'Authorization server redirects back with code and state parameters'
      },
      {
        id: 'exchange-token',
        title: 'Exchange Code for Tokens',
        description: 'Trade authorization code for access and refresh tokens',
        status: oauthState === 'completed' ? 'completed' : 'pending',
        details: 'Send code, code_verifier, and client credentials to token endpoint'
      }
    ];
  };

  const flowSteps = generateFlowSteps();

  const handleStartOAuthFlow = async () => {
    if (!selectedServerId) return;
    
    try {
      await startOAuthFlow(selectedServerId);
    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
    }
  };

  const tabs = [
    { id: 'flow', label: 'OAuth Flow', icon: ArrowRight },
    { id: 'tokens', label: 'Tokens', icon: Key },
    { id: 'pkce', label: 'PKCE', icon: Shield }
  ];

  return (
    <div className={clsx('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex-shrink-0 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <Key className="w-6 h-6 text-blue-400" />
            OAuth Debugger
          </h2>
          
          <select
            value={selectedServerId || ''}
            onChange={(e) => setSelectedServerId(e.target.value || null)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select OAuth Server</option>
            {oauthServers.map(server => (
              <option key={server.config.id} value={server.config.id}>
                {server.config.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!selectedServerId ? (
          <div className="text-center py-16 text-gray-400">
            <Key className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select an OAuth server</p>
            <p className="text-sm">Choose a server with OAuth configuration to debug</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'flow' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">OAuth Flow Steps</h3>
                  <button
                    onClick={handleStartOAuthFlow}
                    disabled={oauthState !== 'idle'}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                      oauthState === 'idle'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    <Play className="w-4 h-4" />
                    Start OAuth Flow
                  </button>
                </div>
                
                <div className="space-y-3">
                  {flowSteps.map((step, index) => (
                    <OAuthFlowStep
                      key={step.id}
                      step={step}
                      isActive={step.status === 'active'}
                      isCompleted={step.status === 'completed'}
                      onExecute={index === 0 ? handleStartOAuthFlow : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tokens' && (
              <TokenDisplay tokens={tokens} serverId={selectedServerId} />
            )}

            {activeTab === 'pkce' && selectedConfig?.oauthConfig && (
              <PKCEInspector config={selectedConfig.oauthConfig} serverId={selectedServerId} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default McpOAuthDebugger;