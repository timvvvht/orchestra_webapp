/**
 * ServiceStatusIndicator - Compact service status indicator
 * 
 * Shows a small, unobtrusive indicator of service health that can be
 * placed in the UI header or sidebar. Provides quick visual feedback
 * about the state of global services.
 */

import React, { useState } from 'react';
import { useServiceHealth } from '@/hooks/useGlobalServices';
import { formatUptime, getHealthIcon, getHealthColor, generateHealthReport, calculateErrorRate, calculateReconnectRate } from '@/utils/serviceHealth';

interface ServiceStatusIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  className?: string;
}

export const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({
  position = 'top-right',
  size = 'small',
  showTooltip = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isHealthy, isAllRunning, hasErrors, orchestratorUptime, firehoseConnected, lastError } = useServiceHealth();

  // Calculate health metrics for detailed status
  const healthMetrics = {
    uptime: orchestratorUptime,
    errorRate: calculateErrorRate(hasErrors ? 1 : 0, orchestratorUptime),
    reconnectRate: calculateReconnectRate(0, orchestratorUptime), // We don't have reconnect data here
  };

  const healthReport = generateHealthReport(
    healthMetrics,
    firehoseConnected,
    0 // We don't have firehose reconnect data here
  );

  // Determine position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  // Determine size classes
  const sizeClasses = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  // Determine status color
  const getStatusColor = () => {
    if (isHealthy && isAllRunning) return 'bg-green-500';
    if (isAllRunning && !isHealthy) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Generate tooltip content
  const tooltipContent = (
    <div className="bg-black/90 text-white p-3 rounded-lg shadow-lg font-mono text-xs max-w-xs">
      <div className="font-bold mb-2">🌐 Service Status</div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Overall:</span>
          <span className={getHealthColor(healthReport.overall.level)}>
            {getHealthIcon(healthReport.overall.level)} {healthReport.overall.score}/100
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Orchestrator:</span>
          <span className={getHealthColor(healthReport.orchestrator.level)}>
            {getHealthIcon(healthReport.orchestrator.level)} {isAllRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Firehose:</span>
          <span className={firehoseConnected ? 'text-green-400' : 'text-red-400'}>
            {firehoseConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Uptime:</span>
          <span className="text-blue-400">{formatUptime(orchestratorUptime)}</span>
        </div>
        
        {hasErrors && lastError && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <div className="text-red-300 text-xs break-words">
              Error: {lastError}
            </div>
          </div>
        )}
        
        {healthReport.overall.issues.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <div className="text-yellow-300 text-xs">
              Issues: {healthReport.overall.issues.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`fixed ${positionClasses[position]} z-40 ${className}`}>
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Status Indicator */}
        <div
          className={`
            ${sizeClasses[size]} 
            ${getStatusColor()} 
            rounded-full 
            shadow-lg 
            cursor-pointer
            transition-all duration-200
            ${isHovered ? 'scale-110' : ''}
          `}
          title={showTooltip ? undefined : healthReport.summary}
        >
          {/* Pulse animation for active status */}
          {isAllRunning && (
            <div
              className={`
                ${sizeClasses[size]} 
                ${getStatusColor()} 
                rounded-full 
                animate-ping 
                absolute 
                opacity-75
              `}
            />
          )}
        </div>

        {/* Tooltip */}
        {showTooltip && isHovered && (
          <div
            className={`
              absolute z-50 
              ${position.includes('right') ? 'right-0' : 'left-0'}
              ${position.includes('top') ? 'top-6' : 'bottom-6'}
              pointer-events-none
            `}
          >
            {tooltipContent}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Compact inline service status for use in headers/toolbars
 */
export const InlineServiceStatus: React.FC<{
  showText?: boolean;
  className?: string;
}> = ({ showText = true, className = '' }) => {
  const { isHealthy, isAllRunning, orchestratorUptime } = useServiceHealth();

  const getStatusIcon = () => {
    if (isHealthy && isAllRunning) return '🟢';
    if (isAllRunning && !isHealthy) return '🟡';
    return '🔴';
  };

  const getStatusText = () => {
    if (isHealthy && isAllRunning) return 'Services OK';
    if (isAllRunning && !isHealthy) return 'Services Warning';
    return 'Services Error';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm">{getStatusIcon()}</span>
      {showText && (
        <span className="text-xs font-mono opacity-75">
          {getStatusText()} ({formatUptime(orchestratorUptime)})
        </span>
      )}
    </div>
  );
};

export default ServiceStatusIndicator;
