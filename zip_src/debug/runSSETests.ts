/**
 * runSSETests.ts - Quick test runner for SSE transformation
 * 
 * This file can be imported and executed to test SSE transformations
 */

import { sseTransformTester } from './sseTransformTester';

/**
 * Run a quick test of SSE transformations
 */
export async function runQuickSSETest(): Promise<void> {
  console.log('🚀 Starting SSE transformation test...');
  
  // Run single test
  const results = sseTransformTester.runTransformationTests();
  
  // Print results
  console.log('\n📊 Test Results:');
  results.forEach((result, index) => {
    console.log(`\nTest ${index + 1}: ${result.originalEvent.type}`);
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    if (result.issues.length > 0) {
      console.log(`Issues: ${result.issues.join(', ')}`);
    }
    console.log('Field Mappings:', result.fieldMappings);
  });
  
  // Export results
  const exportData = sseTransformTester.exportTestResults();
  console.log('\n📄 Export Data:');
  console.log(exportData);
}

/**
 * Run continuous testing
 */
export async function runContinuousSSETest(): Promise<void> {
  console.log('🔄 Starting continuous SSE transformation testing...');
  
  await sseTransformTester.runContinuousTests({
    intervalMs: 3000, // Test every 3 seconds
    maxIterations: 5  // Run 5 iterations
  });
}

// Auto-run if this file is executed directly
if (import.meta.env.DEV) {
  // Expose functions to window for manual testing
  (window as any).runQuickSSETest = runQuickSSETest;
  (window as any).runContinuousSSETest = runContinuousSSETest;
  
  console.log('🧪 SSE Test Runner loaded');
  console.log('Use runQuickSSETest() or runContinuousSSETest() to test');
}