import React from 'react';
import { DraftCardProps } from '../../../../types/missionControl';

/**
 * Card component for displaying draft information.
 * Shows title, message, config, and provides send/delete actions.
 * 
 * @param draft - Draft data to display
 * @param onSend - Callback when send button is clicked
 * @param onDelete - Callback when delete button is clicked
 * @param className - Additional CSS classes
 * @param style - Inline styles
 */
const DraftCard: React.FC<DraftCardProps> = ({ 
  draft, 
  onSend, 
  onDelete,
  className = '',
  style 
}) => {
  return (
    <div className={`draft-card ${className}`} style={style}>
      <div className="draft-card-header">
        <h4 className="draft-title">{draft.title}</h4>
        <span className="draft-config">{draft.agent_config}</span>
      </div>
      
      <div className="draft-card-body">
        <p className="draft-message">{draft.message}</p>
        {draft.cwd && <div className="draft-cwd">CWD: {draft.cwd}</div>}
      </div>
      
      <div className="draft-card-actions">
        <button 
          className="send-btn primary"
          onClick={onSend}
        >
          Send
        </button>
        {onDelete && (
          <button 
            className="delete-btn secondary"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default DraftCard;