/**
 * ToolStatusPill Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the tool status pill for webapp migration.
 * Provides the basic interface without complex tool status functionality.
 * 
 * TODO: Implement full tool status pill functionality when needed
 */

import React from 'react';

interface ToolStatusPillProps {
  toolName: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  className?: string;
}

const ToolStatusPill: React.FC<ToolStatusPillProps> = ({ 
  toolName,
  status,
  result,
  className = ''
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '🔄';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔧';
    }
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()} ${className}`}>
      <span className="mr-1">{getStatusIcon()}</span>
      <span className="font-mono">{toolName}</span>
      <span className="ml-1 capitalize">({status})</span>
      
      {result && status === 'completed' && (
        <span className="ml-2 text-xs opacity-75">
          ✓
        </span>
      )}
    </div>
  );
};

export default ToolStatusPill;