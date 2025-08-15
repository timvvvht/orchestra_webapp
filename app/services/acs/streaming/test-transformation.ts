/**
 * Test script to verify Orchestra SSE event transformation
 * Run with: npx ts-node test-transformation.ts
 */

import { ACSStreamingService, SSEEventUtils } from './index';

// Mock Orchestra SSE events (based on verified format)
const mockOrchestraEvents = [
  // Tool call event
  {
    data: JSON.stringify({
      "v": 2,
      "type": "agent_event",
      "payload": {
        "event_id": "evt_1750400244_9dd946a4",
        "session_id": "test-session-alpha",
        "event_type": "tool_call",
        "timestamp": 1750400244.1769252,
        "data": {
          "tool_name": "file_editor",
          "tool_input": {
            "command": "view",
            "path": "/test/file.py"
          },
          "call_id": "call_123"
        },
        "message_id": "msg_09dc3d83"
      }
    })
  },
  
  // Tool result event
  {
    data: JSON.stringify({
      "v": 2,
      "type": "agent_event",
      "payload": {
        "event_id": "evt_1750400246_06949830",
        "session_id": "test-session-alpha",
        "event_type": "tool_result",
        "timestamp": 1750400246.199385,
        "data": {
          "tool_name": "file_editor",
          "result": {
            "content": "print('Hello World')",
            "lines": 1
          },
          "call_id": "call_123",
          "success": true
        },
        "message_id": "msg_194b8716"
      }
    })
  },
  
  // Error event
  {
    data: JSON.stringify({
      "v": 2,
      "type": "agent_event",
      "payload": {
        "event_id": "evt_1750400248_3853de0f",
        "session_id": "test-session-alpha",
        "event_type": "error",
        "timestamp": 1750400248.2214565,
        "data": {
          "error_type": "tool_error",
          "message": "File not found: /test/file.py",
          "call_id": "call_789"
        },
        "message_id": "msg_9bf9582a"
      }
    })
  },
  
  // Connection event
  {
    data: JSON.stringify({
      "type": "connected",
      "session_id": "test-session-alpha"
    })
  },
  
  // Heartbeat event
  {
    data: JSON.stringify({
      "type": "heartbeat",
      "timestamp": 1750400000
    })
  }
];

// Test the transformation
function testTransformation() {
  console.log('🧪 Testing Orchestra SSE Event Transformation\n');
  
  const config = {
    baseUrl: 'https://test.example.com',
    sseUrl: 'https://orchestra-sse-service.fly.dev',
    debug: true
  };
  
  const service = new (ACSStreamingService as any)(config);
  
  // Test each mock event
  mockOrchestraEvents.forEach((mockEvent, index) => {
    console.log(`\n--- Test ${index + 1} ---`);
    console.log('📥 Raw Orchestra Event:', mockEvent.data);
    
    // Access the private method for testing
    const handleSSEEvent = (service as any).handleSSEEvent.bind(service);
    
    // Capture the transformed event
    let transformedEvent: any = null;
    const originalGlobalHandlers = (service as any).globalHandlers;
    (service as any).globalHandlers = new Set([(event: any) => {
      transformedEvent = event;
    }]);
    
    // Transform the event
    handleSSEEvent(mockEvent as MessageEvent);
    
    // Restore original handlers
    (service as any).globalHandlers = originalGlobalHandlers;
    
    if (transformedEvent) {
      console.log('📤 Transformed ACS Event:', JSON.stringify(transformedEvent, null, 2));
      console.log('📋 Formatted for log:', SSEEventUtils.formatForLog(transformedEvent));
      
      // Test utility functions
      if (SSEEventUtils.isToolCall(transformedEvent)) {
        console.log('🔧 Tool Call detected:', SSEEventUtils.getToolCall(transformedEvent));
      }
      if (SSEEventUtils.isToolResult(transformedEvent)) {
        console.log('✅ Tool Result detected:', SSEEventUtils.getToolResult(transformedEvent));
      }
      if (SSEEventUtils.isError(transformedEvent)) {
        console.log('❌ Error detected:', SSEEventUtils.getError(transformedEvent));
      }
    } else {
      console.log('❌ No transformed event received');
    }
  });
  
  console.log('\n✅ Transformation test completed!');
}

// Run the test
if (require.main === module) {
  testTransformation();
}

export { testTransformation };