/**
 * Debug Printing Utilities for MCP Tests
 * 
 * Provides utilities to print diagnostic information when MCP tests fail,
 * helping to identify the root cause of infinite render loops and other issues.
 */

import { afterEach } from 'vitest';

// Global state for tracking diagnostics
let testDiagnostics: {
  renderCounts: Record<string, number>;
  selectorRefChanges: Record<string, number>;
  lastError: Error | null;
} = {
  renderCounts: {},
  selectorRefChanges: {},
  lastError: null
};

/**
 * Print comprehensive debug information about the current test state
 */
export function printDebugInfo(testName?: string) {
  const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
  const truncatedCalls = setStateCalls.slice(-20); // Last 20 calls
  
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 MCP DEBUG REPORT${testName ? ` - ${testName}` : ''}`);
  console.log('='.repeat(80));
  
  // Zustand setState calls
  console.log('\n📊 ZUSTAND SETSTATE CALLS:');
  console.log(`Total calls: ${setStateCalls.length}`);
  if (setStateCalls.length > 20) {
    console.log(`(Showing last 20 of ${setStateCalls.length} calls)`);
  }
  
  truncatedCalls.forEach((call, index) => {
    const actualIndex = setStateCalls.length - truncatedCalls.length + index;
    console.log(`  ${actualIndex + 1}. [${call.label}] ${new Date(call.timestamp).toISOString()}`);
    console.log(`     Partial:`, JSON.stringify(call.partial, null, 2).slice(0, 200));
    if (call.stack && call.stack.length > 0) {
      console.log(`     Stack: ${call.stack[0]}`);
    }
    console.log('');
  });
  
  // Render counts
  console.log('\n🔄 RENDER COUNTS:');
  Object.entries(testDiagnostics.renderCounts).forEach(([component, count]) => {
    console.log(`  ${component}: ${count} renders`);
  });
  
  // Selector reference changes
  console.log('\n🔗 SELECTOR REFERENCE CHANGES:');
  Object.entries(testDiagnostics.selectorRefChanges).forEach(([selector, count]) => {
    console.log(`  ${selector}: ${count} reference changes`);
  });
  
  // Last error
  if (testDiagnostics.lastError) {
    console.log('\n❌ LAST ERROR:');
    console.log(`  Message: ${testDiagnostics.lastError.message}`);
    console.log(`  Stack: ${testDiagnostics.lastError.stack?.split('\n').slice(0, 5).join('\n')}`);
  }
  
  // Memory usage (if available)
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    console.log('\n💾 MEMORY USAGE:');
    console.log(`  Used: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
    console.log(`  Total: ${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`);
    console.log(`  Limit: ${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`);
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Track render count for a component
 */
export function trackRenderCount(componentName: string) {
  testDiagnostics.renderCounts[componentName] = 
    (testDiagnostics.renderCounts[componentName] || 0) + 1;
}

/**
 * Track selector reference change
 */
export function trackSelectorRefChange(selectorName: string) {
  testDiagnostics.selectorRefChanges[selectorName] = 
    (testDiagnostics.selectorRefChanges[selectorName] || 0) + 1;
}

/**
 * Track an error for debugging
 */
export function trackError(error: Error) {
  testDiagnostics.lastError = error;
}

/**
 * Reset all diagnostic tracking
 */
export function resetDiagnostics() {
  testDiagnostics = {
    renderCounts: {},
    selectorRefChanges: {},
    lastError: null
  };
  
  // Clear Zustand logs
  if (globalThis.__ZUSTAND_SET_LOG__) {
    globalThis.__ZUSTAND_SET_LOG__.length = 0;
  }
}

/**
 * Get current diagnostic summary
 */
export function getDiagnosticSummary() {
  const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
  
  return {
    totalSetStateCalls: setStateCalls.length,
    totalRenderCounts: Object.values(testDiagnostics.renderCounts).reduce((a, b) => a + b, 0),
    totalRefChanges: Object.values(testDiagnostics.selectorRefChanges).reduce((a, b) => a + b, 0),
    hasError: !!testDiagnostics.lastError,
    components: Object.keys(testDiagnostics.renderCounts),
    selectors: Object.keys(testDiagnostics.selectorRefChanges)
  };
}

/**
 * Check if current state indicates potential infinite loop
 */
export function detectPotentialLoop(): {
  hasLoop: boolean;
  reasons: string[];
  severity: 'low' | 'medium' | 'high';
} {
  const setStateCalls = globalThis.__ZUSTAND_SET_LOG__ || [];
  const totalRenders = Object.values(testDiagnostics.renderCounts).reduce((a, b) => a + b, 0);
  const totalRefChanges = Object.values(testDiagnostics.selectorRefChanges).reduce((a, b) => a + b, 0);
  
  const reasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';
  
  // Check for excessive setState calls
  if (setStateCalls.length > 10) {
    reasons.push(`Excessive setState calls: ${setStateCalls.length}`);
    severity = setStateCalls.length > 50 ? 'high' : 'medium';
  }
  
  // Check for excessive renders
  if (totalRenders > 20) {
    reasons.push(`Excessive renders: ${totalRenders}`);
    severity = totalRenders > 100 ? 'high' : severity === 'high' ? 'high' : 'medium';
  }
  
  // Check for excessive reference changes
  if (totalRefChanges > 10) {
    reasons.push(`Excessive selector reference changes: ${totalRefChanges}`);
    severity = totalRefChanges > 50 ? 'high' : severity === 'high' ? 'high' : 'medium';
  }
  
  // Check for rapid setState calls (potential tight loop)
  if (setStateCalls.length >= 2) {
    const recentCalls = setStateCalls.slice(-5);
    const timeSpan = recentCalls[recentCalls.length - 1].timestamp - recentCalls[0].timestamp;
    if (timeSpan < 100 && recentCalls.length >= 3) { // 3+ calls in 100ms
      reasons.push(`Rapid setState calls: ${recentCalls.length} calls in ${timeSpan}ms`);
      severity = 'high';
    }
  }
  
  return {
    hasLoop: reasons.length > 0,
    reasons,
    severity
  };
}

/**
 * Auto-setup debug printing on test failures
 * Call this in your test setup to automatically print debug info when tests fail
 */
export function setupAutoDebugPrint() {
  afterEach((context) => {
    // Only print debug info if the test failed
    if (context.task.result?.state === 'fail') {
      const testName = context.task.name;
      console.log(`\n🚨 Test "${testName}" failed - printing debug info:`);
      printDebugInfo(testName);
      
      // Check for potential loops
      const loopDetection = detectPotentialLoop();
      if (loopDetection.hasLoop) {
        console.log(`\n⚠️  POTENTIAL INFINITE LOOP DETECTED (${loopDetection.severity} severity):`);
        loopDetection.reasons.forEach(reason => {
          console.log(`  - ${reason}`);
        });
      }
    }
    
    // Reset diagnostics for next test
    resetDiagnostics();
  });
}

/**
 * Enhanced error wrapper that captures additional context
 */
export function wrapWithDiagnostics<T>(fn: () => T, context?: string): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error) {
      trackError(error);
      
      // Add diagnostic context to error
      const summary = getDiagnosticSummary();
      const enhancedMessage = `${error.message}\n\nDiagnostic Context${context ? ` (${context})` : ''}:\n` +
        `- setState calls: ${summary.totalSetStateCalls}\n` +
        `- Total renders: ${summary.totalRenderCounts}\n` +
        `- Ref changes: ${summary.totalRefChanges}\n` +
        `- Components: ${summary.components.join(', ')}\n` +
        `- Selectors: ${summary.selectors.join(', ')}`;
      
      const enhancedError = new Error(enhancedMessage);
      enhancedError.stack = error.stack;
      throw enhancedError;
    }
    throw error;
  }
}