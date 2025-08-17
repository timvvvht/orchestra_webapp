import React from 'react';
import { Link } from 'react-router-dom';

export default function DebugIndex() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">🎭 Orchestra Debug Harness</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Simple Chat Debug */}
          <Link
            to="/chat-debug"
            className="block p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
              <h2 className="text-xl font-semibold">Simple Chat Debug</h2>
            </div>
            <p className="text-gray-400 mb-4">
              Minimal chat interface with mock SSE events. No dependencies, just pure UI testing.
            </p>
            <div className="text-sm text-blue-400">
              ✅ Recommended for UI development
            </div>
          </Link>

          {/* Full Chat Debug */}
          <Link
            to="/chat-debug-full"
            className="block p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-yellow-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-yellow-400 rounded-full" />
              <h2 className="text-xl font-semibold">Full Chat Debug</h2>
            </div>
            <p className="text-gray-400 mb-4">
              Complete Orchestra chat interface with ACS integration and mock streaming service.
            </p>
            <div className="text-sm text-yellow-400">
              ⚠️ May have dependency issues
            </div>
          </Link>

          {/* SSE Event Inspector */}
          <Link
            to="/sse-mock-debug"
            className="block p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-purple-400 rounded-full" />
              <h2 className="text-xl font-semibold">SSE Event Inspector</h2>
            </div>
            <p className="text-gray-400 mb-4">
              Detailed view of SSE events with connect/disconnect controls and event history.
            </p>
            <div className="text-sm text-purple-400">
              🔍 Great for debugging events
            </div>
          </Link>

          {/* Tool Approval Test */}
          <Link
            to="/tool-approval-test"
            className="block p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-amber-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-amber-400 rounded-full" />
              <h2 className="text-xl font-semibold">Tool Approval Test</h2>
            </div>
            <p className="text-gray-400 mb-4">
              Test the local tool approval workflow with mock jobs and preference settings.
            </p>
            <div className="text-sm text-amber-400">
              🛡️ Security & Approval Testing
            </div>
          </Link>

          {/* SCM Debug Interface */}
          <Link
            to="/debug/scm"
            className="block p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-green-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
              <h2 className="text-xl font-semibold">SCM Debug Interface</h2>
            </div>
            <p className="text-gray-400 mb-4">
              View and verify SCM (Source Code Management) integration. Test checkpoints, view history, and monitor SCM operations.
            </p>
            <div className="text-sm text-green-400">
              🔧 SCM Integration Testing
            </div>
          </Link>

          {/* Existing SSE Debug */}
          <Link
            to="/sse-debug-test"
            className="block p-6 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <h2 className="text-xl font-semibold">Legacy SSE Debug</h2>
            </div>
            <p className="text-gray-400 mb-4">
              Original SSE debugging page from the Orchestra codebase.
            </p>
            <div className="text-sm text-gray-400">
              📜 Legacy implementation
            </div>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-400">🎯 Quick Start</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Start with <strong>Simple Chat Debug</strong> for basic UI testing</li>
            <li>Use <strong>SSE Event Inspector</strong> to understand event flow</li>
            <li>Try <strong>SCM Debug Interface</strong> to verify source code management integration</li>
            <li>Use <strong>Full Chat Debug</strong> for complete integration testing</li>
          </ol>
        </div>

        <div className="mt-8 p-6 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">📚 Documentation</h3>
          <p className="text-gray-400 mb-4">
            For detailed information about the debug harness implementation, see:
          </p>
          <code className="text-sm bg-black px-3 py-1 rounded text-green-400">
            /DEBUG_HARNESS_README.md
          </code>
        </div>
      </div>
    </div>
  );
}