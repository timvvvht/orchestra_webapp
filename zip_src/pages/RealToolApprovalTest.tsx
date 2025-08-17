// /Users/tim/Code/orchestra/src/pages/RealToolApprovalTest.tsx
// -----------------------------------------------------------------------------
// REAL Tool Approval Test - Triggers Actual SSE Events
// -----------------------------------------------------------------------------
// This page tests the FULL approval workflow by sending real chat messages
// that trigger sensitive tools through the actual SSE pipeline.
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Send, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useACSChatUIRefactored } from '@/hooks/acs-chat';
import ToolApprovalSettings from '@/components/settings/ToolApprovalSettings';

export default function RealToolApprovalTest() {
  const [testMessage, setTestMessage] = useState('Create a file called approval-test.txt with the content "This is a test of the approval workflow"');
  
  // Use real ACS chat hook to trigger actual tool calls
  const {
    sendMessage,
    messages,
    isLoading,
    currentSessionId,
    acsClient
  } = useACSChatUIRefactored({
    userId: 'test-user',
    debug: true
  });

  const handleSendTest = async () => {
    if (!testMessage.trim()) return;
    
    console.log('🧪 [RealToolApprovalTest] Sending test message that should trigger str_replace_editor');
    console.log('🧪 [RealToolApprovalTest] Message:', testMessage);
    
    try {
      await sendMessage(testMessage);
    } catch (error) {
      console.error('🧪 [RealToolApprovalTest] Error sending message:', error);
    }
  };

  const predefinedTests = [
    {
      name: 'File Creation (str_replace_editor)',
      message: 'Create a file called approval-test.txt with the content "This is a test of the approval workflow"',
      tool: 'str_replace_editor'
    },
    {
      name: 'File Copy (cp)',
      message: 'Copy the file approval-test.txt to approval-test-copy.txt',
      tool: 'cp'
    },
    {
      name: 'Shell Command (execute_in_runner_session)',
      message: 'Run the command "echo Hello from approval test" in the shell',
      tool: 'execute_in_runner_session'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Shield className="w-8 h-8 text-amber-400" />
            Real Tool Approval Test
          </h1>
          <p className="text-white/60">
            Test the approval workflow with actual SSE events and tool execution
          </p>
        </div>

        {/* Warning */}
        <div className="p-4 rounded-lg bg-amber-600/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <p className="font-medium mb-2">⚠️ This triggers REAL tool execution!</p>
              <ul className="space-y-1 text-amber-200/80">
                <li>• Messages go through the actual ACS chat pipeline</li>
                <li>• Tools will execute based on your approval preferences</li>
                <li>• Check browser console for LocalToolOrchestrator logs</li>
                <li>• Session ID: <code className="bg-black/20 px-1 rounded">{currentSessionId || 'Not connected'}</code></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Test Controls */}
          <div className="space-y-6">
            {/* Custom Message Test */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Custom Test Message
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Test Message (will trigger tool execution)
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full p-3 rounded-lg bg-black/20 border border-white/20 text-white resize-none"
                    rows={3}
                    placeholder="Enter a message that will trigger a sensitive tool..."
                  />
                </div>
                
                <motion.button
                  onClick={handleSendTest}
                  disabled={isLoading || !testMessage.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-blue-600/20 hover:bg-blue-600/30",
                    "border border-blue-500/30 hover:border-blue-500/50",
                    "text-blue-400 hover:text-blue-300",
                    "transition-all duration-200 font-medium",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                  {isLoading ? 'Sending...' : 'Send Test Message'}
                </motion.button>
              </div>
            </div>

            {/* Predefined Tests */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4">
                Predefined Tool Tests
              </h2>
              
              <div className="space-y-3">
                {predefinedTests.map((test, index) => (
                  <div key={index} className="p-3 rounded bg-white/5 border border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white mb-1">{test.name}</h3>
                        <p className="text-sm text-white/60 mb-2">{test.message}</p>
                        <code className="text-xs text-amber-400 bg-black/20 px-2 py-1 rounded">
                          {test.tool}
                        </code>
                      </div>
                      <motion.button
                        onClick={() => setTestMessage(test.message)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 text-xs bg-blue-600/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-600/30"
                      >
                        Use
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Messages */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4">
                Recent Messages ({messages.length})
              </h2>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-white/40 text-sm">No messages yet</p>
                ) : (
                  messages.slice(-5).map((msg, index) => (
                    <div key={index} className="p-2 rounded bg-black/20 text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white/80 font-medium">{msg.role}</span>
                        <span className="text-white/40">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-white/60">{msg.content.substring(0, 100)}...</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div>
            <ToolApprovalSettings />
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 rounded-lg bg-blue-600/10 border border-blue-500/30">
          <h3 className="text-lg font-semibold text-blue-200 mb-3">🔍 How to Test</h3>
          <ol className="space-y-2 text-sm text-blue-200/80">
            <li><strong>1. Set Preferences:</strong> Configure tool approval settings in the right panel</li>
            <li><strong>2. Open Console:</strong> Press F12 → Console tab to see orchestrator logs</li>
            <li><strong>3. Send Message:</strong> Use predefined tests or write your own</li>
            <li><strong>4. Watch Logs:</strong> Look for <code className="bg-black/20 px-1 rounded">🔧 [LTO]</code> prefixed logs</li>
            <li><strong>5. Test Approval:</strong> If set to "ask", approve/reject in the UI</li>
          </ol>
        </div>
      </div>
    </div>
  );
}