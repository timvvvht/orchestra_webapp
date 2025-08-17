import React, { memo } from 'react';
import { StatusDotProps } from '../../../types/missionControl';

/**
 * Small dot component for displaying status with color coding.
 * Memoized for performance with frequently updating status.
 * 
 * @param status - Status string to display (idle, working, error, etc.)
 * @param size - Size variant ('sm', 'md', 'lg')
 * @param className - Additional CSS classes
 * @param style - Inline styles
 */
const StatusDot: React.FC<StatusDotProps> = memo(({ status, size = 'md', className = '', style }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
      case 'ready':
        return 'bg-green-500';
      case 'working':
      case 'processing':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  return (
    <div
      className={`rounded-full ${getStatusColor(status)} ${getSizeClass(size)} ${className}`}
      style={style}
      title={`Status: ${status}`}
    />
  );
});

StatusDot.displayName = 'StatusDot';

export default StatusDot;