import React from 'react';

interface MCSectionHeaderProps {
  // Props will be defined during implementation
  title?: string;
  count?: number;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const MCSectionHeader: React.FC<MCSectionHeaderProps> = ({ title, count, isCollapsed, onToggle }) => {
  return (
    <div className="mc-section-header" onClick={onToggle}>
      {/* MCSectionHeader implementation will be moved here */}
      <span>{title}</span>
      {count !== undefined && <span className="count">({count})</span>}
    </div>
  );
};

export default MCSectionHeader;