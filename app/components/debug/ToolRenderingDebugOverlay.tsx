import React from 'react';

interface DebugOverlayProps {
  componentName: string;
  eventType: string;
  eventId: string;
  data: any;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color?: string;
}

export const ToolRenderingDebugOverlay: React.FC<DebugOverlayProps> = ({
  componentName,
  eventType,
  eventId,
  data,
  position = 'top-right',
  color = 'bg-red-500'
}) => {
  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0'
  };

  // Extract key information
  const toolName = data?.name || data?.call?.name || data?.result?.tool_name || 'unknown';
  const toolId = data?.id || data?.call?.id || data?.result?.tool_use_id || 'unknown';
  const hasCall = !!(data?.call || (data?.name && data?.id));
  const hasResult = !!(data?.result || (data?.content && data?.tool_use_id));

  return (
    <div className={`absolute ${positionClasses[position]} z-50 pointer-events-none`}>
      <div className={`${color} text-white text-xs p-2 rounded shadow-lg max-w-xs`}>
        <div className="font-bold">{componentName}</div>
        <div className="text-xs opacity-90">
          <div>Type: {eventType}</div>
          <div>ID: {toolId.substring(0, 8)}...</div>
          <div>Tool: {toolName}</div>
          <div className="flex gap-2 mt-1">
            <span className={`px-1 rounded ${hasCall ? 'bg-green-600' : 'bg-gray-600'}`}>
              Call: {hasCall ? '✓' : '✗'}
            </span>
            <span className={`px-1 rounded ${hasResult ? 'bg-blue-600' : 'bg-gray-600'}`}>
              Result: {hasResult ? '✓' : '✗'}
            </span>
          </div>
          {data?.metadata?.source && (
            <div className="text-xs mt-1 opacity-75">
              Source: {data.metadata.source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ToolInteractionDebugProps {
  interaction: any;
  componentName: string;
}

export const ToolInteractionDebugOverlay: React.FC<ToolInteractionDebugProps> = ({
  interaction,
  componentName
}) => {
  const call = interaction?.data?.call || interaction?.call;
  const result = interaction?.data?.result || interaction?.result;
  
  return (
    <div className="absolute top-0 left-0 z-50 pointer-events-none">
      <div className="bg-purple-600 text-white text-xs p-2 rounded shadow-lg max-w-sm">
        <div className="font-bold">{componentName} - TOOL_INTERACTION</div>
        <div className="text-xs opacity-90">
          <div>Interaction ID: {interaction?.id?.substring(0, 8) || 'unknown'}</div>
          
          {call && (
            <div className="mt-1 p-1 bg-green-700 rounded">
              <div>CALL: {call.name}</div>
              <div>Call ID: {call.id?.substring(0, 8) || 'unknown'}</div>
              <div>Args: {Object.keys(call.input || {}).length} params</div>
            </div>
          )}
          
          {result && (
            <div className="mt-1 p-1 bg-blue-700 rounded">
              <div>RESULT: {result.tool_name || call?.name || 'unknown'}</div>
              <div>Result ID: {result.tool_use_id?.substring(0, 8) || 'unknown'}</div>
              <div>Content: {result.content ? 'Present' : 'Missing'}</div>
            </div>
          )}
          
          <div className="mt-1 text-xs opacity-75">
            Rendering: {call ? 'Call' : ''}
            {call && result ? ' + ' : ''}
            {result ? 'Result' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

interface RenderingPathDebugProps {
  path: string[];
  currentComponent: string;
  eventData: any;
}

export const RenderingPathDebugOverlay: React.FC<RenderingPathDebugProps> = ({
  path,
  currentComponent,
  eventData
}) => {
  return (
    <div className="absolute bottom-0 right-0 z-50 pointer-events-none">
      <div className="bg-orange-600 text-white text-xs p-2 rounded shadow-lg max-w-md">
        <div className="font-bold">RENDERING PATH</div>
        <div className="text-xs opacity-90">
          {path.map((component, index) => (
            <div key={index} className={`${component === currentComponent ? 'font-bold' : ''}`}>
              {'→ '.repeat(index)}{component}
            </div>
          ))}
        </div>
        <div className="mt-1 text-xs opacity-75">
          Event: {eventData?.type || 'unknown'}
          {eventData?.id && ` (${eventData.id.substring(0, 8)}...)`}
        </div>
      </div>
    </div>
  );
};