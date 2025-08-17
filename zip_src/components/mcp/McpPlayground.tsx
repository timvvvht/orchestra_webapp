/**
 * MCP Playground - Main Component
 * 
 * Comprehensive test interface for MCP server management, tool discovery,
 * OAuth flow testing, and schema compilation preview.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Zap, 
  Search, 
  Download, 
  Upload,
  Settings,
  Eye,
  Code,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Server,
  Key,
  FileText,
  Copy,
  ExternalLink,
  Package,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  useMcpServerStore, 
  useServerInstances, 
  useRunningServers,
  useServerById,
  useServerConfigById,
  useServerTools,
  useOAuthState,
  useServerTokens,
  useInstallationState
} from '../../stores/mcpServerStore';
import { 
  McpServerConfig, 
  McpServerStatus, 
  McpToolDefinition,
  McpAuthType
} from '@/services/mcp/types';
import type { ToolSpec } from '@/utils/registerSessionTools';
import { useMcpServerManagementStore } from '../../stores/mcpServerManagementStore';
import McpServerList from './McpServerList';
import AddServerModal from './AddServerModal';
import { addSampleServer } from '../../data/sampleMcpServers';
import './McpPlayground.css';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface PlaygroundTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

interface ServerCardProps {
  serverId: string;
  onSelect: (id: string) => void;
  isSelected: boolean;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

interface ToolPreviewProps {
  tools: McpToolDefinition[];
  serverId: string;
}

interface SchemaPreviewProps {
  toolSpecs: ToolSpec[];
}

// ============================================================================
// INSTALLATION STATE INDICATOR
// ============================================================================

const InstallationStateIndicator: React.FC<{ state: 'idle' | 'installing' | 'installed' | 'failed' }> = ({ state }) => {
  const getStateConfig = (state: 'idle' | 'installing' | 'installed' | 'failed') => {
    switch (state) {
      case 'idle':
        return { icon: Package, color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Not Installed' };
      case 'installing':
        return { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Installing...', spin: true };
      case 'installed':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Installed' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed' };
      default:
        return { icon: Package, color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Unknown' };
    }
  };

  const { icon: Icon, color, bg, label, spin } = getStateConfig(state);

  return (
    <div className={clsx('flex items-center gap-2 px-2 py-1 rounded-md', bg)}>
      <Icon className={clsx('w-4 h-4', color, spin && 'animate-spin')} />
      <span className={clsx('text-sm font-medium', color)}>
        {label}
      </span>
    </div>
  );
};

// ============================================================================
// SERVER STATUS INDICATOR
// ============================================================================

const ServerStatusIndicator: React.FC<{ status: McpServerStatus }> = ({ status }) => {
  const getStatusConfig = (status: McpServerStatus) => {
    switch (status) {
      case McpServerStatus.RUNNING:
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' };
      case McpServerStatus.STOPPED:
        return { icon: Square, color: 'text-gray-400', bg: 'bg-gray-400/10' };
      case McpServerStatus.STARTING:
        return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
      case McpServerStatus.ERROR:
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' };
      case McpServerStatus.AUTHENTICATING:
        return { icon: Key, color: 'text-blue-400', bg: 'bg-blue-400/10' };
      case McpServerStatus.STOPPING:
        return { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-400/10' };
      default:
        return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10' };
    }
  };

  const { icon: Icon, color, bg } = getStatusConfig(status);

  return (
    <div className={clsx('flex items-center gap-2 px-2 py-1 rounded-md', bg)}>
      <Icon className={clsx('w-4 h-4', color)} />
      <span className={clsx('text-sm font-medium capitalize', color)}>
        {status}
      </span>
    </div>
  );
};

// ============================================================================
// SERVER CARD COMPONENT
// ============================================================================

const ServerCard: React.FC<ServerCardProps> = ({ serverId, onSelect, isSelected, onToast }) => {
  const server = useServerById(serverId);
  const config = useServerConfigById(serverId);
  const tools = useServerTools(serverId);
  const oauthState = useOAuthState(serverId);
  const tokens = useServerTokens(serverId);
  const installationState = useInstallationState(serverId);
  const { startServer, stopServer, restartServer, discoverTools, installAndStartServer } = useMcpServerStore();

  if (!server || !config) {
    return null;
  }

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await startServer(serverId);
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await stopServer(serverId);
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  const handleRestart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await restartServer(serverId);
    } catch (error) {
      console.error('Failed to restart server:', error);
    }
  };

  const handleDiscoverTools = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await discoverTools(serverId);
    } catch (error) {
      console.error('Failed to discover tools:', error);
    }
  };

  const handleInstallAndStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await installAndStartServer(serverId);
      onToast?.(`Successfully installed and started ${config.name}`, 'success');
    } catch (error) {
      console.error('Failed to install and start server:', error);
      onToast?.(`Failed to install ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      )}
      onClick={() => onSelect(serverId)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-medium text-white">{config.name}</h3>
            <p className="text-sm text-gray-400">{serverId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InstallationStateIndicator state={installationState} />
          <ServerStatusIndicator status={server.status} />
        </div>
      </div>

      {/* Server Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Port:</span>
          <span className="text-white">{server.port || 'Auto'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Auth:</span>
          <span className="text-white capitalize">{config.authType}</span>
          {config.authType === 'oauth' && tokens && (
            <CheckCircle className="w-4 h-4 text-green-400" />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Tools:</span>
          <span className="text-white">{tools.length}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Install & Start button - shown when server is stopped and not installed */}
        {server.status === McpServerStatus.STOPPED && installationState !== 'installed' && (
          <button
            onClick={handleInstallAndStart}
            disabled={installationState === 'installing'}
            className={clsx(
              "flex items-center gap-1 px-3 py-1.5 text-white text-sm rounded-md transition-colors",
              installationState === 'installing'
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {installationState === 'installing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            {installationState === 'installing' ? 'Installing...' : 'Install & Start'}
          </button>
        )}

        {/* Regular Start button - shown when server is stopped and already installed */}
        {server.status === McpServerStatus.STOPPED && installationState === 'installed' && (
          <button
            onClick={handleStart}
            disabled={installationState === 'installing'}
            className={clsx(
              "flex items-center gap-1 px-3 py-1.5 text-white text-sm rounded-md transition-colors",
              installationState === 'installing'
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        )}
        
        {/* Running server actions */}
        {server.status === McpServerStatus.RUNNING && (
          <>
            <button
              onClick={handleStop}
              disabled={installationState === 'installing'}
              className={clsx(
                "flex items-center gap-1 px-3 py-1.5 text-white text-sm rounded-md transition-colors",
                installationState === 'installing'
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
            <button
              onClick={handleRestart}
              disabled={installationState === 'installing'}
              className={clsx(
                "flex items-center gap-1 px-3 py-1.5 text-white text-sm rounded-md transition-colors",
                installationState === 'installing'
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </button>
            <button
              onClick={handleDiscoverTools}
              disabled={installationState === 'installing'}
              className={clsx(
                "flex items-center gap-1 px-3 py-1.5 text-white text-sm rounded-md transition-colors",
                installationState === 'installing'
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              )}
            >
              <Search className="w-4 h-4" />
              Discover
            </button>
          </>
        )}

        {/* Retry button for failed installations */}
        {installationState === 'failed' && (
          <button
            onClick={handleInstallAndStart}
            className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Install
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// TOOL PREVIEW COMPONENT
// ============================================================================

const ToolPreview: React.FC<ToolPreviewProps> = ({ tools, serverId }) => {
  const [selectedTool, setSelectedTool] = useState<McpToolDefinition | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Discovered Tools</h3>
        <span className="text-sm text-gray-400">{tools.length} tools</span>
      </div>

      {tools.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No tools discovered yet</p>
          <p className="text-sm">Start the server and click "Discover" to find tools</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tool List */}
          <div className="space-y-2">
            {tools.map((tool, index) => (
              <div
                key={`${tool.name}-${index}`}
                className={clsx(
                  'p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedTool?.name === tool.name
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                )}
                onClick={() => setSelectedTool(tool)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">{tool.name}</h4>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tool.metadata?.category && (
                      <span className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                        {tool.metadata.category}
                      </span>
                    )}
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tool Details */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700">
            {selectedTool ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-white">{selectedTool.name}</h4>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedTool, null, 2))}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Description</label>
                    <p className="text-sm text-gray-400 mt-1">{selectedTool.description}</p>
                  </div>

                  {selectedTool.metadata && (
                    <div>
                      <label className="text-sm font-medium text-gray-300">Metadata</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedTool.metadata.category && (
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                            {selectedTool.metadata.category}
                          </span>
                        )}
                        {selectedTool.metadata.tags?.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                        {selectedTool.metadata.version && (
                          <span className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded">
                            v{selectedTool.metadata.version}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-300">Input Schema</label>
                    <pre className="mt-1 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-64">
                      {JSON.stringify(selectedTool.inputSchema, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a tool to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SCHEMA PREVIEW COMPONENT
// ============================================================================

const SchemaPreview: React.FC<SchemaPreviewProps> = ({ toolSpecs }) => {
  const [showRaw, setShowRaw] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportSchema = () => {
    const dataStr = JSON.stringify(toolSpecs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `mcp-tools-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Final ToolSpec Preview</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              showRaw
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            {showRaw ? 'Show Summary' : 'Show Raw JSON'}
          </button>
          <button
            onClick={() => copyToClipboard(JSON.stringify(toolSpecs, null, 2))}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={exportSchema}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {toolSpecs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No tools available for preview</p>
          <p className="text-sm">Start some servers and discover tools to see the compiled schema</p>
        </div>
      ) : showRaw ? (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
          <pre className="text-xs text-gray-300 overflow-auto max-h-96">
            {JSON.stringify(toolSpecs, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{toolSpecs.length}</p>
                  <p className="text-sm text-gray-400">Total Tools</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {new Set(toolSpecs.map(t => t.source)).size}
                  </p>
                  <p className="text-sm text-gray-400">MCP Servers</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {Math.round(JSON.stringify(toolSpecs).length / 1024)}
                  </p>
                  <p className="text-sm text-gray-400">KB Schema Size</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tool List */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h4 className="font-medium text-white">Available Tools</h4>
            </div>
            <div className="max-h-64 overflow-auto">
              {toolSpecs.map((tool, index) => (
                <div key={`${tool.name}-${index}`} className="p-3 border-b border-gray-700/50 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-white">{tool.name}</h5>
                      <p className="text-sm text-gray-400 line-clamp-1">{tool.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.source && (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                          {tool.source}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {Object.keys(tool.input_schema.properties || {}).length} params
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN PLAYGROUND COMPONENT
// ============================================================================

const McpPlayground: React.FC = () => {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([]);
  const hasAutoselected = useRef(false);
  
  const serverInstances = useServerInstances();
  const runningServers = useRunningServers();
  const selectedServer = selectedServerId ? useServerById(selectedServerId) : null;
  const selectedServerTools = selectedServerId ? useServerTools(selectedServerId) : [];
  const { getAllToolSpecs, refreshAllServers, refreshAllTools } = useMcpServerStore();
  
  // New server management store
  const { isAddServerModalOpen, closeAddServerModal } = useMcpServerManagementStore();
  
  const allToolSpecs = getAllToolSpecs();

  // Toast functions
  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Auto-select first server if none selected
  const firstServerId = serverInstances[0]?.config.id;
  useEffect(() => {
    if (!hasAutoselected.current && firstServerId) {
      setSelectedServerId(firstServerId);
      hasAutoselected.current = true;
    }
  }, [firstServerId]);

  // Refresh data on mount
  useEffect(() => {
    refreshAllServers();
    refreshAllTools();
    
    // auto-add Dynamic Demo on first mount if it's not present
    addSampleServer('Dynamic Demo').catch(() => {/* already exists or failed silently */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: PlaygroundTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Eye,
      component: () => (
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{serverInstances.length}</p>
                  <p className="text-sm text-gray-400">Total Servers</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{runningServers.length}</p>
                  <p className="text-sm text-gray-400">Running</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{allToolSpecs.length}</p>
                  <p className="text-sm text-gray-400">Available Tools</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <Key className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {serverInstances.filter(s => s.config.authType === 'oauth').length}
                  </p>
                  <p className="text-sm text-gray-400">OAuth Servers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Server List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">MCP Servers</h3>
            {serverInstances.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No MCP servers configured</p>
                <p className="text-sm">Add server configurations to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {serverInstances.map(server => (
                  <ServerCard
                    key={server.config.id}
                    serverId={server.config.id}
                    onSelect={setSelectedServerId}
                    isSelected={selectedServerId === server.config.id}
                    onToast={addToast}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'tools',
      label: 'Tool Discovery',
      icon: Search,
      component: () => (
        <ToolPreview 
          tools={selectedServerTools} 
          serverId={selectedServerId || ''} 
        />
      )
    },
    {
      id: 'schema',
      label: 'Schema Preview',
      icon: Code,
      component: () => (
        <SchemaPreview toolSpecs={allToolSpecs} />
      )
    }
  ];

  // Toast component
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm",
            toast.type === 'success'
              ? "bg-green-900/90 border-green-700 text-green-100"
              : "bg-red-900/90 border-red-700 text-red-100"
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mcp-playground">
      {/* Header */}
      <div className="playground-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">MCP Playground</h1>
              <p className="text-gray-400">Test and debug MCP server integrations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshAllServers()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Refresh
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative',
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
      <div className="playground-content">
        {/* Server Management Panel */}
        <div className="server-management-panel">
          <McpServerList />
        </div>

        {/* Server Details Panel */}
        <div className="server-details-panel">
          {tabs.find(tab => tab.id === activeTab)?.component()}
        </div>
      </div>

      {/* Add Server Modal */}
      <AddServerModal 
        isOpen={isAddServerModalOpen} 
        onClose={closeAddServerModal} 
      />

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default McpPlayground;