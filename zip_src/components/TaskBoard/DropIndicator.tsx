import React from 'react';

interface DropIndicatorProps {
  isVisible: boolean;
  isHorizontal?: boolean;
}

/**
 * A visual indicator that shows where an item will be dropped
 */
const DropIndicator: React.FC<DropIndicatorProps> = ({ 
  isVisible, 
  isHorizontal = false 
}) => {
  if (!isVisible) return null;
  
  return (
    <div 
      className={`
        ${isHorizontal ? 'h-0.5 w-full my-1' : 'w-0.5 h-full mx-1'}
        bg-primary rounded-full animate-pulse
        transition-all duration-200 ease-in-out
      `}
      style={{ 
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.5)',
        boxShadow: '0 0 4px rgba(var(--primary-rgb), 0.5)'
      }}
    />
  );
};

export default DropIndicator;