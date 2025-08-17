/**
 * MCP Server List Component
 * 
 * Displays the list of available MCP servers with their status,
 * installation state, and action buttons.
 */

import React, { useState } from 'react';
import { useMcpServerManagementStore } from '../../stores/mcpServerManagementStore';
import { McpServerConfig, McpServerStatus, McpServerInstance } from '../../services/mcp/types';

interface McpServerCardProps {
  server: McpServerConfig;
  instance?: McpServerInstance;
  isRunning: boolean;
  installationState: 'idle' | 'installing' | 'installed' | 'failed';
  onInstallAndStart: () => void;
  onStop: () => void;
  onRemove: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

const McpServerCard: React.FC<McpServerCardProps> = ({
  server,
  instance,
  isRunning,
  installationState,
  onInstallAndStart,
  onStop,
  onRemove,
  onSelect,
  isSelected
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isDiscoveringTools, setIsDiscoveringTools] = useState(false);
  
  const { probeServerHealth, discoverServerTools, getServerTools } = useMcpServerManagementStore();
  const getStatusColor = () => {
    if (isRunning) return 'bg-green-500';
    if (installationState === 'installing') return 'bg-yellow-500';
    if (installationState === 'failed') return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (isRunning) return 'Running';
    if (installationState === 'installing') return 'Installing...';
    if (installationState === 'failed') return 'Failed';
    if (installationState === 'installed') return 'Installed';
    return 'Stopped';
  };

  const getHealthStatusColor = () => {
    if (!instance) return 'bg-gray-400';
    switch (instance.healthStatus) {
      case 'healthy': return 'bg-green-500';
      case 'unreachable': return 'bg-red-500';
      case 'unknown': 
      default: return 'bg-gray-400';
    }
  };

  const getHealthStatusText = () => {
    if (!instance) return 'Unknown';
    switch (instance.healthStatus) {
      case 'healthy': return 'Healthy';
      case 'unreachable': return 'Unreachable';
      case 'unknown':
      default: return 'Unknown';
    }
  };

  const handleCheckHealth = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCheckingHealth(true);
    try {
      await probeServerHealth(server.id);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleDiscoverTools = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDiscoveringTools(true);
    try {
      await discoverServerTools(server.id);
    } catch (error) {
      console.error('Tool discovery failed:', error);
    } finally {
      setIsDiscoveringTools(false);
    }
  };

  const serverTools = getServerTools(server.id);

  const canStart = !isRunning && installationState !== 'installing';
  const canStop = isRunning;

  return (
    <div className={`mcp-server-card ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="server-header">
        <div className="server-info">
          <h3 className="server-name">{server.name}</h3>
          <div className="server-meta">
            <span className="server-type">{server.execPath}</span>
            <div className={`status-dot ${getStatusColor()}`}></div>
            <span className="status-text">{getStatusText()}</span>
            
            {/* Health Status */}
            {isRunning && (
              <>
                <div className={`status-dot ${getHealthStatusColor()}`}></div>
                <span className="health-status-text">{getHealthStatusText()}</span>
              </>
            )}
            
            {/* Port Information */}
            {instance?.actualPort && (
              <span className="port-info">Port: {instance.actualPort}</span>
            )}
          </div>
        </div>
        
        <div className="server-actions">
          {canStart && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onInstallAndStart();
              }}
              disabled={installationState === 'installing'}
            >
              {installationState === 'installed' ? 'Start' : 'Install & Start'}
            </button>
          )}
          
          {canStop && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onStop();
              }}
            >
              Stop
            </button>
          )}
          
          {/* Health Check Button */}
          {isRunning && (
            <button 
              className="btn btn-info btn-sm"
              onClick={handleCheckHealth}
              disabled={isCheckingHealth}
            >
              {isCheckingHealth ? 'Checking...' : 'Check Health'}
            </button>
          )}
          
          {/* Tool Discovery Button */}
          {isRunning && (
            <button 
              className="btn btn-success btn-sm"
              onClick={handleDiscoverTools}
              disabled={isDiscoveringTools}
            >
              {isDiscoveringTools ? 'Discovering...' : 'Discover Tools'}
            </button>
          )}
          
          <button 
            className="btn btn-danger btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remove server "${server.name}"?`)) {
                onRemove();
              }
            }}
          >
            Remove
          </button>
        </div>
      </div>
      
      {server.description && (
        <p className="server-description">{server.description}</p>
      )}
      
      <div className="server-details">
        <div className="server-command">
          <strong>Command:</strong> {server.execPath} {server.args?.join(' ')}
        </div>
        
        {server.tags && server.tags.length > 0 && (
          <div className="server-tags">
            {server.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      
      {/* Tool Information Section */}
      {isRunning && (
        <div className="tools-section">
          <div className="tools-header" onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}>
            <span className="tools-title">
              Tools ({serverTools.length})
              {instance?.discoveredAt && (
                <span className="discovery-time">
                  {' '}• Last discovered: {new Date(instance.discoveredAt).toLocaleTimeString()}
                </span>
              )}
            </span>
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          
          {isExpanded && (
            <div className="tools-list">
              {serverTools.length === 0 ? (
                <div className="no-tools">
                  <p>No tools discovered yet.</p>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={handleDiscoverTools}
                    disabled={isDiscoveringTools}
                  >
                    {isDiscoveringTools ? 'Discovering...' : 'Discover Tools'}
                  </button>
                </div>
              ) : (
                <div className="tool-items">
                  {serverTools.map((tool, index) => (
                    <div key={`${tool.name}-${index}`} className="tool-item">
                      <div className="tool-name">{tool.name}</div>
                      <div className="tool-description">{tool.description}</div>
                      {tool.metadata?.category && (
                        <span className="tool-category">{tool.metadata.category}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const McpServerList: React.FC = () => {
  const {
    servers,
    instances,
    installationStates,
    selectedServerId,
    installAndStartServer,
    stopServer,
    removeServer,
    selectServer,
    openAddServerModal
  } = useMcpServerManagementStore();

  const serverList = Array.from(servers.values());

  if (serverList.length === 0) {
    return (
      <div className="mcp-server-list empty">
        <div className="empty-state">
          <h3>No MCP Servers</h3>
          <p>Add your first MCP server to get started with the playground.</p>
          <button className="btn btn-primary" onClick={openAddServerModal}>
            Add MCP Server
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mcp-server-list">
      <div className="list-header">
        <h2>MCP Servers ({serverList.length})</h2>
        <button className="btn btn-primary" onClick={openAddServerModal}>
          Add Server
        </button>
      </div>
      
      <div className="server-cards">
        {serverList.map(server => {
          const instance = instances.get(server.id);
          const isRunning = instance?.status === McpServerStatus.RUNNING;
          const installationState = installationStates.get(server.id) || 'idle';
          
          return (
            <McpServerCard
              key={server.id}
              server={server}
              instance={instance}
              isRunning={isRunning}
              installationState={installationState}
              isSelected={selectedServerId === server.id}
              onInstallAndStart={() => installAndStartServer(server.id)}
              onStop={() => stopServer(server.id)}
              onRemove={() => removeServer(server.id)}
              onSelect={() => selectServer(server.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default McpServerList;