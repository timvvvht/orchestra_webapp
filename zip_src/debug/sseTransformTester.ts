/**
 * sseTransformTester.ts - Test SSE to Event Store transformation
 * 
 * This utility tests the SSE event transformation pipeline to ensure
 * we're correctly mapping fields from raw SSE events to canonical events.
 */

import { fromSSEEvent, SSEEvent } from '@/utils/toUnifiedEvent';
import { tap, getTappedEvents, clearTappedEvents } from './eventTap';

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
  }
];

interface TransformTestResult {
  testId: string;
  timestamp: string;
  originalEvent: SSEEvent;
  transformedEvent: any;
  success: boolean;
  issues: string[];
  fieldMappings: Record<string, any>;
}

interface TappedEvent {
  layer: string;
  eventId: string;
  timestamp: string;
  event: any;
  metadata: Record<string, any>;
}

class SSETransformTester {
  private testResults: TransformTestResult[] = [];

  /**
   * Run transformation tests on sample SSE events
   */
  runTransformationTests(): TransformTestResult[] {
    console.log('[SSETransformTester] 🧪 Running SSE transformation tests...');
    
    this.testResults = [];
    
    for (let i = 0; i < sampleSSEEvents.length; i++) {
      const sseEvent = sampleSSEEvents[i];
      const result = this.testSingleTransformation(sseEvent, i);
      this.testResults.push(result);
    }
    
    this.printTestSummary();
    return this.testResults;
  }

  /**
   * Test transformation of a single SSE event
   */
  private testSingleTransformation(sseEvent: SSEEvent, index: number): TransformTestResult {
    const testId = `transform_test_${index}_${Date.now()}`;
    console.log(`[SSETransformTester] Testing event ${index + 1}:`, sseEvent.type);

    const issues: string[] = [];
    let transformedEvent: any = null;
    let success = false;

    try {
      // Clear event history before test
      clearEventHistory();
      
      // Tap the original SSE event
      tap('test-raw-sse', sseEvent, {
        source: 'SSETransformTester',
        testId,
        timestamp: new Date().toISOString()
      });

      // Transform the event
      transformedEvent = fromSSEEvent(sseEvent);
      
      if (transformedEvent) {
        // Tap the transformed event
        tap('test-transformed', transformedEvent, {
          source: 'SSETransformTester',
          testId,
          timestamp: new Date().toISOString()
        });
        
        success = true;
        console.log(`✅ Transformation successful for ${sseEvent.type}`);
      } else {
        issues.push('Transformation returned null');
        console.log(`❌ Transformation failed for ${sseEvent.type}: returned null`);
      }

      // Analyze field mappings
      const fieldMappings = this.analyzeFieldMappings(sseEvent, transformedEvent);
      
      // Check for specific issues
      this.validateTransformation(sseEvent, transformedEvent, issues);

    } catch (error) {
      issues.push(`Transformation threw error: ${error}`);
      console.error(`❌ Transformation error for ${sseEvent.type}:`, error);
    }

    const result: TransformTestResult = {
      testId,
      timestamp: new Date().toISOString(),
      originalEvent: sseEvent,
      transformedEvent,
      success: success && issues.length === 0,
      issues,
      fieldMappings: this.analyzeFieldMappings(sseEvent, transformedEvent)
    };

    return result;
  }

  /**
   * Analyze how fields are mapped from SSE to transformed event
   */
  private analyzeFieldMappings(sseEvent: SSEEvent, transformedEvent: any): Record<string, any> {
    const mappings: Record<string, any> = {};

    if (!transformedEvent) {
      return { error: 'No transformed event to analyze' };
    }

    // Basic field mappings
    mappings.id = {
      source: sseEvent.event_id,
      target: transformedEvent.id,
      mapped: !!transformedEvent.id
    };

    mappings.sessionId = {
      source: sseEvent.sessionId,
      target: transformedEvent.sessionId,
      mapped: sseEvent.sessionId === transformedEvent.sessionId
    };

    mappings.type = {
      source: sseEvent.type,
      target: transformedEvent.type,
      mapped: !!transformedEvent.type
    };

    // Type-specific mappings
    if (sseEvent.type === 'tool_result') {
      mappings.toolResult = {
        source: sseEvent.data,
        target: transformedEvent.toolResult,
        mapped: !!transformedEvent.toolResult
      };

      if (sseEvent.data?.result?.tool_call_id) {
        mappings.toolCallId = {
          source: sseEvent.data.result.tool_call_id,
          target: transformedEvent.toolResult?.toolCallId,
          mapped: sseEvent.data.result.tool_call_id === transformedEvent.toolResult?.toolCallId
        };
      }

      if (sseEvent.data?.result?.content || sseEvent.data?.output) {
        mappings.resultContent = {
          source: sseEvent.data.result?.content || sseEvent.data.output,
          target: transformedEvent.toolResult?.result,
          mapped: !!(transformedEvent.toolResult?.result)
        };
      }

      if (sseEvent.data?.success !== undefined) {
        mappings.success = {
          source: sseEvent.data.success,
          target: transformedEvent.toolResult?.ok,
          mapped: sseEvent.data.success === transformedEvent.toolResult?.ok
        };
      }
    }

    if (sseEvent.type === 'tool_call') {
      mappings.toolCall = {
        source: sseEvent.data?.tool_call,
        target: transformedEvent.toolCall,
        mapped: !!transformedEvent.toolCall
      };

      if (sseEvent.data?.tool_call?.id) {
        mappings.toolCallId = {
          source: sseEvent.data.tool_call.id,
          target: transformedEvent.toolCall?.id,
          mapped: sseEvent.data.tool_call.id === transformedEvent.toolCall?.id
        };
      }

      if (sseEvent.data?.tool_call?.name) {
        mappings.toolName = {
          source: sseEvent.data.tool_call.name,
          target: transformedEvent.toolCall?.name,
          mapped: sseEvent.data.tool_call.name === transformedEvent.toolCall?.name
        };
      }

      if (sseEvent.data?.tool_call?.arguments) {
        mappings.toolArgs = {
          source: sseEvent.data.tool_call.arguments,
          target: transformedEvent.toolCall?.args,
          mapped: !!transformedEvent.toolCall?.args
        };
      }
    }

    return mappings;
  }

  /**
   * Validate the transformation and add issues
   */
  private validateTransformation(sseEvent: SSEEvent, transformedEvent: any, issues: string[]): void {
    if (!transformedEvent) {
      issues.push('No transformed event produced');
      return;
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
  }

  /**
   * Print test summary
   */
  private printTestSummary(): void {
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;

    console.log('\n[SSETransformTester] 📊 Test Summary:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.originalEvent.type}: ${result.issues.join(', ')}`);
      });
    }

    console.log('\n🔍 Field Mapping Analysis:');
    this.testResults.forEach(result => {
      console.log(`\n${result.originalEvent.type}:`);
      Object.entries(result.fieldMappings).forEach(([field, mapping]) => {
        if (typeof mapping === 'object' && mapping.mapped !== undefined) {
          const status = mapping.mapped ? '✅' : '❌';
          console.log(`  ${status} ${field}: ${mapping.source} → ${mapping.target}`);
        }
      });
    });
  }

  /**
   * Run continuous testing loop
   */
  async runContinuousTests(options: {
    intervalMs?: number;
    maxIterations?: number;
  } = {}): Promise<void> {
    const { intervalMs = 5000, maxIterations = 10 } = options;
    
    console.log('[SSETransformTester] 🔄 Starting continuous testing loop...');
    
    for (let i = 0; i < maxIterations; i++) {
      console.log(`\n[SSETransformTester] 🔄 Test iteration ${i + 1}/${maxIterations}`);
      
      this.runTransformationTests();
      
      if (i < maxIterations - 1) {
        console.log(`[SSETransformTester] ⏳ Waiting ${intervalMs}ms before next iteration...`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    console.log('[SSETransformTester] 🏁 Continuous testing completed');
  }

  /**
   * Get test results
   */
  getTestResults(): TransformTestResult[] {
    return [...this.testResults];
  }

  /**
   * Export test results
   */
  exportTestResults(): string {
    return JSON.stringify({
      summary: {
        totalTests: this.testResults.length,
        successfulTests: this.testResults.filter(r => r.success).length,
        failedTests: this.testResults.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      },
      results: this.testResults
    }, null, 2);
  }

  /**
   * Clear test results
   */
  clearTestResults(): void {
    this.testResults = [];
    console.log('[SSETransformTester] Test results cleared');
  }
}

// Export singleton instance
export const sseTransformTester = new SSETransformTester();

// Export types
export type { TransformTestResult };

// Development helpers
if (import.meta.env.DEV) {
  // Expose to window for debugging
  (window as any).sseTransformTester = sseTransformTester;
  
  console.log('[SSETransformTester] 🧪 SSE Transform Tester initialized');
  console.log('Use sseTransformTester.runTransformationTests() to test transformations');
  console.log('Use sseTransformTester.runContinuousTests() for continuous testing');
}