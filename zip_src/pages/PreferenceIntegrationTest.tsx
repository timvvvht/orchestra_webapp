// /Users/tim/Code/orchestra/src/pages/PreferenceIntegrationTest.tsx
// -----------------------------------------------------------------------------
// Preference Integration Test - Verify Basic Store Functionality
// -----------------------------------------------------------------------------
// Tests the fundamental preference storage and retrieval without any SSE complexity.
// This ensures the Zustand store, localStorage, and cross-tab sync actually work.
// -----------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TestTube, Check, X, RefreshCw, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingToolsStore, type Preference } from '@/stores/pendingToolsStore';
import { SENSITIVE_TOOLS, type SensitiveTool } from '@/config/approvalTools';

export default function PreferenceIntegrationTest() {
  const { prefs, setPref } = usePendingToolsStore();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [rawLocalStorage, setRawLocalStorage] = useState<string>('');
  const [parsedStorage, setParsedStorage] = useState<any>(null);

  // Refresh storage display
  const refreshStorage = () => {
    const raw = localStorage.getItem('pending-tools-store') || '';
    setRawLocalStorage(raw);
    
    try {
      const parsed = JSON.parse(raw);
      setParsedStorage(parsed);
    } catch (e) {
      setParsedStorage({ error: 'Failed to parse JSON' });
    }
  };

  // Auto-refresh storage on mount and when prefs change
  useEffect(() => {
    refreshStorage();
  }, [prefs]);

  // Test functions
  const runTest = async (testName: string, testFn: () => Promise<boolean> | boolean) => {
    try {
      const result = await testFn();
      setTestResults(prev => ({ ...prev, [testName]: result }));
      return result;
    } catch (error) {
      console.error(`Test ${testName} failed:`, error);
      setTestResults(prev => ({ ...prev, [testName]: false }));
      return false;
    }
  };

  const tests = {
    'Set Preference': async () => {
      console.log('🧪 Test: Setting str_replace_editor to "always"');
      setPref('str_replace_editor', 'always');
      
      // Wait a tick for state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentPrefs = usePendingToolsStore.getState().prefs;
      const success = currentPrefs['str_replace_editor'] === 'always';
      console.log('🧪 Result:', success, 'Current prefs:', currentPrefs);
      return success;
    },

    'Get Preference': async () => {
      console.log('🧪 Test: Getting str_replace_editor preference');
      const currentPrefs = usePendingToolsStore.getState().prefs;
      const pref = currentPrefs['str_replace_editor'];
      const success = pref === 'always';
      console.log('🧪 Result:', success, 'Retrieved pref:', pref);
      return success;
    },

    'LocalStorage Persistence': async () => {
      console.log('🧪 Test: Checking localStorage persistence');
      const stored = localStorage.getItem('pending-tools-store');
      if (!stored) {
        console.log('🧪 Result: false - No localStorage entry');
        return false;
      }
      
      try {
        const parsed = JSON.parse(stored);
        const storedPref = parsed.state?.prefs?.['str_replace_editor'];
        const success = storedPref === 'always';
        console.log('🧪 Result:', success, 'Stored pref:', storedPref);
        return success;
      } catch (e) {
        console.log('🧪 Result: false - Failed to parse localStorage');
        return false;
      }
    },

    'Change to Never': async () => {
      console.log('🧪 Test: Changing str_replace_editor to "never"');
      setPref('str_replace_editor', 'never');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentPrefs = usePendingToolsStore.getState().prefs;
      const success = currentPrefs['str_replace_editor'] === 'never';
      console.log('🧪 Result:', success, 'Current prefs:', currentPrefs);
      return success;
    },

    'Multiple Tools': async () => {
      console.log('🧪 Test: Setting preferences for multiple tools');
      setPref('cp', 'ask');
      setPref('mv', 'always');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentPrefs = usePendingToolsStore.getState().prefs;
      const success = currentPrefs['cp'] === 'ask' && currentPrefs['mv'] === 'always';
      console.log('🧪 Result:', success, 'Current prefs:', currentPrefs);
      return success;
    },

    'Store Rehydration': async () => {
      console.log('🧪 Test: Manual store rehydration');
      
      // Manually trigger rehydration
      usePendingToolsStore.persist.rehydrate();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const currentPrefs = usePendingToolsStore.getState().prefs;
      const success = Object.keys(currentPrefs).length > 0;
      console.log('🧪 Result:', success, 'Rehydrated prefs:', currentPrefs);
      return success;
    }
  };

  const runAllTests = async () => {
    console.log('🧪 Starting preference integration tests...');
    setTestResults({});
    
    for (const [testName, testFn] of Object.entries(tests)) {
      await runTest(testName, testFn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('🧪 All tests completed');
    refreshStorage();
  };

  const clearAllData = () => {
    console.log('🧪 Clearing all preference data');
    localStorage.removeItem('pending-tools-store');
    
    // Reset store state
    const store = usePendingToolsStore.getState();
    Object.keys(store.prefs).forEach(tool => {
      setPref(tool as SensitiveTool, 'ask');
    });
    
    setTestResults({});
    refreshStorage();
  };

  const getTestIcon = (testName: string) => {
    if (!(testName in testResults)) return <TestTube className="w-4 h-4 text-gray-400" />;
    return testResults[testName] 
      ? <Check className="w-4 h-4 text-green-400" />
      : <X className="w-4 h-4 text-red-400" />;
  };

  const getTestColor = (testName: string) => {
    if (!(testName in testResults)) return 'border-gray-500/30 bg-gray-600/10';
    return testResults[testName]
      ? 'border-green-500/30 bg-green-600/10'
      : 'border-red-500/30 bg-red-600/10';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <TestTube className="w-8 h-8 text-blue-400" />
            Preference Integration Test
          </h1>
          <p className="text-white/60">
            Verify that preference storage, retrieval, and persistence actually work
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Tests */}
          <div className="space-y-6">
            {/* Test Controls */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4">Test Controls</h2>
              
              <div className="flex gap-3 mb-6">
                <motion.button
                  onClick={runAllTests}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-blue-600/20 hover:bg-blue-600/30",
                    "border border-blue-500/30 hover:border-blue-500/50",
                    "text-blue-400 hover:text-blue-300",
                    "transition-all duration-200 font-medium"
                  )}
                >
                  <TestTube className="w-4 h-4" />
                  Run All Tests
                </motion.button>
                
                <motion.button
                  onClick={clearAllData}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-red-600/20 hover:bg-red-600/30",
                    "border border-red-500/30 hover:border-red-500/50",
                    "text-red-400 hover:text-red-300",
                    "transition-all duration-200 font-medium"
                  )}
                >
                  <X className="w-4 h-4" />
                  Clear All Data
                </motion.button>
                
                <motion.button
                  onClick={refreshStorage}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-amber-600/20 hover:bg-amber-600/30",
                    "border border-amber-500/30 hover:border-amber-500/50",
                    "text-amber-400 hover:text-amber-300",
                    "transition-all duration-200 font-medium"
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </motion.button>
              </div>

              {/* Test Results */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white">Test Results</h3>
                {Object.entries(tests).map(([testName]) => (
                  <div key={testName} className={cn(
                    "p-3 rounded-lg border transition-all duration-200",
                    getTestColor(testName)
                  )}>
                    <div className="flex items-center gap-3">
                      {getTestIcon(testName)}
                      <span className="font-medium text-white">{testName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Store State */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4">Current Store State</h2>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white/80">Preferences in Zustand Store</h3>
                {SENSITIVE_TOOLS.map(tool => (
                  <div key={tool} className="flex justify-between items-center p-2 rounded bg-black/20">
                    <span className="text-white/70 font-mono text-sm">{tool}</span>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      prefs[tool] === 'always' ? "bg-green-600/20 text-green-400" :
                      prefs[tool] === 'never' ? "bg-red-600/20 text-red-400" :
                      "bg-amber-600/20 text-amber-400"
                    )}>
                      {prefs[tool] || 'ask'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Storage Inspection */}
          <div className="space-y-6">
            {/* Raw localStorage */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Raw localStorage
              </h2>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-white/80 mb-2">Key: pending-tools-store</h3>
                  <div className="p-3 rounded bg-black/20 border border-white/10">
                    <pre className="text-xs text-white/70 whitespace-pre-wrap break-all">
                      {rawLocalStorage || 'No data stored'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Parsed Storage */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4">Parsed Storage</h2>
              
              <div className="p-3 rounded bg-black/20 border border-white/10">
                <pre className="text-xs text-white/70 whitespace-pre-wrap">
                  {JSON.stringify(parsedStorage, null, 2)}
                </pre>
              </div>
            </div>

            {/* Manual Preference Test */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4">Manual Test</h2>
              
              <div className="space-y-3">
                <p className="text-sm text-white/60">
                  Test individual preference changes:
                </p>
                
                {SENSITIVE_TOOLS.map(tool => (
                  <div key={tool} className="flex items-center gap-2">
                    <span className="text-sm text-white/70 min-w-[120px] font-mono">{tool}</span>
                    <div className="flex gap-1">
                      {(['always', 'ask', 'never'] as const).map(pref => (
                        <button
                          key={pref}
                          onClick={() => setPref(tool, pref)}
                          className={cn(
                            "px-2 py-1 text-xs rounded border transition-all",
                            prefs[tool] === pref
                              ? "bg-blue-600/30 border-blue-500/50 text-blue-300"
                              : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                          )}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 rounded-lg bg-blue-600/10 border border-blue-500/30">
          <h3 className="text-lg font-semibold text-blue-200 mb-3">🔍 How to Use</h3>
          <ol className="space-y-2 text-sm text-blue-200/80">
            <li><strong>1. Run Tests:</strong> Click "Run All Tests" to verify basic functionality</li>
            <li><strong>2. Check Console:</strong> Open browser console for detailed test logs</li>
            <li><strong>3. Manual Test:</strong> Use the manual controls to test individual preferences</li>
            <li><strong>4. Cross-Tab Test:</strong> Open this page in another tab and verify changes sync</li>
            <li><strong>5. Persistence Test:</strong> Refresh the page and verify preferences persist</li>
          </ol>
        </div>
      </div>
    </div>
  );
}