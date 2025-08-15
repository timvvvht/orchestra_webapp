/**
 * GlobalServiceMonitor - Real-time monitoring of global services
 * 
 * Displays:
 * - Local Tool Orchestrator status
 * - ACS Firehose connection status
 * - Health metrics and performance data
 * - Error information and recovery status
 */

import React, { useState, useEffect } from 'react';
import { globalServiceManager } from '@/services/GlobalServiceManager';

interface ServiceStatus {
  isRunning: boolean;
  isHealthy: boolean;
  reconnectAttempts: number;
  lastHealthCheck: number;
  uptime: number;
  errorCount?: number;
  lastError?: string;
}

interface GlobalStatus {
  isInitialized: boolean;
  orchestrator: ServiceStatus;
  firehose: {
    isConnected: boolean;
    connectionType: string;
    reconnectAttempts: number;
  };
  timestamp: number;
}

export const GlobalServiceMonitor: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const [status, setStatus] = useState<GlobalStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const updateStatus = () => {
      try {
        const currentStatus = globalServiceManager.getStatus();
        setStatus(currentStatus);
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Failed to get global service status:', error);
      }
    };

    // Update immediately
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible || !status) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = (isHealthy: boolean, isRunning: boolean) => {
    if (isHealthy && isRunning) return '🟢';
    if (isRunning && !isHealthy) return '🟡';
    return '🔴';
  };

  const handleRestart = async () => {
    try {
      console.log('🔄 Manual service restart requested...');
      await globalServiceManager.restart();
    } catch (error) {
      console.error('Failed to restart services:', error);
    }
  };

  const handleForceHealthCheck = () => {
    try {
      const orchestrator = (globalServiceManager as any).orchestrator;
      if (orchestrator?.forceHealthCheck) {
        orchestrator.forceHealthCheck();
      }
    } catch (error) {
      console.error('Failed to force health check:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg shadow-lg font-mono text-xs max-w-md">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold text-sm">🌐 Global Services</h3>
        <span className="text-xs opacity-60">
          {isExpanded ? '▼' : '▶'} {formatTime(lastUpdate)}
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {/* Orchestrator Status */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getStatusIcon(status.orchestrator.isHealthy, status.orchestrator.isRunning)}
            <span>Orchestrator</span>
          </span>
          <span className="text-xs opacity-60">
            {formatDuration(status.orchestrator.uptime)}
          </span>
        </div>

        {/* Firehose Status */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {status.firehose.isConnected ? '🟢' : '🔴'}
            <span>Firehose</span>
          </span>
          <span className="text-xs opacity-60">
            {status.firehose.connectionType}
          </span>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
            {/* Orchestrator Details */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-blue-300">🔧 Orchestrator Details</div>
              <div className="pl-2 space-y-1 text-xs">
                <div>Running: {status.orchestrator.isRunning ? '✅' : '❌'}</div>
                <div>Healthy: {status.orchestrator.isHealthy ? '✅' : '❌'}</div>
                <div>Reconnects: {status.orchestrator.reconnectAttempts}</div>
                <div>Last Check: {formatTime(status.orchestrator.lastHealthCheck)}</div>
                {status.orchestrator.errorCount !== undefined && (
                  <div>Errors: {status.orchestrator.errorCount}</div>
                )}
                {status.orchestrator.lastError && (
                  <div className="text-red-300 break-words">
                    Error: {status.orchestrator.lastError}
                  </div>
                )}
              </div>
            </div>

            {/* Firehose Details */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-green-300">🔥 Firehose Details</div>
              <div className="pl-2 space-y-1 text-xs">
                <div>Connected: {status.firehose.isConnected ? '✅' : '❌'}</div>
                <div>Type: {status.firehose.connectionType}</div>
                <div>Reconnects: {status.firehose.reconnectAttempts}</div>
              </div>
            </div>

            {/* System Info */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-purple-300">⚙️ System</div>
              <div className="pl-2 space-y-1 text-xs">
                <div>Initialized: {status.isInitialized ? '✅' : '❌'}</div>
                <div>Last Update: {formatTime(lastUpdate)}</div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="pt-2 border-t border-white/20 space-y-2">
              <button
                onClick={handleRestart}
                className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                🔄 Restart Services
              </button>
              <button
                onClick={handleForceHealthCheck}
                className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
              >
                🏥 Force Health Check
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Summary */}
      {!isExpanded && (
        <div className="mt-2 text-xs opacity-60">
          {status.isInitialized ? '✅' : '❌'} Init | 
          {status.orchestrator.isHealthy ? '✅' : '❌'} LTO | 
          {status.firehose.isConnected ? '✅' : '❌'} SSE
        </div>
      )}
    </div>
  );
};

export default GlobalServiceMonitor;
