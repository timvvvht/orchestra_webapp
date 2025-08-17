// root_cause_finder.integration.test.ts - Automated root-cause finder for setState loops

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { create } from "zustand";
import { traceSet } from "../dev/traceSet";
import fs from "fs";
import path from "path";

// Import the real MCP store to test it
import { useMcpServerStore } from "../mcpServerStore";

interface RootCauseAnalysis {
  timestamp: number;
  totalSetStateCalls: number;
  uniqueSignatures: number;
  topOffenders: Array<{
    signature: string;
    count: number;
    percentage: number;
  }>;
  stackTraces: Array<{
    signature: string;
    count: number;
    firstSeen: number;
    lastSeen: number;
    sampleStack: string;
  }>;
}

describe("Root-Cause Finder Integration Test", () => {
  beforeEach(() => {
    // Clear any existing log data
    if (globalThis.__ZUSTAND_SET_LOG__) {
      globalThis.__ZUSTAND_SET_LOG__.length = 0;
    }
    
    // Ensure test-results directory exists
    const testResultsDir = path.join(process.cwd(), "test-results");
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up log data
    if (globalThis.__ZUSTAND_SET_LOG__) {
      globalThis.__ZUSTAND_SET_LOG__.length = 0;
    }
  });

  it("should detect and report setState loop root causes", async () => {
    // Set NODE_ENV to test to enable tracing
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    try {
      // Test the real MCP store to see if it has any setState loops
      const store = useMcpServerStore;
      
      // Trigger some typical MCP store operations that might cause loops
      const mockConfig = {
        id: 'test-server',
        name: 'Test Server',
        command: 'test-command',
        args: [],
        env: {}
      };
      
      // Debug: Check if tracing is enabled
      console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`Global log exists: ${!!globalThis.__ZUSTAND_SET_LOG__}`);
      console.log(`Initial log length: ${globalThis.__ZUSTAND_SET_LOG__?.length || 0}`);
      
      // Create a simple test store with tracing to verify middleware works
      const testStore = create<{ count: number; increment: () => void }>(
        traceSet((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 })),
        }))
      );
      
      console.log('Testing middleware with simple store...');
      testStore.getState().increment();
      console.log(`After test increment: ${globalThis.__ZUSTAND_SET_LOG__?.length || 0} calls`);
      
      // Try to trigger state changes through the main store
      try {
        console.log('Triggering setState calls on main store...');
        
        // Use the store's setState directly to simulate state changes
        store.setState({ isLoading: true });
        console.log(`After setState 1: ${globalThis.__ZUSTAND_SET_LOG__?.length || 0} calls`);
        
        store.setState({ isLoading: false });
        console.log(`After setState 2: ${globalThis.__ZUSTAND_SET_LOG__?.length || 0} calls`);
        
        store.setState({ selectedServerId: 'test-server' });
        store.setState({ selectedServerId: null });
        store.setState({ error: 'test error' });
        store.setState({ error: null });
        
        // Try to trigger multiple rapid setState calls to test loop detection
        for (let i = 0; i < 5; i++) {
          store.setState({ isLoading: i % 2 === 0 });
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        console.log(`After all setState calls: ${globalThis.__ZUSTAND_SET_LOG__?.length || 0} calls`);
      } catch (error) {
        console.log(`Store operations failed: ${error}`);
        // Continue with the test even if some operations fail
      }

      // Wait 500ms to allow any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Aggregate stack signatures from the global log
      const logEntries = globalThis.__ZUSTAND_SET_LOG__ || [];
      
      // Count occurrences of each stack signature
      const signatureCounts = new Map<string, {
        count: number;
        firstSeen: number;
        lastSeen: number;
        sampleStack: string;
      }>();

      for (const entry of logEntries) {
        // Use the top frame from the stack as the signature
        const signature = entry.stack && entry.stack.length > 0 ? entry.stack[0] : "unknown";
        const existing = signatureCounts.get(signature);
        if (existing) {
          existing.count++;
          existing.lastSeen = entry.timestamp;
        } else {
          signatureCounts.set(signature, {
            count: 1,
            firstSeen: entry.timestamp,
            lastSeen: entry.timestamp,
            sampleStack: entry.stack ? entry.stack.join("\\n") : "no stack"
          });
        }
      }

      // Sort by count (descending) to find top offenders
      const sortedSignatures = Array.from(signatureCounts.entries())
        .sort(([, a], [, b]) => b.count - a.count);

      // Create analysis report
      const analysis: RootCauseAnalysis = {
        timestamp: Date.now(),
        totalSetStateCalls: logEntries.length,
        uniqueSignatures: signatureCounts.size,
        topOffenders: sortedSignatures.slice(0, 10).map(([signature, data]) => ({
          signature,
          count: data.count,
          percentage: Math.round((data.count / logEntries.length) * 100)
        })),
        stackTraces: sortedSignatures.map(([signature, data]) => ({
          signature,
          count: data.count,
          firstSeen: data.firstSeen,
          lastSeen: data.lastSeen,
          sampleStack: data.sampleStack
        }))
      };

      // Write analysis to test-results/root-cause.json
      const outputPath = path.join(process.cwd(), "test-results", "root-cause.json");
      fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));

      console.log(`📊 Root-cause analysis written to: ${outputPath}`);
      console.log(`📈 Total setState calls: ${analysis.totalSetStateCalls}`);
      console.log(`🔍 Unique signatures: ${analysis.uniqueSignatures}`);
      
      if (analysis.topOffenders.length > 0) {
        console.log(`🚨 Top offender: ${analysis.topOffenders[0].signature} (${analysis.topOffenders[0].count} calls)`);
      }

      // Test assertion: no signature should appear more than 3 times
      const maxAllowedCalls = 3;
      const spamSignatures = sortedSignatures.filter(([, data]) => data.count > maxAllowedCalls);
      
      if (spamSignatures.length > 0) {
        const spamReport = spamSignatures.map(([signature, data]) => 
          `  - ${signature}: ${data.count} calls`
        ).join("\\n");
        
        console.error(`🚨 SPAM DETECTED! Signatures exceeding ${maxAllowedCalls} calls:\\n${spamReport}`);
      }

      // Expect no signature to exceed the threshold
      expect(spamSignatures.length).toBe(0);
      
      // Verify we actually captured some data
      expect(logEntries.length).toBeGreaterThan(0);
      expect(signatureCounts.size).toBeGreaterThan(0);

    } finally {
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});