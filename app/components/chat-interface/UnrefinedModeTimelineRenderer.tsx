/**
 * UnrefinedModeTimelineRenderer Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the unrefined mode timeline renderer for webapp migration.
 * Provides the basic interface without complex timeline functionality.
 * 
 * TODO: Implement full timeline renderer functionality when needed
 */

import React from 'react';

interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  content: any;
}

interface UnrefinedModeTimelineRendererProps {
  events?: TimelineEvent[];
  isVisible?: boolean;
  className?: string;
}

const UnrefinedModeTimelineRenderer: React.FC<UnrefinedModeTimelineRendererProps> = ({ 
  events = [],
  isVisible = true,
  className = ''
}) => {
  if (!isVisible) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Timeline Events ({events.length})
      </div>
      
      {events.length === 0 ? (
        <div className="text-center py-4 text-gray-500 italic">
          No timeline events to display
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {events.map((event, index) => (
            <div
              key={event.id || index}
              className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs border-l-2 border-blue-300"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {event.type}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                {typeof event.content === 'string' 
                  ? event.content 
                  : JSON.stringify(event.content, null, 2)
                }
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="text-xs text-gray-500 italic mt-2">
        Timeline rendering is simplified in webapp mode
      </div>
    </div>
  );
};

export default UnrefinedModeTimelineRenderer;