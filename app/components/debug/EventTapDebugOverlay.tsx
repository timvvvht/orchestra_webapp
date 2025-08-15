/**
 * EventTapDebugOverlay - Visual debugging interface for event tap system
 * 
 * Provides a floating overlay that shows:
 * - Real-time event flow through different pipeline stages
 * - Diff analysis between SSE and Supabase representations
 * - Event inspection and comparison tools
 * - Export capabilities for debugging sessions
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  getTappedEvents, 
  clearTappedEvents, 
  exportTapSummary, 
  diffObj,
  type TapLayer 
} from '@/debug/eventTap';
import { autonomousEventTester, TestResult } from '@/debug/autonomousEventTester';
import { 
  Bug, 
  X, 
  Minimize2, 
  Maximize2, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  Settings
} from 'lucide-react';

interface EventTapDebugOverlayProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

const layerConfig: Record<TapLayer, { name: string; color: string; icon: React.ReactNode }> = {
  'raw-sse': { 
    name: 'Raw SSE', 
    color: 'bg-blue-500', 
    icon: <Zap className="w-4 h-4" /> 
  },
  'sse-parsed': { 
    name: 'SSE Parsed', 
    color: 'bg-emerald-500', 
    icon: <CheckCircle className="w-4 h-4" /> 
  },
  'raw-supa': { 
    name: 'Raw Supabase', 
    color: 'bg-purple-500', 
    icon: <Database className="w-4 h-4" /> 
  },
  'supa-processed': { 
    name: 'Supabase Processed', 
    color: 'bg-amber-500', 
    icon: <Settings className="w-4 h-4" /> 
  },
  'store': { 
    name: 'Canonical Store', 
    color: 'bg-red-500', 
    icon: <CheckCircle className="w-4 h-4" /> 
  },
  'custom': { 
    name: 'Custom', 
    color: 'bg-gray-500', 
    icon: <Eye className="w-4 h-4" /> 
  }
};

export default function EventTapDebugOverlay({ open, onClose, sessionId }: EventTapDebugOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<TapLayer | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDiffsOnly, setShowDiffsOnly] = useState(false);
  const [tappedEvents, setTappedEvents] = useState(new Map());
  
  // Autonomous testing state
  const [activeTab, setActiveTab] = useState<'monitor' | 'test' | 'duplication'>('monitor');
  const [isAutonomousTesting, setIsAutonomousTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  // Duplication fix verification state
  const [duplicationCheckResult, setDuplicationCheckResult] = useState<any>(null);
  const [isMonitoringDuplication, setIsMonitoringDuplication] = useState(false);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  // Auto-refresh tapped events
  useEffect(() => {
    if (autoRefresh && open) {
      const refresh = () => {
        setTappedEvents(new Map(getTappedEvents()));
        
        // Update test results if on test tab
        if (activeTab === 'test') {
          const latestResults = autonomousEventTester.getAllTestResults();
          if (latestResults.length !== testResults.length) {
            setTestResults(latestResults);
          }
        }
      };
      
      refresh(); // Initial load
      refreshIntervalRef.current = setInterval(refresh, 1000);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, open, activeTab, testResults.length]);

  // Manual refresh
  const handleRefresh = () => {
    setTappedEvents(new Map(getTappedEvents()));
  };

  // Export debug data
  const handleExport = () => {
    const summary = exportTapSummary();
    const blob = new Blob([JSON.stringify(summary, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-tap-debug-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear all tapped events
  const handleClear = () => {
    clearTappedEvents();
    setTappedEvents(new Map());
    setSelectedEvent(null);
  };

  // Filter events based on search term
  const filterEvents = (events: Map<string, any>) => {
    if (!searchTerm) return Array.from(events.values());
    
    return Array.from(events.values()).filter(event => 
      event.eventId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(event.event).toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(event.metadata).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Get layer statistics
  const getLayerStats = () => {
    const stats: Record<TapLayer, number> = {
      'raw-sse': 0,
      'sse-parsed': 0,
      'raw-supa': 0,
      'supa-processed': 0,
      'store': 0,
      'custom': 0
    };
    
    for (const [layer, events] of tappedEvents) {
      stats[layer as TapLayer] = events.size;
    }
    
    return stats;
  };

  // Find potential data mismatches
  const findMismatches = () => {
    const mismatches: Array<{
      eventId: string;
      layers: TapLayer[];
      differences: any[];
    }> = [];
    
    // Group events by ID across layers
    const eventGroups = new Map<string, Map<TapLayer, any>>();
    
    for (const [layer, events] of tappedEvents) {
      for (const [eventId, event] of events) {
        if (!eventGroups.has(eventId)) {
          eventGroups.set(eventId, new Map());
        }
        eventGroups.get(eventId)!.set(layer as TapLayer, event);
      }
    }
    
    // Check for differences between layers
    for (const [eventId, layerEvents] of eventGroups) {
      if (layerEvents.size < 2) continue; // Need at least 2 layers to compare
      
      const layers = Array.from(layerEvents.keys());
      const events = Array.from(layerEvents.values());
      
      // Compare first two events
      if (events.length >= 2) {
        const diff = diffObj(events[0].event, events[1].event);
        if (diff.length > 0) {
          mismatches.push({
            eventId,
            layers,
            differences: diff
          });
        }
      }
    }
    
    return mismatches;
  };

  const layerStats = getLayerStats();
  const mismatches = findMismatches();

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl"
      style={{ 
        width: isMinimized ? '320px' : '800px', 
        height: isMinimized ? '60px' : '600px' 
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-sm">Event Tap Debug</h3>
          {mismatches.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs">
              <AlertTriangle className="w-3 h-3" />
              {mismatches.length} mismatch{mismatches.length !== 1 ? 'es' : ''}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800",
              autoRefresh ? "text-green-500" : "text-gray-400"
            )}
            title={autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}
          >
            <RefreshCw className={cn("w-4 h-4", autoRefresh && "animate-spin")} />
          </button>
          
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Manual refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleExport}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Export debug data"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Clear all events"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('monitor')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'monitor'
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              Monitor
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'test'
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              Test SSE Transform
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'monitor' && (
              <div className="h-full p-4">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Bug className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Event monitoring interface</p>
                  <p className="text-sm">Layer stats: {Object.entries(layerStats).map(([layer, count]) => `${layer}: ${count}`).join(', ')}</p>
                  {mismatches.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        {mismatches.length} data mismatch{mismatches.length !== 1 ? 'es' : ''} detected
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'test' && (
              <div className="h-full p-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="text-lg font-medium mb-2">SSE Transformation Tester</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Test SSE event transformation to verify field mappings and data flow
                    </p>
                  </div>

                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={async () => {
                        try {
                          const { runQuickSSETest } = await import('@/debug/runSSETests');
                          await runQuickSSETest();
                        } catch (error) {
                          console.error('Failed to run SSE test:', error);
                        }
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Run Quick Test
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          const { runContinuousSSETest } = await import('@/debug/runSSETests');
                          await runContinuousSSETest();
                        } catch (error) {
                          console.error('Failed to run continuous SSE test:', error);
                        }
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Run Continuous Test
                    </button>

                    <button
                      onClick={() => {
                        // Clear console for clean test output
                        console.clear();
                        console.log('🧪 SSE Transform Test Console Cleared');
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Clear Console
                    </button>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h5 className="font-medium mb-2">Test Instructions:</h5>
                    <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>1. Click "Run Quick Test" to test SSE transformation once</li>
                      <li>2. Check the browser console for detailed test results</li>
                      <li>3. Look for field mapping analysis and any transformation issues</li>
                      <li>4. Use "Run Continuous Test" to test repeatedly over time</li>
                      <li>5. Check for consistency in transformation results</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">What This Tests:</h5>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• SSE event structure parsing</li>
                      <li>• Field mapping from nested data structures</li>
                      <li>• Tool call ID extraction</li>
                      <li>• Result content mapping</li>
                      <li>• Success flag handling</li>
                      <li>• Event transformation consistency</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}