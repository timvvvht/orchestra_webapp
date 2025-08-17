/**
 * autonomousEventTester.ts - Autonomous testing system for event pipeline debugging
 * 
 * This system continuously monitors and compares data flows between SSE and Supabase
 * pipelines to identify mismatches, duplications, and synchronization issues.
 * 
 * Features:
 * - Autonomous testing loops
 * - Real-time data comparison
 * - Mismatch detection and reporting
 * - Performance monitoring
 * - Export capabilities for debugging
 */

import { getTappedEvents, clearTappedEvents } from './eventTap';
import { useEventStore } from '@/stores/eventStore';
import { handleSsePayload } from '@/stores/eventBridges/sseBridge';
import { hydrateSession } from '@/stores/eventBridges/historyBridge';

interface TestResult {
  testId: string;
  timestamp: string;
  duration: number;
  success: boolean;
  mismatches: DataMismatch[];
  performance: PerformanceMetrics;
  summary: TestSummary;
}

interface DataMismatch {
  type: 'missing_event' | 'data_difference' | 'timing_issue' | 'duplicate_event';
  layer1: string;
  layer2: string;
  eventId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
}

interface PerformanceMetrics {
  sseProcessingTime: number;
  supabaseProcessingTime: number;
  storeEntryTime: number;
  totalEvents: number;
  eventsPerSecond: number;
}

interface TestSummary {
  totalEvents: number;
  sseEvents: number;
  supabaseEvents: number;
  storeEvents: number;
  matchedPairs: number;
  unmatchedEvents: number;
  duplicates: number;
}

class AutonomousEventTester {
  private isRunning = false;
  private testResults: TestResult[] = [];
  private currentTestId: string | null = null;
  private testStartTime: number = 0;

  /**
   * Start autonomous testing loop
   */
  async startAutonomousTesting(options: {
    intervalMs?: number;
    maxTests?: number;
    sessionId?: string;
  } = {}): Promise<void> {
    const { intervalMs = 30000, maxTests = 100, sessionId } = options;

    if (this.isRunning) {
      console.warn('[AutonomousEventTester] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AutonomousEventTester] 🚀 Starting autonomous testing loop', {
      intervalMs,
      maxTests,
      sessionId
    });

    let testCount = 0;
    while (this.isRunning && testCount < maxTests) {
      try {
        await this.runSingleTest(sessionId);
        testCount++;
        
        if (this.isRunning) {
          await this.sleep(intervalMs);
        }
      } catch (error) {
        console.error('[AutonomousEventTester] Test failed:', error);
        await this.sleep(intervalMs);
      }
    }

    console.log('[AutonomousEventTester] 🏁 Autonomous testing completed', {
      totalTests: testCount,
      results: this.getTestSummary()
    });
  }

  /**
   * Stop autonomous testing
   */
  stopAutonomousTesting(): void {
    this.isRunning = false;
    console.log('[AutonomousEventTester] 🛑 Stopping autonomous testing');
  }

  /**
   * Run a single comprehensive test
   */
  async runSingleTest(sessionId?: string): Promise<TestResult> {
    this.currentTestId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.testStartTime = Date.now();

    console.log(`[AutonomousEventTester] 🧪 Running test: ${this.currentTestId}`);

    // Clear tapped events to start fresh
    clearTappedEvents();

    // Simulate both SSE and Supabase data flows
    await this.simulateDataFlows(sessionId);

    // Wait for processing to complete
    await this.sleep(2000);

    // Analyze the captured events
    const result = await this.analyzeEventFlows();

    this.testResults.push(result);
    console.log(`[AutonomousEventTester] ✅ Test completed: ${this.currentTestId}`, {
      success: result.success,
      mismatches: result.mismatches.length,
      duration: result.duration
    });

    return result;
  }

  /**
   * Simulate both SSE and Supabase data flows for testing
   */
  private async simulateDataFlows(sessionId?: string): Promise<void> {
    const testSessionId = sessionId || `test_session_${Date.now()}`;

    // Simulate SSE events
    await this.simulateSseEvents(testSessionId);

    // Simulate Supabase data loading
    if (sessionId) {
      // Use real session data if provided
      await this.loadSupabaseData(sessionId);
    } else {
      // Create mock Supabase data for testing
      await this.simulateSupabaseData(testSessionId);
    }
  }

  /**
   * Simulate SSE events for testing
   */
  private async simulateSseEvents(sessionId: string): Promise<void> {
    const mockSseEvents = [
      {
        v: 2,
        type: 'agent_event',
        payload: {
          event_id: `sse_tool_call_${Date.now()}`,
          session_id: sessionId,
          event_type: 'tool_call',
          timestamp: Date.now() / 1000,
          data: {
            tool_call_id: `call_${Date.now()}`,
            tool_name: 'search_files',
            tool_arguments: { paths: ['/workspace'], pattern: '*.py' }
          },
          message_id: `msg_${Date.now()}`,
        },
      },
      {
        v: 2,
        type: 'agent_event',
        payload: {
          event_id: `sse_tool_result_${Date.now()}`,
          session_id: sessionId,
          event_type: 'tool_result',
          timestamp: Date.now() / 1000,
          data: {
            tool_call_id: `call_${Date.now()}`,
            result: { files: ['test.py', 'main.py'] },
            success: true
          },
          message_id: `msg_${Date.now()}`,
        },
      }
    ];

    for (const event of mockSseEvents) {
      handleSsePayload(event);
      await this.sleep(100); // Small delay between events
    }
  }

  /**
   * Load real Supabase data for comparison
   */
  private async loadSupabaseData(sessionId: string): Promise<void> {
    try {
      await hydrateSession(sessionId);
    } catch (error) {
      console.warn('[AutonomousEventTester] Failed to load Supabase data:', error);
    }
  }

  /**
   * Simulate Supabase data for testing
   */
  private async simulateSupabaseData(sessionId: string): Promise<void> {
    // This would normally come from the database
    // For testing, we'll simulate the data structure
    console.log('[AutonomousEventTester] Simulating Supabase data for session:', sessionId);
    
    // In a real scenario, this would trigger the historyBridge
    // For now, we'll just log that we would load this data
  }

  /**
   * Analyze captured event flows and detect mismatches
   */
  private async analyzeEventFlows(): Promise<TestResult> {
    const endTime = Date.now();
    const duration = endTime - this.testStartTime;
    const eventHistory = getEventHistory();

    // Group events by layer
    const eventsByLayer = this.groupEventsByLayer(eventHistory);

    // Detect mismatches
    const mismatches = this.detectMismatches(eventsByLayer);

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(eventHistory, duration);

    // Generate summary
    const summary = this.generateTestSummary(eventsByLayer);

    const result: TestResult = {
      testId: this.currentTestId!,
      timestamp: new Date().toISOString(),
      duration,
      success: mismatches.length === 0,
      mismatches,
      performance,
      summary
    };

    return result;
  }

  /**
   * Group events by their tap layer
   */
  private groupEventsByLayer(eventHistory: EventTapEntry[]): Record<string, EventTapEntry[]> {
    const grouped: Record<string, EventTapEntry[]> = {};
    
    for (const entry of eventHistory) {
      if (!grouped[entry.layer]) {
        grouped[entry.layer] = [];
      }
      grouped[entry.layer].push(entry);
    }

    return grouped;
  }

  /**
   * Detect mismatches between different layers
   */
  private detectMismatches(eventsByLayer: Record<string, EventTapEntry[]>): DataMismatch[] {
    const mismatches: DataMismatch[] = [];

    // Compare raw SSE vs parsed SSE
    mismatches.push(...this.compareEventLayers(
      eventsByLayer['raw-sse'] || [],
      eventsByLayer['sse-parsed'] || [],
      'raw-sse',
      'sse-parsed'
    ));

    // Compare SSE parsed vs store entry
    mismatches.push(...this.compareEventLayers(
      eventsByLayer['sse-parsed'] || [],
      eventsByLayer['store-entry'] || [],
      'sse-parsed',
      'store-entry'
    ));

    // Compare Supabase raw vs parsed
    mismatches.push(...this.compareEventLayers(
      eventsByLayer['supabase-raw'] || [],
      eventsByLayer['supabase-parsed'] || [],
      'supabase-raw',
      'supabase-parsed'
    ));

    // Compare Supabase parsed vs store entry
    mismatches.push(...this.compareEventLayers(
      eventsByLayer['supabase-parsed'] || [],
      eventsByLayer['store-entry'] || [],
      'supabase-parsed',
      'store-entry'
    ));

    // Detect duplicates within store
    mismatches.push(...this.detectDuplicates(eventsByLayer['store-entry'] || []));

    return mismatches;
  }

  /**
   * Compare events between two layers
   */
  private compareEventLayers(
    layer1Events: EventTapEntry[],
    layer2Events: EventTapEntry[],
    layer1Name: string,
    layer2Name: string
  ): DataMismatch[] {
    const mismatches: DataMismatch[] = [];

    // Check for missing events
    const layer1Ids = new Set(layer1Events.map(e => e.eventId));
    const layer2Ids = new Set(layer2Events.map(e => e.eventId));

    for (const id of layer1Ids) {
      if (!layer2Ids.has(id)) {
        mismatches.push({
          type: 'missing_event',
          layer1: layer1Name,
          layer2: layer2Name,
          eventId: id,
          description: `Event ${id} present in ${layer1Name} but missing in ${layer2Name}`,
          severity: 'high',
          details: { layer1Events: layer1Events.filter(e => e.eventId === id) }
        });
      }
    }

    // Check for data differences in matching events
    for (const layer1Event of layer1Events) {
      const layer2Event = layer2Events.find(e => e.eventId === layer1Event.eventId);
      if (layer2Event) {
        const differences = this.compareEventData(layer1Event.event, layer2Event.event);
        if (differences.length > 0) {
          mismatches.push({
            type: 'data_difference',
            layer1: layer1Name,
            layer2: layer2Name,
            eventId: layer1Event.eventId,
            description: `Data differences found between ${layer1Name} and ${layer2Name}`,
            severity: 'medium',
            details: { differences, layer1Event, layer2Event }
          });
        }
      }
    }

    return mismatches;
  }

  /**
   * Compare event data and return differences
   */
  private compareEventData(event1: any, event2: any): string[] {
    const differences: string[] = [];

    // Deep comparison logic would go here
    // For now, we'll do a simple JSON comparison
    try {
      const json1 = JSON.stringify(event1, null, 2);
      const json2 = JSON.stringify(event2, null, 2);
      
      if (json1 !== json2) {
        differences.push('JSON representation differs');
      }
    } catch (error) {
      differences.push('Failed to compare JSON representations');
    }

    return differences;
  }

  /**
   * Detect duplicate events within a layer
   */
  private detectDuplicates(events: EventTapEntry[]): DataMismatch[] {
    const mismatches: DataMismatch[] = [];
    const seenIds = new Set<string>();
    const duplicates = new Set<string>();

    for (const event of events) {
      if (seenIds.has(event.eventId)) {
        duplicates.add(event.eventId);
      } else {
        seenIds.add(event.eventId);
      }
    }

    for (const duplicateId of duplicates) {
      mismatches.push({
        type: 'duplicate_event',
        layer1: 'store-entry',
        layer2: 'store-entry',
        eventId: duplicateId,
        description: `Duplicate event detected: ${duplicateId}`,
        severity: 'critical',
        details: { duplicateEvents: events.filter(e => e.eventId === duplicateId) }
      });
    }

    return mismatches;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(eventHistory: EventTapEntry[], duration: number): PerformanceMetrics {
    const sseEvents = eventHistory.filter(e => e.layer.includes('sse'));
    const supabaseEvents = eventHistory.filter(e => e.layer.includes('supabase'));
    const storeEvents = eventHistory.filter(e => e.layer.includes('store'));

    return {
      sseProcessingTime: this.calculateLayerProcessingTime(sseEvents),
      supabaseProcessingTime: this.calculateLayerProcessingTime(supabaseEvents),
      storeEntryTime: this.calculateLayerProcessingTime(storeEvents),
      totalEvents: eventHistory.length,
      eventsPerSecond: eventHistory.length / (duration / 1000)
    };
  }

  /**
   * Calculate processing time for a layer
   */
  private calculateLayerProcessingTime(events: EventTapEntry[]): number {
    if (events.length === 0) return 0;

    const timestamps = events.map(e => new Date(e.timestamp).getTime());
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(eventsByLayer: Record<string, EventTapEntry[]>): TestSummary {
    const sseEvents = (eventsByLayer['raw-sse'] || []).length;
    const supabaseEvents = (eventsByLayer['supabase-raw'] || []).length;
    const storeEvents = (eventsByLayer['store-entry'] || []).length;

    return {
      totalEvents: Object.values(eventsByLayer).flat().length,
      sseEvents,
      supabaseEvents,
      storeEvents,
      matchedPairs: Math.min(sseEvents, supabaseEvents),
      unmatchedEvents: Math.abs(sseEvents - supabaseEvents),
      duplicates: this.countDuplicates(eventsByLayer['store-entry'] || [])
    };
  }

  /**
   * Count duplicate events
   */
  private countDuplicates(events: EventTapEntry[]): number {
    const seenIds = new Set<string>();
    let duplicates = 0;

    for (const event of events) {
      if (seenIds.has(event.eventId)) {
        duplicates++;
      } else {
        seenIds.add(event.eventId);
      }
    }

    return duplicates;
  }

  /**
   * Get test results summary
   */
  getTestSummary(): {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averageDuration: number;
    totalMismatches: number;
  } {
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const averageDuration = totalTests > 0 
      ? this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests 
      : 0;
    const totalMismatches = this.testResults.reduce((sum, r) => sum + r.mismatches.length, 0);

    return {
      totalTests,
      successfulTests,
      failedTests,
      averageDuration,
      totalMismatches
    };
  }

  /**
   * Get all test results
   */
  getAllTestResults(): TestResult[] {
    return [...this.testResults];
  }

  /**
   * Get latest test result
   */
  getLatestTestResult(): TestResult | null {
    return this.testResults.length > 0 ? this.testResults[this.testResults.length - 1] : null;
  }

  /**
   * Export test results for analysis
   */
  exportTestResults(): string {
    return JSON.stringify({
      summary: this.getTestSummary(),
      results: this.testResults,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Clear test results
   */
  clearTestResults(): void {
    this.testResults = [];
    console.log('[AutonomousEventTester] Test results cleared');
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const autonomousEventTester = new AutonomousEventTester();

// Export types for external use
export type {
  TestResult,
  DataMismatch,
  PerformanceMetrics,
  TestSummary
};

// Development helpers
if (import.meta.env.DEV) {
  // Expose to window for debugging
  (window as any).autonomousEventTester = autonomousEventTester;
  
  console.log('[AutonomousEventTester] 🧪 Autonomous Event Tester initialized');
  console.log('Use autonomousEventTester.startAutonomousTesting() to begin testing');
  console.log('Use autonomousEventTester.runSingleTest() for one-off tests');
}