import React, { useState, useEffect } from 'react';

interface GlobalDebugOverlayProps {
  messages: any[];
  pairedEvents: any[];
}

export const GlobalDebugOverlay: React.FC<GlobalDebugOverlayProps> = ({
  messages,
  pairedEvents
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Analyze the data
  const analysis = {
    totalMessages: messages.length,
    assistantMessages: messages.filter(m => m.role === 'assistant').length,
    totalPairedEvents: pairedEvents.length,
    eventTypes: pairedEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    toolInteractions: pairedEvents.filter(e => e.type === 'tool_interaction'),
    toolCalls: pairedEvents.filter(e => e.type === 'tool_call'),
    toolResults: pairedEvents.filter(e => e.type === 'tool_result'),
  };

  // Check for potential duplication patterns
  const duplicateAnalysis = {
    toolInteractionsWithBothCallAndResult: analysis.toolInteractions.filter(interaction => 
      interaction.data?.call && interaction.data?.result
    ).length,
    separateCallsAndResults: analysis.toolCalls.length + analysis.toolResults.length,
    potentialDuplicates: analysis.toolInteractions.filter(interaction => {
      const call = interaction.data?.call;
      const result = interaction.data?.result;
      return call && result && call.id === result.tool_use_id;
    }).length
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
      >
        Show Debug
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-xs rounded shadow-lg max-w-md">
      <div className="flex items-center justify-between p-2 bg-gray-800 rounded-t">
        <div className="font-bold">🔍 GLOBAL DEBUG OVERLAY</div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-3 max-h-96 overflow-auto">
        {/* Data Summary */}
        <div className="bg-blue-900/30 p-2 rounded">
          <div className="font-bold text-blue-300 mb-1">Data Summary</div>
          <div className="space-y-1">
            <div>Total Messages: {analysis.totalMessages}</div>
            <div>Assistant Messages: {analysis.assistantMessages}</div>
            <div>Paired Events: {analysis.totalPairedEvents}</div>
          </div>
        </div>

        {/* Event Types */}
        <div className="bg-green-900/30 p-2 rounded">
          <button
            onClick={() => setExpandedSection(expandedSection === 'events' ? null : 'events')}
            className="w-full text-left font-bold text-green-300 mb-1 flex items-center justify-between"
          >
            Event Types
            <span>{expandedSection === 'events' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'events' && (
            <div className="space-y-1">
              {Object.entries(analysis.eventTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span>{type}:</span>
                  <span className={count > 1 ? 'text-yellow-300' : ''}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Duplication Analysis */}
        <div className="bg-red-900/30 p-2 rounded">
          <button
            onClick={() => setExpandedSection(expandedSection === 'duplication' ? null : 'duplication')}
            className="w-full text-left font-bold text-red-300 mb-1 flex items-center justify-between"
          >
            Duplication Analysis
            <span>{expandedSection === 'duplication' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'duplication' && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Tool Interactions:</span>
                <span className={analysis.toolInteractions.length > 0 ? 'text-green-300' : ''}>{analysis.toolInteractions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Separate Calls+Results:</span>
                <span className={duplicateAnalysis.separateCallsAndResults > 0 ? 'text-yellow-300' : ''}>{duplicateAnalysis.separateCallsAndResults}</span>
              </div>
              <div className="flex justify-between">
                <span>Interactions with Both:</span>
                <span className={duplicateAnalysis.toolInteractionsWithBothCallAndResult > 0 ? 'text-red-300' : 'text-green-300'}>
                  {duplicateAnalysis.toolInteractionsWithBothCallAndResult}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Potential Duplicates:</span>
                <span className={duplicateAnalysis.potentialDuplicates > 0 ? 'text-red-300' : 'text-green-300'}>
                  {duplicateAnalysis.potentialDuplicates}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tool Interactions Detail */}
        <div className="bg-purple-900/30 p-2 rounded">
          <button
            onClick={() => setExpandedSection(expandedSection === 'tools' ? null : 'tools')}
            className="w-full text-left font-bold text-purple-300 mb-1 flex items-center justify-between"
          >
            Tool Interactions ({analysis.toolInteractions.length})
            <span>{expandedSection === 'tools' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'tools' && (
            <div className="space-y-1 max-h-32 overflow-auto">
              {analysis.toolInteractions.map((interaction, index) => {
                const call = interaction.data?.call;
                const result = interaction.data?.result;
                const hasCall = !!call;
                const hasResult = !!result;
                const isMatched = call?.id === result?.tool_use_id;
                
                return (
                  <div key={interaction.id || index} className="text-xs border border-gray-600 p-1 rounded">
                    <div className="font-mono">{interaction.id?.substring(0, 8) || 'no-id'}</div>
                    <div className="flex gap-2">
                      <span className={`px-1 rounded ${hasCall ? 'bg-green-600' : 'bg-gray-600'}`}>
                        C: {hasCall ? '✓' : '✗'}
                      </span>
                      <span className={`px-1 rounded ${hasResult ? 'bg-blue-600' : 'bg-gray-600'}`}>
                        R: {hasResult ? '✓' : '✗'}
                      </span>
                      <span className={`px-1 rounded ${isMatched ? 'bg-green-600' : 'bg-red-600'}`}>
                        M: {isMatched ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="text-xs opacity-75">
                      {call?.name || result?.tool_name || 'unknown'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-gray-800 p-2 rounded text-center">
          {duplicateAnalysis.potentialDuplicates === 0 && duplicateAnalysis.separateCallsAndResults === 0 ? (
            <div className="text-green-300 font-bold">✅ NO DUPLICATION DETECTED</div>
          ) : (
            <div className="text-red-300 font-bold">⚠️ POTENTIAL DUPLICATION</div>
          )}
        </div>
      </div>
    </div>
  );
};