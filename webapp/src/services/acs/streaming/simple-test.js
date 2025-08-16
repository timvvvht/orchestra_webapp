/**
 * Simple test to verify Orchestra SSE event transformation
 */

// Mock the SSE_EVENT_TYPES constant
const SSE_EVENT_TYPES = {
  CONNECTED: 'connected',
  CHUNK: 'chunk',
  TOKEN: 'token',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  DONE: 'done',
  ERROR: 'error',
  STATUS: 'status',
  AGENT_STATUS: 'agent_status'
};

// Mock ACSStreamingService class with just the transformation logic
class TestACSStreamingService {
  constructor(config) {
    this.config = config;
    this.globalHandlers = new Set();
  }

  // Copy of the handleSSEEvent method from the rewritten service
  handleSSEEvent(event, eventType) {
    try {
      let data;
      
      try {
        data = JSON.parse(event.data);
      } catch {
        data = { text: event.data };
      }
      
      if (this.config.debug) {
        console.log('[ACSStreaming] Raw SSE data:', data);
      }
      
      let sseEvent;
      
      if (data.type === 'agent_event' && data.payload) {
        const payload = data.payload;
        
        sseEvent = {
          type: payload.event_type || 'unknown',
          sessionId: payload.session_id || '',
          messageId: payload.message_id,
          event_id: payload.event_id,
          seq: undefined,
          delta: this.extractDelta(payload),
          toolCall: this.extractToolCall(payload),
          result: this.extractResult(payload),
          history: undefined,
          error: this.extractError(payload),
          data: payload.data
        };
        
      } else if (data.type === 'connected') {
        sseEvent = {
          type: SSE_EVENT_TYPES.CONNECTED,
          sessionId: data.session_id || '',
          messageId: undefined,
          event_id: undefined,
          seq: undefined,
          delta: undefined,
          toolCall: undefined,
          result: undefined,
          history: undefined,
          error: undefined,
          data: data
        };
        
      } else if (data.type === 'heartbeat') {
        sseEvent = {
          type: 'heartbeat',
          sessionId: '',
          messageId: undefined,
          event_id: undefined,
          seq: undefined,
          delta: undefined,
          toolCall: undefined,
          result: undefined,
          history: undefined,
          error: undefined,
          data: data
        };
        
      } else {
        sseEvent = {
          type: eventType || data.type || 'message',
          sessionId: data.sessionId || data.session_id || '',
          messageId: data.messageId || data.message_id,
          seq: data.seq,
          event_id: data.event_id,
          delta: data.delta,
          toolCall: data.toolCall || data.tool_call,
          result: data.result,
          history: data.history,
          error: data.error,
          data: data
        };
      }
      
      if (this.config.debug) {
        console.log('[ACSStreaming] Transformed SSE event:', sseEvent);
      }
      
      // Notify global handlers
      for (const handler of this.globalHandlers) {
        try {
          handler(sseEvent);
        } catch (error) {
          console.error('[ACSStreaming] Error in global event handler:', error);
        }
      }
      
    } catch (error) {
      console.error('[ACSStreaming] Error parsing SSE event:', error, event.data);
    }
  }

  extractDelta(payload) {
    if (payload.event_type === 'chunk' || payload.event_type === 'token') {
      return payload.data?.text || payload.data?.content || payload.data?.delta;
    }
    return undefined;
  }

  extractToolCall(payload) {
    if (payload.event_type === 'tool_call' && payload.data) {
      return {
        id: payload.data.call_id || payload.event_id,
        name: payload.data.tool_name || payload.data.tool,
        arguments: payload.data.tool_input || payload.data.input || payload.data
      };
    }
    return undefined;
  }

  extractResult(payload) {
    if (payload.event_type === 'tool_result' && payload.data) {
      return {
        call_id: payload.data.call_id,
        tool_name: payload.data.tool_name || payload.data.tool,
        result: payload.data.result || payload.data.output,
        success: payload.data.success,
        ...payload.data
      };
    }
    return undefined;
  }

  extractError(payload) {
    if (payload.event_type === 'error' && payload.data) {
      return payload.data.message || payload.data.error || JSON.stringify(payload.data);
    }
    return undefined;
  }
}

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
  
  // Connection event
  {
    data: JSON.stringify({
      "type": "connected",
      "session_id": "test-session-alpha"
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
  
  const service = new TestACSStreamingService(config);
  
  // Test each mock event
  mockOrchestraEvents.forEach((mockEvent, index) => {
    console.log(`\n--- Test ${index + 1} ---`);
    console.log('📥 Raw Orchestra Event:', mockEvent.data);
    
    // Capture the transformed event
    let transformedEvent = null;
    service.globalHandlers.add((event) => {
      transformedEvent = event;
    });
    
    // Transform the event
    service.handleSSEEvent(mockEvent);
    
    if (transformedEvent) {
      console.log('📤 Transformed ACS Event:');
      console.log('  Type:', transformedEvent.type);
      console.log('  Session ID:', transformedEvent.sessionId);
      console.log('  Event ID:', transformedEvent.event_id);
      
      if (transformedEvent.toolCall) {
        console.log('  Tool Call:', transformedEvent.toolCall);
      }
      if (transformedEvent.result) {
        console.log('  Tool Result:', transformedEvent.result);
      }
      if (transformedEvent.error) {
        console.log('  Error:', transformedEvent.error);
      }
      
      console.log('✅ Transformation successful!');
    } else {
      console.log('❌ No transformed event received');
    }
    
    service.globalHandlers.clear();
  });
  
  console.log('\n🎉 All transformation tests completed!');
}

// Run the test
testTransformation();