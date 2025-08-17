/**
 * MCP Server Lifecycle Monitor
 * 
 * Real-time server process monitoring with health indicators, port usage detection,
 * process logs viewer, performance metrics, and auto-refresh capabilities.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Server, 
  Cpu, 
  MemoryStick, 
  Clock, 
  Wifi, 
  WifiOff,
  Play,
  Square,
  RotateCcw,
  Pause,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Filter,
  Download,
  Trash2,
  Settings,
  RefreshCw,
  Zap,
  Network,
  HardDrive,
  Timer
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  useMcpServerStore, 
  useServerInstances, 
  useServerById 
} from '@/stores/mcpServerStore';
import { McpServerStatus } from '@/services/mcp/types';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface McpServerMonitorProps {
  className?: string;
}

interface ServerMetricsProps {
  serverId: string;
}

interface ProcessLogViewerProps {
  serverId: string;
  logs: LogEntry[];
  onClear: () => void;
}

interface PortMonitorProps {
  usedPorts: PortInfo[];
}

interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

interface PortInfo {
  port: number;
  serverId: string;
  status: 'active' | 'conflict' | 'available';
  process?: string;
}

interface PerformanceMetrics {
  serverId: string;
  startupTime?: number;
  responseTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  uptime?: number;
  requestCount?: number;
  errorCount?: number;
  lastHealthCheck?: number;
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const generateMockLogs = (serverId: string): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = Date.now();
  
  // Generate some sample log entries
  const messages = [
    { level: 'info' as const, message: `Server ${serverId} started successfully` },
    { level: 'info' as const, message: 'Listening for MCP connections' },
    { level: 'debug' as const, message: 'Tool discovery endpoint initialized' },
    { level: 'info' as const, message: 'Health check passed' },
    { level: 'warn' as const, message: 'High memory usage detected' },
    { level: 'debug' as const, message: 'Processing tool request' },
    { level: 'info' as const, message: 'Client connected' },
    { level: 'error' as const, message: 'Failed to process request: timeout' },
    { level: 'info' as const, message: 'Tool execution completed' },
    { level: 'debug' as const, message: 'Garbage collection triggered' }
  ];

  for (let i = 0; i < 20; i++) {
    const message = messages[Math.floor(Math.random() * messages.length)];
    logs.push({
      timestamp: now - (i * 30000) - Math.random() * 10000,
      ...message,
      source: `mcp-${serverId}`
    });
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

const generateMockMetrics = (serverId: string): PerformanceMetrics => {
  return {
    serverId,
    startupTime: Math.random() * 5000 + 1000, // 1-6 seconds
    responseTime: Math.random() * 200 + 50, // 50-250ms
    memoryUsage: Math.random() * 100 + 50, // 50-150MB
    cpuUsage: Math.random() * 30 + 5, // 5-35%
    uptime: Math.random() * 86400000 + 3600000, // 1-25 hours
    requestCount: Math.floor(Math.random() * 1000 + 100),
    errorCount: Math.floor(Math.random() * 10),
    lastHealthCheck: Date.now() - Math.random() * 60000 // Within last minute
  };
};

const generatePortInfo = (servers: any[]): PortInfo[] => {
  const ports: PortInfo[] = [];
  const usedPorts = new Set<number>();

  // Add ports from running servers
  servers.forEach(server => {
    if (server.port) {
      ports.push({
        port: server.port,
        serverId: server.config.id,
        status: server.status === McpServerStatus.RUNNING ? 'active' : 'available',
        process: `mcp-${server.config.id}`
      });
      usedPorts.add(server.port);
    }
  });

  // Add some mock conflicted ports
  for (let i = 8000; i < 8010; i++) {
    if (!usedPorts.has(i) && Math.random() > 0.7) {
      ports.push({
        port: i,
        serverId: 'unknown',
        status: Math.random() > 0.5 ? 'conflict' : 'available',
        process: Math.random() > 0.5 ? 'other-process' : undefined
      });
    }
  }

  return ports.sort((a, b) => a.port - b.port);
};

// ============================================================================
// PERFORMANCE METRICS COMPONENT
// ============================================================================

const ServerMetrics: React.FC<ServerMetricsProps> = ({ serverId }) => {
  const server = useServerById(serverId);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    if (server?.status === McpServerStatus.RUNNING) {
      setMetrics(generateMockMetrics(serverId));
      
      // Update metrics every 5 seconds
      const interval = setInterval(() => {
        setMetrics(generateMockMetrics(serverId));
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setMetrics(null);
    }
  }, [serverId, server?.status]);

  if (!metrics || server?.status !== McpServerStatus.RUNNING) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No metrics available</p>
        <p className="text-sm">Server must be running to show metrics</p>
      </div>
    );
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Uptime</p>
              <p className="text-lg font-semibold text-white">
                {formatUptime(metrics.uptime!)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-sm text-gray-400">Response Time</p>
              <p className="text-lg font-semibold text-white">
                {metrics.responseTime!.toFixed(0)}ms
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <MemoryStick className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Memory</p>
              <p className="text-lg font-semibold text-white">
                {formatBytes(metrics.memoryUsage! * 1024 * 1024)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-yellow-400" />
            <div>
              <p className="text-sm text-gray-400">CPU Usage</p>
              <p className="text-lg font-semibold text-white">
                {metrics.cpuUsage!.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Stats */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h4 className="font-medium text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Performance
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Startup Time</span>
              <span className="text-white">{metrics.startupTime!.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Requests Handled</span>
              <span className="text-white">{metrics.requestCount!.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Error Count</span>
              <span className={clsx(
                'font-medium',
                metrics.errorCount! > 5 ? 'text-red-400' : 'text-green-400'
              )}>
                {metrics.errorCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Last Health Check</span>
              <span className="text-white">
                {new Date(metrics.lastHealthCheck!).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h4 className="font-medium text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-green-400" />
            Resources
          </h4>
          <div className="space-y-4">
            {/* Memory Usage Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Memory Usage</span>
                <span className="text-white">{metrics.memoryUsage!.toFixed(1)} MB</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(metrics.memoryUsage! / 2, 100)}%` }}
                />
              </div>
            </div>

            {/* CPU Usage Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">CPU Usage</span>
                <span className="text-white">{metrics.cpuUsage!.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.cpuUsage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROCESS LOG VIEWER COMPONENT
// ============================================================================

const ProcessLogViewer: React.FC<ProcessLogViewerProps> = ({ 
  serverId, 
  logs, 
  onClear 
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => 
    filterLevel === 'all' || log.level === filterLevel
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return XCircle;
      case 'warn': return AlertTriangle;
      case 'info': return CheckCircle;
      case 'debug': return Eye;
      default: return Activity;
    }
  };

  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-${serverId}-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Log Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h4 className="font-medium text-white">Process Logs</h4>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors',
              autoScroll
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            {autoScroll ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Auto-scroll
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Log Display */}
      <div 
        ref={logContainerRef}
        className="bg-gray-900 rounded-lg border border-gray-700 p-4 h-64 overflow-auto font-mono text-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No logs available</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => {
              const LevelIcon = getLevelIcon(log.level);
              return (
                <div key={index} className="flex items-start gap-3 py-1">
                  <span className="text-gray-500 text-xs mt-0.5 w-20 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <LevelIcon className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', getLevelColor(log.level))} />
                  <span className={clsx('flex-1', getLevelColor(log.level))}>
                    {log.message}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PORT MONITOR COMPONENT
// ============================================================================

const PortMonitor: React.FC<PortMonitorProps> = ({ usedPorts }) => {
  const getPortStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'conflict': return 'text-red-400 bg-red-400/10';
      case 'available': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getPortStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Wifi;
      case 'conflict': return WifiOff;
      case 'available': return Network;
      default: return Network;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          Port Usage
        </h4>
        <span className="text-sm text-gray-400">
          {usedPorts.filter(p => p.status === 'active').length} active ports
        </span>
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-400">
            <span>Port</span>
            <span>Status</span>
            <span>Server</span>
            <span>Process</span>
          </div>
        </div>
        
        <div className="max-h-48 overflow-auto">
          {usedPorts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No port information available</p>
            </div>
          ) : (
            usedPorts.map((port, index) => {
              const StatusIcon = getPortStatusIcon(port.status);
              return (
                <div key={index} className="p-4 border-b border-gray-700/50 last:border-b-0">
                  <div className="grid grid-cols-4 gap-4 items-center text-sm">
                    <span className="font-mono text-white">{port.port}</span>
                    <div className={clsx(
                      'flex items-center gap-2 px-2 py-1 rounded text-xs w-fit',
                      getPortStatusColor(port.status)
                    )}>
                      <StatusIcon className="w-3 h-3" />
                      <span className="capitalize">{port.status}</span>
                    </div>
                    <span className="text-gray-300">{port.serverId}</span>
                    <span className="text-gray-400 font-mono text-xs">
                      {port.process || '-'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SERVER MONITOR COMPONENT
// ============================================================================

const McpServerMonitor: React.FC<McpServerMonitorProps> = ({ className }) => {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [logs, setLogs] = useState<Map<string, LogEntry[]>>(new Map());
  
  const serverInstances = useServerInstances();
  const { refreshAllServers } = useMcpServerStore();

  // Auto-select first running server
  useEffect(() => {
    const runningServers = serverInstances.filter(s => s.status === McpServerStatus.RUNNING);
    if (!selectedServerId && runningServers.length > 0) {
      setSelectedServerId(runningServers[0].config.id);
    }
  }, [selectedServerId, serverInstances]);

  // Generate mock logs for servers
  useEffect(() => {
    const newLogs = new Map<string, LogEntry[]>();
    serverInstances.forEach(server => {
      if (server.status === McpServerStatus.RUNNING) {
        newLogs.set(server.config.id, generateMockLogs(server.config.id));
      }
    });
    setLogs(newLogs);
  }, [serverInstances]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshAllServers();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshAllServers]);

  const portInfo = generatePortInfo(serverInstances);
  const selectedServerLogs = selectedServerId ? logs.get(selectedServerId) || [] : [];

  const clearLogs = () => {
    if (selectedServerId) {
      setLogs(prev => {
        const newLogs = new Map(prev);
        newLogs.set(selectedServerId, []);
        return newLogs;
      });
    }
  };

  return (
    <div className={clsx('h-full flex flex-col space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-400" />
          Server Monitor
        </h2>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedServerId || ''}
            onChange={(e) => setSelectedServerId(e.target.value || null)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select Server</option>
            {serverInstances
              .filter(s => s.status === McpServerStatus.RUNNING)
              .map(server => (
                <option key={server.config.id} value={server.config.id}>
                  {server.config.name}
                </option>
              ))
            }
          </select>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
              autoRefresh
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            <RefreshCw className={clsx('w-4 h-4', autoRefresh && 'animate-spin')} />
            Auto-refresh
          </button>

          <button
            onClick={() => refreshAllServers()}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
        {/* Left Column - Metrics and Port Monitor */}
        <div className="xl:col-span-2 space-y-6 overflow-auto">
          {/* Performance Metrics */}
          {selectedServerId ? (
            <ServerMetrics serverId={selectedServerId} />
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a running server</p>
              <p className="text-sm">Choose a server from the dropdown to view metrics</p>
            </div>
          )}

          {/* Port Monitor */}
          <PortMonitor usedPorts={portInfo} />
        </div>

        {/* Right Column - Process Logs */}
        <div className="overflow-auto">
          {selectedServerId ? (
            <ProcessLogViewer
              serverId={selectedServerId}
              logs={selectedServerLogs}
              onClear={clearLogs}
            />
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No server selected</p>
              <p className="text-sm">Select a server to view process logs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default McpServerMonitor;