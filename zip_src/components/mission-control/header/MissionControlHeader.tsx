import React from 'react';

interface MissionControlHeaderProps {
  viewMode: 'active' | 'archived';
  onViewModeChange: (mode: 'active' | 'archived') => void;
  selectedSession: string | null;
  agentCount: number;
  draftCount: number;
  selectedCwd: string;
  onCwdChange: (cwd: string) => void;
  availableCwds?: string[];
}

/**
 * Header component for Mission Control interface.
 * Displays stats, view mode toggle, CWD filter, and selected session info.
 * 
 * @param viewMode - Current view mode ('active' or 'archived')
 * @param onViewModeChange - Callback to change view mode
 * @param selectedSession - Currently selected session ID
 * @param agentCount - Number of agents to display
 * @param draftCount - Number of drafts to display
 * @param selectedCwd - Currently selected CWD filter
 * @param onCwdChange - Callback to change CWD filter
 * @param availableCwds - List of available CWD options
 */
const MissionControlHeader: React.FC<MissionControlHeaderProps> = ({
  viewMode,
  onViewModeChange,
  selectedSession,
  agentCount,
  draftCount,
  selectedCwd,
  onCwdChange,
  availableCwds = [],
}) => {
  return (
    <div className="mission-control-header">
      <div className="header-left">
        <h1 className="header-title">Mission Control</h1>
        
        {/* Stats */}
        <div className="header-stats">
          <span className="stat">
            {agentCount} {agentCount === 1 ? 'Agent' : 'Agents'}
          </span>
          <span className="stat">
            {draftCount} {draftCount === 1 ? 'Draft' : 'Drafts'}
          </span>
        </div>
      </div>

      <div className="header-center">
        {/* Selected Session Info */}
        {selectedSession && (
          <div className="selected-session-info">
            <span className="session-label">Selected:</span>
            <span className="session-id">{selectedSession}</span>
          </div>
        )}
      </div>

      <div className="header-right">
        {/* CWD Filter */}
        <div className="cwd-filter">
          <label htmlFor="cwd-select">Directory:</label>
          <select
            id="cwd-select"
            value={selectedCwd}
            onChange={(e) => onCwdChange(e.target.value)}
            className="cwd-select"
          >
            <option value="">All Directories</option>
            {availableCwds.map((cwd) => (
              <option key={cwd} value={cwd}>
                {cwd}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            className={`toggle-btn ${viewMode === 'active' ? 'active' : ''}`}
            onClick={() => onViewModeChange('active')}
          >
            Active
          </button>
          <button
            className={`toggle-btn ${viewMode === 'archived' ? 'active' : ''}`}
            onClick={() => onViewModeChange('archived')}
          >
            Archived
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionControlHeader;