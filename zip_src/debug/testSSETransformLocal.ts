#!/usr/bin/env ts-node
/**
 * testSSETransformLocal.ts - Local backend-only SSE transformation test
 * 
 * Run this script directly to test SSE transformations without UI dependencies:
 * 
 * ```bash
 * cd /Users/tim/Code/orchestra
 * npx ts-node src/debug/testSSETransformLocal.ts
 * ```
 * 
 * Or with Node.js if compiled:
 * ```bash
 * node dist/debug/testSSETransformLocal.js
 * ```
 */

import { fromSSEEvent, SSEEvent } from '../utils/toUnifiedEvent';

// Sample SSE events based on the user's actual data
const sampleSSEEvents: SSEEvent[] = [
  // Tool result event (from user's example)
  {
    type: "tool_result",
    sessionId: "31946cb5-5091-4769-8935-97b275e81b9d",
    event_id: "d6ee941f-a2d6-4ed9-af80-0a674fd578c1",
    messageId: "call_C5hoou4EJEJQ0IfiuqYdIbfu-result",
    data: {
      result: {
        role: "tool",
        name: "search_files",
        tool_call_id: "call_C5hoou4EJEJQ0IfiuqYdIbfu",
        content: "[Errno 2] No such file or directory: '/workspace'"
      },
      success: true,
      output: "[Errno 2] No such file or directory: '/workspace'",
      user_id: "373a5b5b-10b8-4046-a5e2-15a49919d598"
    }
  },
  // Tool call event (simulated)
  {
    type: "tool_call",
    sessionId: "31946cb5-5091-4769-8935-97b275e81b9d",
    event_id: "tool-call-123",
    messageId: "call_C5hoou4EJEJQ0IfiuqYdIbfu",
    data: {
      tool_call: {
        id: "call_C5hoou4EJEJQ0IfiuqYdIbfu",
        name: "search_files",
        arguments: {
          paths: ["/workspace"],
          pattern: "*.py"
        }
      }
    }
  },
  // Message chunk event
  {
    type: "chunk",
    sessionId: "31946cb5-5091-4769-8935-97b275e81b9d",
    event_id: "chunk-123",
    messageId: "msg-123",
    delta: "Here are the search results:"
  },
  // Another tool result with different structure
  {
    type: "tool_result",
    sessionId: "test-session-456",
    event_id: "tool-result-456",
    messageId: "call_456-result",
    data: {
      result: {
        tool_call_id: "call_456",
        content: "File found: test.py"
      },
      success: true,
      output: "File found: test.py"
    }
  },
  // Tool result with error
  {
    type: "tool_result",
    sessionId: "test-session-789",
    event_id: "tool-result-789",
    messageId: "call_789-result",
    data: {
      result: {
        tool_call_id: "call_789",
        content: "Permission denied"
      },
      success: false,
      output: "Permission denied",
      error: "Access denied to file"
    }
  }
];

interface TestResult {
  eventIndex: number;
  originalType: string;
  success: boolean;
  transformedEvent: any;
  issues: string[];
  fieldMappings: Record<string, any>;
}

function analyzeFieldMappings(sseEvent: SSEEvent, transformedEvent: any): Record<string, any> {
  const mappings: Record<string, any> = {};

  if (!transformedEvent) {
    return { error: 'No transformed event to analyze' };
  }

  // Basic field mappings
  mappings.id = {
    source: sseEvent.event_id,
    target: transformedEvent.id,
    mapped: !!transformedEvent.id,
    correct: sseEvent.event_id === transformedEvent.id
  };

  mappings.sessionId = {
    source: sseEvent.sessionId,
    target: transformedEvent.sessionId,
    mapped: !!transformedEvent.sessionId,
    correct: sseEvent.sessionId === transformedEvent.sessionId
  };

  mappings.type = {
    source: sseEvent.type,
    target: transformedEvent.type,
    mapped: !!transformedEvent.type,
    correct: !!transformedEvent.type
  };

  // Type-specific mappings
  if (sseEvent.type === 'tool_result') {
    mappings.toolResult = {
      source: 'data object',
      target: transformedEvent.toolResult,
      mapped: !!transformedEvent.toolResult,
      correct: !!transformedEvent.toolResult
    };

    if (sseEvent.data?.result?.tool_call_id) {
      mappings.toolCallId = {
        source: sseEvent.data.result.tool_call_id,
        target: transformedEvent.toolResult?.toolCallId,
        mapped: !!transformedEvent.toolResult?.toolCallId,
        correct: sseEvent.data.result.tool_call_id === transformedEvent.toolResult?.toolCallId
      };
    }

    const sourceContent = sseEvent.data?.result?.content || sseEvent.data?.output;
    if (sourceContent) {
      mappings.resultContent = {
        source: sourceContent,
        target: transformedEvent.toolResult?.result,
        mapped: transformedEvent.toolResult?.result !== undefined,
        correct: sourceContent === transformedEvent.toolResult?.result
      };
    }

    if (sseEvent.data?.success !== undefined) {
      mappings.success = {
        source: sseEvent.data.success,
        target: transformedEvent.toolResult?.ok,
        mapped: transformedEvent.toolResult?.ok !== undefined,
        correct: sseEvent.data.success === transformedEvent.toolResult?.ok
      };
    }
  }

  if (sseEvent.type === 'tool_call') {
    mappings.toolCall = {
      source: 'data.tool_call',
      target: transformedEvent.toolCall,
      mapped: !!transformedEvent.toolCall,
      correct: !!transformedEvent.toolCall
    };

    if (sseEvent.data?.tool_call?.id) {
      mappings.toolCallId = {
        source: sseEvent.data.tool_call.id,
        target: transformedEvent.toolCall?.id,
        mapped: !!transformedEvent.toolCall?.id,
        correct: sseEvent.data.tool_call.id === transformedEvent.toolCall?.id
      };
    }

    if (sseEvent.data?.tool_call?.name) {
      mappings.toolName = {
        source: sseEvent.data.tool_call.name,
        target: transformedEvent.toolCall?.name,
        mapped: !!transformedEvent.toolCall?.name,
        correct: sseEvent.data.tool_call.name === transformedEvent.toolCall?.name
      };
    }

    if (sseEvent.data?.tool_call?.arguments) {
      mappings.toolArgs = {
        source: sseEvent.data.tool_call.arguments,
        target: transformedEvent.toolCall?.args,
        mapped: !!transformedEvent.toolCall?.args,
        correct: JSON.stringify(sseEvent.data.tool_call.arguments) === JSON.stringify(transformedEvent.toolCall?.args)
      };
    }
  }

  return mappings;
}

function validateTransformation(sseEvent: SSEEvent, transformedEvent: any): string[] {
  const issues: string[] = [];

  if (!transformedEvent) {
    issues.push('No transformed event produced');
    return issues;
  }

  // Check basic fields
  if (!transformedEvent.id) {
    issues.push('Missing id field in transformed event');
  }

  if (!transformedEvent.sessionId) {
    issues.push('Missing sessionId field in transformed event');
  }

  if (!transformedEvent.type) {
    issues.push('Missing type field in transformed event');
  }

  // Type-specific validation
  if (sseEvent.type === 'tool_result') {
    if (!transformedEvent.toolResult) {
      issues.push('Missing toolResult field for tool_result event');
    } else {
      if (!transformedEvent.toolResult.toolCallId && sseEvent.data?.result?.tool_call_id) {
        issues.push('Missing toolCallId in toolResult');
      }

      if (transformedEvent.toolResult.result === undefined && (sseEvent.data?.result?.content || sseEvent.data?.output)) {
        issues.push('Missing result content in toolResult');
      }

      if (transformedEvent.toolResult.ok === undefined && sseEvent.data?.success !== undefined) {
        issues.push('Missing success flag mapping in toolResult');
      }
    }
  }

  if (sseEvent.type === 'tool_call') {
    if (!transformedEvent.toolCall) {
      issues.push('Missing toolCall field for tool_call event');
    } else {
      if (!transformedEvent.toolCall.id && sseEvent.data?.tool_call?.id) {
        issues.push('Missing id in toolCall');
      }

      if (!transformedEvent.toolCall.name && sseEvent.data?.tool_call?.name) {
        issues.push('Missing name in toolCall');
      }

      if (!transformedEvent.toolCall.args && sseEvent.data?.tool_call?.arguments) {
        issues.push('Missing arguments in toolCall');
      }
    }
  }

  return issues;
}

function testSingleTransformation(sseEvent: SSEEvent, index: number): TestResult {
  console.log(`\n🧪 Testing event ${index + 1}: ${sseEvent.type}`);
  console.log('📥 Input SSE Event:', JSON.stringify(sseEvent, null, 2));

  let transformedEvent: any = null;
  let success = false;
  let issues: string[] = [];

  try {
    transformedEvent = fromSSEEvent(sseEvent);
    
    if (transformedEvent) {
      success = true;
      console.log('✅ Transformation successful');
      console.log('📤 Transformed Event:', JSON.stringify(transformedEvent, null, 2));
    } else {
      issues.push('Transformation returned null');
      console.log('❌ Transformation failed: returned null');
    }

    // Validate transformation
    const validationIssues = validateTransformation(sseEvent, transformedEvent);
    issues.push(...validationIssues);

    if (validationIssues.length > 0) {
      console.log('⚠️  Validation Issues:', validationIssues);
      success = false;
    }

  } catch (error) {
    issues.push(`Transformation threw error: ${error}`);
    console.error('❌ Transformation error:', error);
    success = false;
  }

  // Analyze field mappings
  const fieldMappings = analyzeFieldMappings(sseEvent, transformedEvent);
  console.log('🔍 Field Mappings:');
  Object.entries(fieldMappings).forEach(([field, mapping]) => {
    if (typeof mapping === 'object' && mapping.mapped !== undefined) {
      const status = mapping.correct ? '✅' : (mapping.mapped ? '⚠️' : '❌');
      console.log(`  ${status} ${field}: ${JSON.stringify(mapping.source)} → ${JSON.stringify(mapping.target)}`);
    }
  });

  return {
    eventIndex: index,
    originalType: sseEvent.type,
    success: success && issues.length === 0,
    transformedEvent,
    issues,
    fieldMappings
  };
}

function runAllTests(): void {
  console.log('🚀 Starting SSE Transformation Tests (Local Backend)');
  console.log('=' .repeat(60));

  const results: TestResult[] = [];

  // Test each sample event
  for (let i = 0; i < sampleSSEEvents.length; i++) {
    const result = testSingleTransformation(sampleSSEEvents[i], i);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0}%`);

  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`- Event ${result.eventIndex + 1} (${result.originalType}): ${result.issues.join(', ')}`);
    });
  }

  // Field mapping analysis
  console.log('\n🔍 FIELD MAPPING ANALYSIS:');
  results.forEach(result => {
    console.log(`\n${result.originalType} (Event ${result.eventIndex + 1}):`);
    Object.entries(result.fieldMappings).forEach(([field, mapping]) => {
      if (typeof mapping === 'object' && mapping.correct !== undefined) {
        const status = mapping.correct ? '✅' : (mapping.mapped ? '⚠️' : '❌');
        console.log(`  ${status} ${field}: ${mapping.correct ? 'CORRECT' : 'INCORRECT/MISSING'}`);
      }
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log(successfulTests === totalTests ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED - CHECK TRANSFORMATION LOGIC');
  console.log('='.repeat(60));
}

function runContinuousTests(iterations: number = 5, intervalMs: number = 2000): void {
  console.log(`🔄 Starting Continuous Testing (${iterations} iterations, ${intervalMs}ms interval)`);
  
  let currentIteration = 0;
  
  const runIteration = () => {
    currentIteration++;
    console.log(`\n${'='.repeat(20)} ITERATION ${currentIteration}/${iterations} ${'='.repeat(20)}`);
    runAllTests();
    
    if (currentIteration < iterations) {
      console.log(`\n⏳ Waiting ${intervalMs}ms before next iteration...`);
      setTimeout(runIteration, intervalMs);
    } else {
      console.log('\n🏁 Continuous testing completed');
    }
  };
  
  runIteration();
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--continuous')) {
    const iterations = parseInt(args.find(arg => arg.startsWith('--iterations='))?.split('=')[1] || '5');
    const interval = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '2000');
    runContinuousTests(iterations, interval);
  } else {
    runAllTests();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

// Export for use in other modules
export { runAllTests, runContinuousTests, testSingleTransformation };