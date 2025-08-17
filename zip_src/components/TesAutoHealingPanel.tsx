/**
 * React component for TES Manager Auto Healing control panel
 */

import React, { useState } from 'react';
import { useTesAutoHealing } from '../hooks/useTesAutoHealing';
import { AutoHealingConfig, HealingEvent } from '../types/tesAutoHealing';

interface TesAutoHealingPanelProps {
  /** Whether to show the full control panel or just status */
  mode?: 'full' | 'status' | 'compact';
  /** Custom CSS class */
  className?: string;
}

export const TesAutoHealingPanel: React.FC<TesAutoHealingPanelProps> = ({ 
  mode = 'full',
  className = ''
}) => {
  const {
    state,
    config,
    events,
    loading,
    error,
    updateHealingConfig,
    forceHealthCheck,
    restartServer,
    stopAutoHealing,
    refresh,
    clearEvents,
    utils,
  } = useTesAutoHealing();

  const [showConfig, setShowConfig] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AutoHealingConfig | null>(null);

  // Handle config form submission
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    try {
      await updateHealingConfig(editingConfig);
      setShowConfig(false);
      setEditingConfig(null);
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  // Start editing config
  const startEditingConfig = () => {
    if (config) {
      setEditingConfig({ ...config });
      setShowConfig(true);
    }
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    if (!state) return <div className="status-indicator unknown">Unknown</div>;

    const status = utils.getHealthStatus(state);
    const color = utils.getHealthStatusColor(state);
    
    return (
      <div className={`status-indicator ${color}`}>
        <div className={`status-dot ${color}`}></div>
        <span>{status}</span>
        {state.consecutive_failures > 0 && (
          <span className="failure-count">({state.consecutive_failures} failures)</span>
        )}
      </div>
    );
  };

  // Render uptime info
  const renderUptimeInfo = () => {
    if (!state) return null;

    return (
      <div className="uptime-info">
        <div className="uptime-item">
          <label>Uptime:</label>
          <span>{utils.formatUptime(state)}</span>
        </div>
        <div className="uptime-item">
          <label>Last Check:</label>
          <span>{utils.formatRelativeTime(state.last_health_check)}</span>
        </div>
        {state.total_restarts > 0 && (
          <div className="uptime-item">
            <label>Total Restarts:</label>
            <span>{state.total_restarts}</span>
          </div>
        )}
      </div>
    );
  };

  // Render action buttons
  const renderActionButtons = () => (
    <div className="action-buttons">
      <button 
        onClick={forceHealthCheck}
        disabled={loading}
        className="btn btn-secondary"
      >
        Check Health
      </button>
      <button 
        onClick={restartServer}
        disabled={loading}
        className="btn btn-warning"
      >
        Restart Server
      </button>
      <button 
        onClick={refresh}
        disabled={loading}
        className="btn btn-secondary"
      >
        Refresh
      </button>
    </div>
  );

  // Render configuration form
  const renderConfigForm = () => {
    if (!editingConfig) return null;

    return (
      <form onSubmit={handleConfigSubmit} className="config-form">
        <h4>Auto Healing Configuration</h4>
        
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={editingConfig.enabled}
              onChange={(e) => setEditingConfig({
                ...editingConfig,
                enabled: e.target.checked
              })}
            />
            Enable Auto Healing
          </label>
        </div>

        <div className="form-group">
          <label>Health Check Interval (seconds):</label>
          <input
            type="number"
            min="10"
            max="3600"
            value={editingConfig.health_check_interval_secs}
            onChange={(e) => setEditingConfig({
              ...editingConfig,
              health_check_interval_secs: parseInt(e.target.value) || 30
            })}
          />
        </div>

        <div className="form-group">
          <label>Health Check Timeout (seconds):</label>
          <input
            type="number"
            min="1"
            max="60"
            value={editingConfig.health_check_timeout_secs}
            onChange={(e) => setEditingConfig({
              ...editingConfig,
              health_check_timeout_secs: parseInt(e.target.value) || 10
            })}
          />
        </div>

        <div className="form-group">
          <label>Max Failures Before Restart:</label>
          <input
            type="number"
            min="1"
            max="10"
            value={editingConfig.max_failures_before_restart}
            onChange={(e) => setEditingConfig({
              ...editingConfig,
              max_failures_before_restart: parseInt(e.target.value) || 3
            })}
          />
        </div>

        <div className="form-group">
          <label>Max Restart Attempts:</label>
          <input
            type="number"
            min="1"
            max="20"
            value={editingConfig.max_restart_attempts}
            onChange={(e) => setEditingConfig({
              ...editingConfig,
              max_restart_attempts: parseInt(e.target.value) || 5
            })}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={editingConfig.emit_healing_events}
              onChange={(e) => setEditingConfig({
                ...editingConfig,
                emit_healing_events: e.target.checked
              })}
            />
            Emit Healing Events
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save</button>
          <button 
            type="button" 
            onClick={() => {
              setShowConfig(false);
              setEditingConfig(null);
            }}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  // Render events list
  const renderEventsList = () => (
    <div className="events-list">
      <div className="events-header">
        <h4>Recent Events</h4>
        <button onClick={clearEvents} className="btn btn-small">Clear</button>
      </div>
      <div className="events-container">
        {events.length === 0 ? (
          <div className="no-events">No events yet</div>
        ) : (
          events.map((event, index) => (
            <div key={index} className={`event-item ${event.type.toLowerCase()}`}>
              <div className="event-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
              <div className="event-content">
                {renderEventContent(event)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render individual event content
  const renderEventContent = (event: HealingEvent) => {
    switch (event.type) {
      case 'HealthCheckStarted':
        return 'Health check started';
      case 'HealthCheckPassed':
        return `Health check passed (${event.response_time_ms}ms)`;
      case 'HealthCheckFailed':
        return `Health check failed: ${event.error} (${event.consecutive_failures} consecutive)`;
      case 'RestartInitiated':
        return `Restart initiated (attempt ${event.attempt}): ${event.reason}`;
      case 'RestartCompleted':
        return `Restart ${event.success ? 'succeeded' : 'failed'} (${event.duration_ms}ms)`;
      case 'SessionRecoveryStarted':
        return `Session recovery started (${event.session_count} sessions)`;
      case 'SessionRecoveryCompleted':
        return `Session recovery completed (${event.recovered_sessions}/${event.recovered_sessions + event.failed_sessions})`;
      case 'HealingDisabled':
        return `Auto healing disabled: ${event.reason}`;
      default:
        return JSON.stringify(event);
    }
  };

  // Compact mode - just status indicator
  if (mode === 'compact') {
    return (
      <div className={`tes-auto-healing-compact ${className}`}>
        {renderStatusIndicator()}
      </div>
    );
  }

  // Status mode - status + basic info
  if (mode === 'status') {
    return (
      <div className={`tes-auto-healing-status ${className}`}>
        <div className="status-header">
          <h3>TES Server Status</h3>
          {renderStatusIndicator()}
        </div>
        {renderUptimeInfo()}
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  // Full mode - complete control panel
  return (
    <div className={`tes-auto-healing-panel ${className}`}>
      <div className="panel-header">
        <h3>TES Auto Healing</h3>
        {renderStatusIndicator()}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading-indicator">Loading...</div>}

      {renderUptimeInfo()}

      <div className="panel-controls">
        {renderActionButtons()}
        
        <div className="control-buttons">
          <button 
            onClick={startEditingConfig}
            disabled={!config}
            className="btn btn-secondary"
          >
            Configure
          </button>
          <button 
            onClick={() => setShowEvents(!showEvents)}
            className="btn btn-secondary"
          >
            {showEvents ? 'Hide' : 'Show'} Events ({events.length})
          </button>
          <button 
            onClick={stopAutoHealing}
            className="btn btn-danger"
          >
            Stop Auto Healing
          </button>
        </div>
      </div>

      {showConfig && renderConfigForm()}
      {showEvents && renderEventsList()}

      <style jsx>{`
        .tes-auto-healing-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          background: #f9f9f9;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .status-indicator.green { background: #d4edda; color: #155724; }
        .status-indicator.yellow { background: #fff3cd; color: #856404; }
        .status-indicator.orange { background: #ffeaa7; color: #d63031; }
        .status-indicator.red { background: #f8d7da; color: #721c24; }
        .status-indicator.unknown { background: #e2e3e5; color: #383d41; }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.green { background: #28a745; }
        .status-dot.yellow { background: #ffc107; }
        .status-dot.orange { background: #fd7e14; }
        .status-dot.red { background: #dc3545; }
        .status-dot.unknown { background: #6c757d; }

        .failure-count {
          font-size: 0.9em;
          opacity: 0.8;
        }

        .uptime-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .uptime-item {
          display: flex;
          justify-content: space-between;
        }

        .uptime-item label {
          font-weight: 500;
          color: #666;
        }

        .panel-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .action-buttons, .control-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary { background: #007bff; color: white; }
        .btn-primary:hover:not(:disabled) { background: #0056b3; }

        .btn-secondary { background: #6c757d; color: white; }
        .btn-secondary:hover:not(:disabled) { background: #545b62; }

        .btn-warning { background: #ffc107; color: #212529; }
        .btn-warning:hover:not(:disabled) { background: #e0a800; }

        .btn-danger { background: #dc3545; color: white; }
        .btn-danger:hover:not(:disabled) { background: #c82333; }

        .btn-small {
          padding: 4px 8px;
          font-size: 12px;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .loading-indicator {
          text-align: center;
          padding: 16px;
          color: #666;
        }

        .config-form {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 16px;
          margin-top: 16px;
          background: white;
        }

        .form-group {
          margin-bottom: 12px;
        }

        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }

        .form-group input[type="number"] {
          width: 100px;
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .form-group input[type="checkbox"] {
          margin-right: 8px;
        }

        .form-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .events-list {
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-top: 16px;
          background: white;
        }

        .events-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #ddd;
          background: #f8f9fa;
        }

        .events-container {
          max-height: 300px;
          overflow-y: auto;
        }

        .event-item {
          display: flex;
          padding: 8px 16px;
          border-bottom: 1px solid #eee;
        }

        .event-item:last-child {
          border-bottom: none;
        }

        .event-time {
          width: 80px;
          font-size: 12px;
          color: #666;
          flex-shrink: 0;
        }

        .event-content {
          flex: 1;
          font-size: 14px;
        }

        .event-item.healthcheckfailed,
        .event-item.restartcompleted {
          background: #fff5f5;
        }

        .event-item.healthcheckpassed {
          background: #f0fff4;
        }

        .no-events {
          padding: 16px;
          text-align: center;
          color: #666;
          font-style: italic;
        }

        .tes-auto-healing-compact {
          display: inline-block;
        }

        .tes-auto-healing-status {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f9f9f9;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
};

export default TesAutoHealingPanel;