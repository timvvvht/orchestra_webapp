/**
 * Test component to debug ChatMainCanonicalLegacy rendering issues
 */

import React, { useState } from 'react';
import ChatMainCanonicalLegacy from '@/components/chat-interface/ChatMainCanonicalLegacy';

const ChatMainCanonicalLegacyTest: React.FC = () => {
  const [testSessionId, setTestSessionId] = useState<string>('test-session-123');

  return (
    <div className="h-screen bg-black flex flex-col">
      <div className="p-4 bg-gray-800 border-b border-white/10">
        <h1 className="text-white text-lg mb-4">ChatMainCanonicalLegacy Test</h1>
        <div className="flex gap-4 items-center">
          <label className="text-white">Session ID:</label>
          <input
            type="text"
            value={testSessionId}
            onChange={(e) => setTestSessionId(e.target.value)}
            className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white"
            placeholder="Enter session ID"
          />
          <button
            onClick={() => setTestSessionId('')}
            className="px-3 py-1 bg-red-500/20 border border-red-400/30 rounded text-red-300"
          >
            Clear
          </button>
          <button
            onClick={() => setTestSessionId('test-session-456')}
            className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300"
          >
            Set Test ID
          </button>
        </div>
        <div className="mt-2 text-sm text-white/60">
          Current sessionId: "{testSessionId}" (type: {typeof testSessionId}, length: {testSessionId.length})
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {console.log('🧪 [ChatMainCanonicalLegacyTest] Rendering with sessionId:', testSessionId)}
        <ChatMainCanonicalLegacy 
          sessionId={testSessionId}
          sidebarCollapsed={true}
        />
      </div>
    </div>
  );
};

export default ChatMainCanonicalLegacyTest;