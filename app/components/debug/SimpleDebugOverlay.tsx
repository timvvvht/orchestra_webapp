import React, { useState } from 'react';

interface SimpleDebugOverlayProps {
  messages: any[];
  pairedEvents: any[];
}

export const SimpleDebugOverlay: React.FC<SimpleDebugOverlayProps> = ({
  messages,
  pairedEvents
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Simple analysis
  const toolInteractions = pairedEvents.filter(e => e.type === 'tool_interaction');
  const toolCalls = pairedEvents.filter(e => e.type === 'tool_call');
  const toolResults = pairedEvents.filter(e => e.type === 'tool_result');

  // Check for the specific issue you mentioned
  const interactionsWithBoth = toolInteractions.filter(interaction => {
    const hasCall = !!interaction.data?.call;
    const hasResult = !!interaction.data?.result;
    return hasCall && hasResult;
  });

  const separateCallsAndResults = toolCalls.length + toolResults.length;

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded shadow-lg hover:bg-blue-700"
      >
        Show Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">🔍 Tool Rendering Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Main Issue Check */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="font-semibold text-yellow-800 mb-2">Your Hypothesis Check:</div>
          <div className="space-y-1 text-yellow-700">
            <div>Tool interactions with BOTH call + result: <span className="font-bold">{interactionsWithBoth.length}</span></div>
            <div>Separate calls + results still rendered: <span className="font-bold">{separateCallsAndResults}</span></div>
          </div>
          {interactionsWithBoth.length > 0 && separateCallsAndResults > 0 && (
            <div className="mt-2 text-red-600 font-semibold">
              ⚠️ FOUND THE ISSUE! Same operations rendered twice
            </div>
          )}
        </div>

        {/* Simple Counts */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="font-semibold text-gray-800 mb-2">Event Counts:</div>
          <div className="space-y-1 text-gray-700">
            <div>Messages: {messages.length}</div>
            <div>Tool Interactions: {toolInteractions.length}</div>
            <div>Tool Calls: {toolCalls.length}</div>
            <div>Tool Results: {toolResults.length}</div>
          </div>
        </div>

        {/* Tool Details */}
        {interactionsWithBoth.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="font-semibold text-red-800 mb-2">Problematic Interactions:</div>
            <div className="space-y-1 text-xs text-red-700 max-h-32 overflow-auto">
              {interactionsWithBoth.slice(0, 5).map((interaction, index) => (
                <div key={index} className="border-b border-red-200 pb-1">
                  <div>Tool: {interaction.data?.call?.name || 'unknown'}</div>
                  <div>ID: {interaction.data?.call?.id?.substring(0, 8) || 'unknown'}</div>
                  <div className="text-red-600">Has both call AND result data</div>
                </div>
              ))}
              {interactionsWithBoth.length > 5 && (
                <div className="text-red-600">...and {interactionsWithBoth.length - 5} more</div>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div className={`text-center font-bold p-2 rounded ${
          interactionsWithBoth.length === 0 && separateCallsAndResults === 0
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {interactionsWithBoth.length === 0 && separateCallsAndResults === 0
            ? '✅ No duplication detected'
            : '❌ Duplication detected'
          }
        </div>
      </div>
    </div>
  );
};