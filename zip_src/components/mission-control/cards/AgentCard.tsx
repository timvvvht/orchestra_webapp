import React from 'react';
import { Agent, AgentCardProps, MCStatus } from '../../../../types/missionControl';
import StatusDot from '../StatusDot';

/**
 * Card component for displaying individual agent information.
 * Shows status, title, config, and provides archive/unarchive actions.
 * 
 * @param agent - Agent data to display
 * @param isSelected - Whether this agent is currently selected
 * @param onClick - Callback when card is clicked
 * @param onArchive - Callback when archive button is clicked
 * @param onUnarchive - Callback when unarchive button is clicked
 * @param viewMode - Current view mode ('active' or 'archived')
 * @param className - Additional CSS classes
 * @param style - Inline styles
 */
const AgentCard: React.FC<AgentCardProps> = ({ 
  agent, 
  isSelected, 
  onClick, 
  onArchive, 
  onUnarchive, 
  viewMode,
  className = '',
  style 
}) => {
  return (
    <div 
      className={`agent-card ${isSelected ? 'selected' : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      <div className="agent-card-header">
        <StatusDot status={agent.status} size="sm" />
        <h4 className="agent-title">{agent.mission_title}</h4>
        <span className="agent-config">{agent.agent_config_name}</span>
      </div>
      
      <div className="agent-card-body">
        <div className="agent-id">ID: {agent.id}</div>
        {agent.cwd && <div className="agent-cwd">CWD: {agent.cwd}</div>}
      </div>
      
      <div className="agent-card-actions">
        {viewMode === 'active' && onArchive && (
          <button 
            className="archive-btn"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
          >
            Archive
          </button>
        )}
        {viewMode === 'archived' && onUnarchive && (
          <button 
            className="unarchive-btn"
            onClick={(e) => {
              e.stopPropagation();
              onUnarchive();
            }}
          >
            Restore
          </button>
        )}
      </div>
    </div>
  );
};

export default AgentCard;