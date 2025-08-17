import React, { useState } from 'react';

interface DataFlowDebugOverlayProps {
  title: string;
  data: any;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color?: string;
  expanded?: boolean;
}

export const DataFlowDebugOverlay: React.FC<DataFlowDebugOverlayProps> = ({
  title,
  data,
  position = 'top-left',
  color = 'bg-yellow-600',
  expanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0'
  };

  const formatData = (obj: any, depth = 0): React.ReactNode => {
    if (depth > 2) return '...';
    
    if (obj === null || obj === undefined) {
      return <span className="text-gray-400">null</span>;
    }
    
    if (typeof obj === 'string') {
      return <span className="text-green-300">"{obj.length > 50 ? obj.substring(0, 50) + '...' : obj}"</span>;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return <span className="text-blue-300">{String(obj)}</span>;
    }
    
    if (Array.isArray(obj)) {
      return (
        <div className="ml-2">
          <span className="text-purple-300">[{obj.length} items]</span>
          {obj.slice(0, 3).map((item, index) => (
            <div key={index} className="ml-2 text-xs">
              {index}: {formatData(item, depth + 1)}
            </div>
          ))}
          {obj.length > 3 && <div className="ml-2 text-xs text-gray-400">...{obj.length - 3} more</div>}
        </div>
      );
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      return (
        <div className="ml-2">
          <span className="text-orange-300">{`{${keys.length} keys}`}</span>
          {keys.slice(0, 5).map(key => (
            <div key={key} className="ml-2 text-xs">
              <span className="text-cyan-300">{key}:</span> {formatData(obj[key], depth + 1)}
            </div>
          ))}
          {keys.length > 5 && <div className="ml-2 text-xs text-gray-400">...{keys.length - 5} more</div>}
        </div>
      );
    }
    
    return String(obj);
  };

  return (
    <div className={`absolute ${positionClasses[position]} z-50 pointer-events-auto`}>
      <div className={`${color} text-white text-xs rounded shadow-lg max-w-md`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left p-2 hover:bg-black/20 rounded-t"
        >
          <div className="font-bold flex items-center justify-between">
            {title}
            <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </button>
        
        {isExpanded && (
          <div className="p-2 border-t border-white/20 max-h-96 overflow-auto">
            <div className="font-mono text-xs">
              {formatData(data)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ToolCallResultPairDebugProps {
  call?: any;
  result?: any;
  componentName: string;
}

export const ToolCallResultPairDebug: React.FC<ToolCallResultPairDebugProps> = ({
  call,
  result,
  componentName
}) => {
  const [expanded, setExpanded] = useState(false);

  // Analyze the relationship
  const callId = call?.id;
  const resultToolUseId = result?.tool_use_id;
  const isMatched = callId && resultToolUseId && callId === resultToolUseId;
  
  const callName = call?.name;
  const resultToolName = result?.tool_name;
  const nameMatches = callName && resultToolName && callName === resultToolName;

  return (
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
      <div className="bg-indigo-600 text-white text-xs rounded shadow-lg">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-2 hover:bg-black/20 rounded-t"
        >
          <div className="font-bold flex items-center justify-between">
            {componentName} - CALL/RESULT PAIR
            <span className="text-xs">{expanded ? '▼' : '▶'}</span>
          </div>
        </button>
        
        {expanded && (
          <div className="p-2 border-t border-white/20 max-w-lg">
            <div className="space-y-2">
              {/* Relationship Analysis */}
              <div className="bg-black/20 p-2 rounded">
                <div className="font-bold mb-1">Relationship Analysis</div>
                <div className={`text-xs ${isMatched ? 'text-green-300' : 'text-red-300'}`}>
                  ID Match: {isMatched ? '✓' : '✗'} ({callId?.substring(0, 8)} vs {resultToolUseId?.substring(0, 8)})
                </div>
                <div className={`text-xs ${nameMatches ? 'text-green-300' : 'text-yellow-300'}`}>
                  Name Match: {nameMatches ? '✓' : '~'} ({callName} vs {resultToolName})
                </div>
              </div>

              {/* Call Details */}
              {call && (
                <div className="bg-green-900/30 p-2 rounded">
                  <div className="font-bold text-green-300">CALL</div>
                  <div className="text-xs space-y-1">
                    <div>ID: {call.id?.substring(0, 12) || 'missing'}</div>
                    <div>Name: {call.name || 'missing'}</div>
                    <div>Input: {call.input ? Object.keys(call.input).length + ' params' : 'none'}</div>
                  </div>
                </div>
              )}

              {/* Result Details */}
              {result && (
                <div className="bg-blue-900/30 p-2 rounded">
                  <div className="font-bold text-blue-300">RESULT</div>
                  <div className="text-xs space-y-1">
                    <div>Tool Use ID: {result.tool_use_id?.substring(0, 12) || 'missing'}</div>
                    <div>Tool Name: {result.tool_name || 'missing'}</div>
                    <div>Content: {result.content ? 'present' : 'missing'}</div>
                    <div>Is Error: {result.is_error ? 'yes' : 'no'}</div>
                  </div>
                </div>
              )}

              {/* Rendering Decision */}
              <div className="bg-purple-900/30 p-2 rounded">
                <div className="font-bold text-purple-300">RENDERING DECISION</div>
                <div className="text-xs">
                  {call && result ? (
                    <div className="text-yellow-300">
                      ⚠️ BOTH CALL AND RESULT - Potential duplication source!
                    </div>
                  ) : call ? (
                    <div className="text-green-300">
                      ✓ Call only - Clean rendering
                    </div>
                  ) : result ? (
                    <div className="text-blue-300">
                      ✓ Result only - Clean rendering
                    </div>
                  ) : (
                    <div className="text-red-300">
                      ✗ Neither call nor result - Error state
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};