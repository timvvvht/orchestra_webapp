import React from 'react';
import { useChatUI } from '@/context/ChatUIContext';

interface SessionDataDebugOverlayProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const SessionDataDebugOverlay: React.FC<SessionDataDebugOverlayProps> = ({
  isOpen,
  onToggle
}) => {
  const chatUI = useChatUI();

  // Safety check - if chatUI is null/undefined, show error
  if (!chatUI) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-3 py-1 rounded text-sm font-mono">
        ERROR: chatUI is null/undefined
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 bg-red-600 text-white px-3 py-1 rounded text-sm font-mono"
      >
        DEBUG
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end p-4">
      <div className="bg-gray-900 text-white p-4 rounded-lg max-w-2xl max-h-[90vh] overflow-auto font-mono text-xs">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-yellow-400">🎯 Session Data Debug</h2>
          <button
            onClick={onToggle}
            className="bg-red-600 text-white px-2 py-1 rounded text-xs"
          >
            CLOSE
          </button>
        </div>

        <div className="space-y-4">
          {/* Current Session ID */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">🔗 Current Session ID</h3>
            <div className="text-green-400">
              {chatUI.currentSessionId || <span className="text-red-400">undefined</span>}
            </div>
          </div>

          {/* Current Session Details */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">📄 Current Session Details</h3>
            {chatUI.currentSession ? (
              <div className="space-y-1">
                <div><span className="text-yellow-400">ID:</span> {chatUI.currentSession.id}</div>
                <div><span className="text-yellow-400">Name:</span> {chatUI.currentSession.name || <span className="text-red-400">undefined</span>}</div>
                <div><span className="text-yellow-400">Agent Config ID:</span> {chatUI.currentSession.agent_config_id || <span className="text-red-400">undefined</span>}</div>
                <div><span className="text-yellow-400">Agent CWD:</span> {chatUI.currentSession.agent_cwd || <span className="text-red-400">undefined</span>}</div>
                <div><span className="text-yellow-400">Model ID:</span> {chatUI.currentSession.model_id || <span className="text-red-400">undefined</span>}</div>
                <div><span className="text-yellow-400">Messages:</span> {chatUI.currentSession.messages?.length || 0}</div>
                <div><span className="text-yellow-400">Created:</span> {chatUI.currentSession.created_at}</div>
                <div><span className="text-yellow-400">Updated:</span> {chatUI.currentSession.updated_at}</div>
                <div className="mt-2">
                  <span className="text-yellow-400">All Keys:</span>
                  <div className="text-gray-400 ml-2">
                    {chatUI.currentSession ? Object.keys(chatUI.currentSession).join(', ') : <span className="text-red-400">currentSession is null/undefined</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-red-400">No current session</div>
            )}
          </div>

          {/* Current Agent Config ID */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">🤖 Current Agent Config ID</h3>
            <div className="text-green-400">
              {chatUI.currentAgentConfigId || <span className="text-red-400">undefined</span>}
            </div>
            <div><span className="text-yellow-400">Session Agent Config ID:</span> {chatUI.currentSession?.agent_config_id || <span className="text-red-400">undefined</span>}</div>
            <div><span className="text-yellow-400">Session Agent Name:</span> {chatUI.currentSession?.agent_name || <span className="text-red-400">undefined</span>}</div>
            <div><span className="text-yellow-400">All Agent Keys in Session:</span> {chatUI.currentSession ? Object.keys(chatUI.currentSession).filter(k => k.includes('agent')).join(', ') : 'No session'}</div>
          </div>

          {/* Current Agent Config */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">⚙️ Current Agent Config</h3>
            {chatUI.currentAgentConfig ? (
              <div className="space-y-1">
                <div><span className="text-yellow-400">ID:</span> {chatUI.currentAgentConfig.id}</div>
                <div><span className="text-yellow-400">Name:</span> {chatUI.currentAgentConfig.name}</div>
                <div><span className="text-yellow-400">Description:</span> {chatUI.currentAgentConfig.description}</div>
                <div><span className="text-yellow-400">AI Config Model:</span> {chatUI.currentAgentConfig.ai_config?.model_id || <span className="text-red-400">undefined</span>}</div>
                <div><span className="text-yellow-400">Current Model ID:</span> {chatUI.currentModelId || <span className="text-red-400">undefined</span>}</div>
                <div><span className="text-yellow-400">Session Model ID:</span> {chatUI.currentSession?.model_id || <span className="text-red-400">undefined</span>}</div>
                <div><span className="text-yellow-400">System Prompt:</span> {chatUI.currentAgentConfig.agent?.system_prompt?.substring(0, 100)}...</div>
              </div>
            ) : (
              <div className="text-red-400">No current agent config</div>
            )}
          </div>

          {/* Agent Configs Map */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">🗺️ Agent Configs Map</h3>
            <div><span className="text-yellow-400">Total Configs:</span> {chatUI.agentConfigsMap ? Object.keys(chatUI.agentConfigsMap).length : <span className="text-red-400">agentConfigsMap is null/undefined</span>}</div>
            <div><span className="text-yellow-400">DEBUG - agentConfigs:</span> {chatUI.agentConfigs ? Object.keys(chatUI.agentConfigs).length : <span className="text-red-400">agentConfigs is null/undefined</span>}</div>
            <div><span className="text-yellow-400">DEBUG - Available Properties:</span> {Object.keys(chatUI).filter(k => k.includes('agent')).join(', ')}</div>
            <div><span className="text-yellow-400">Available IDs:</span></div>
            <div className="text-gray-400 ml-2">
              {chatUI.agentConfigsMap && Object.keys(chatUI.agentConfigsMap).length > 0 
                ? Object.keys(chatUI.agentConfigsMap).join(', ')
                : <span className="text-red-400">{chatUI.agentConfigsMap ? 'No agent configs loaded' : 'agentConfigsMap is null/undefined'}</span>
              }
            </div>
          </div>

          {/* Authentication */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">🔐 Authentication</h3>
            <div><span className="text-yellow-400">Authenticated:</span> {chatUI.isAuthenticated ? '✅' : '❌'}</div>
            <div><span className="text-yellow-400">User ID:</span> {chatUI.user?.id || <span className="text-red-400">undefined</span>}</div>
            <div><span className="text-yellow-400">User Email:</span> {chatUI.user?.email || <span className="text-red-400">undefined</span>}</div>
          </div>

          {/* Connection Status */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">🔌 Connection Status</h3>
            <div><span className="text-yellow-400">Initialized:</span> {chatUI.isInitialized ? '✅' : '❌'}</div>
            <div><span className="text-yellow-400">Connected:</span> {chatUI.isConnected ? '✅' : '❌'}</div>
            <div><span className="text-yellow-400">Status:</span> {chatUI.connectionStatus}</div>
            <div><span className="text-yellow-400">Loading:</span> {chatUI.isLoading ? '⏳' : '✅'}</div>
            <div><span className="text-yellow-400">Error:</span> {chatUI.error || <span className="text-green-400">None</span>}</div>
          </div>

          {/* Messages */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">💬 Messages</h3>
            <div><span className="text-yellow-400">Count:</span> {chatUI.messages ? chatUI.messages.length : <span className="text-red-400">messages is null/undefined</span>}</div>
            <div><span className="text-yellow-400">Timeline Events:</span> {chatUI.timelineEvents ? chatUI.timelineEvents.length : <span className="text-red-400">timelineEvents is null/undefined</span>}</div>
            <div><span className="text-yellow-400">Has Streaming:</span> {chatUI.hasStreamingMessage ? '✅' : '❌'}</div>
          </div>

          {/* Raw Data */}
          <div className="border border-gray-700 p-3 rounded">
            <h3 className="text-blue-400 font-bold mb-2">🔍 Raw Current Session</h3>
            <pre className="text-xs text-gray-300 overflow-auto max-h-40">
              {JSON.stringify(chatUI.currentSession, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDataDebugOverlay;