/**
 * EventsPlaygroundRoute - Sandbox route for testing canonical event adapters
 * 
 * Provides an isolated environment for engineers to test the new canonical
 * event system without affecting existing functionality.
 */

import React, { useState } from 'react';
import { EventPlaygroundPanel } from '@/components/playground/EventPlaygroundPanel';

export default function EventsPlaygroundRoute() {
  const [activeTab, setActiveTab] = useState<'adapters' | 'hooks'>('hooks');

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Canonical Event Playground</h1>
          <p className="text-gray-400 text-lg">
            Test and validate the new canonical event system.
          </p>

          {/* Tab Navigation */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab('hooks')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'hooks'
                  ? 'bg-gray-800 text-white border-t border-l border-r border-gray-700'
                  : 'bg-gray-900 text-gray-400 hover:text-white'
                }`}
            >
              Hooks Testing
            </button>
            <button
              onClick={() => setActiveTab('adapters')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'adapters'
                  ? 'bg-gray-800 text-white border-t border-l border-r border-gray-700'
                  : 'bg-gray-900 text-gray-400 hover:text-white'
                }`}
            >
              Adapter Testing
            </button>
          </div>
        </div>


        <div className="mb-4 p-4 bg-gray-900 border border-gray-700 rounded">
          <h2 className="text-lg font-semibold mb-2">How to use:</h2>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Left panel:</strong> Paste Supabase chat_messages row JSON (single object or array) to test RowMapper</li>
            <li>• <strong>Right panel:</strong> Paste SSE agent_event payload JSON (single object or array) to test SseParser</li>
            <li>• <strong>Array support:</strong> Paste full transcripts like <code>[&#123;...&#125;, &#123;...&#125;, &#123;...&#125;]</code> to test multiple events</li>
            <li>• <strong>Validation:</strong> Each adapter output is validated against Zod schemas</li>
            <li>• <strong>Samples:</strong> Use "Load Sample" buttons to get started with example data</li>
            <li>• <strong>Real-time:</strong> Changes are processed immediately as you type</li>
          </ul>
        </div>

        {/* Main playground panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <EventPlaygroundPanel />
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>
            This playground is part of Phase 3 implementation of the Canonical Event Store.
            <br />
            Testing environment for hooks and adapters before production deployment.
          </p>
        </div>
      </div>
    </div>
  );
}