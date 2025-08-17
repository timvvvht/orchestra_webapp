# SSE Transformation Testing

This directory contains tools for testing SSE event transformations in a local backend-only environment.

## Quick Start

### Option 1: Shell Script (Recommended)
```bash
# From project root
./test-sse.sh
```

### Option 2: Direct ts-node
```bash
# From project root
npx ts-node src/debug/testSSETransformLocal.ts
```

### Option 3: Compiled JavaScript
```bash
# Build first
npm run build

# Then run
node dist/debug/testSSETransformLocal.js
```

## Test Options

### Single Test Run
```bash
./test-sse.sh
```
Runs all sample SSE events through the transformation pipeline once.

### Continuous Testing
```bash
./test-sse.sh --continuous
```
Runs tests repeatedly to check for consistency.

### Custom Continuous Testing
```bash
# Run 10 iterations with 1 second intervals
./test-sse.sh --continuous --iterations=10 --interval=1000
```

## What Gets Tested

Based on your actual SSE event structure:

### Tool Result Events
```json
{
  "type": "tool_result",
  "data": {
    "result": {
      "tool_call_id": "call_123",
      "content": "File not found"
    },
    "success": true,
    "output": "File not found"
  }
}
```

**Field Mappings Tested:**
- ✅ `data.result.tool_call_id` → `toolResult.toolCallId`
- ✅ `data.result.content` or `data.output` → `toolResult.result`
- ✅ `data.success` → `toolResult.ok`

### Tool Call Events
```json
{
  "type": "tool_call",
  "data": {
    "tool_call": {
      "id": "call_123",
      "name": "search_files",
      "arguments": { "paths": ["/workspace"] }
    }
  }
}
```

**Field Mappings Tested:**
- ✅ `data.tool_call.id` → `toolCall.id`
- ✅ `data.tool_call.name` → `toolCall.name`
- ✅ `data.tool_call.arguments` → `toolCall.args`

## Test Output

### Success Example
```
🧪 Testing event 1: tool_result
✅ Transformation successful
🔍 Field Mappings:
  ✅ toolCallId: "call_123" → "call_123"
  ✅ resultContent: "File not found" → "File not found"
  ✅ success: true → true
```

### Failure Example
```
🧪 Testing event 1: tool_result
❌ Transformation failed: returned null
⚠️  Validation Issues: ["Missing toolResult field"]
🔍 Field Mappings:
  ❌ toolCallId: "call_123" → undefined
```

## Sample Events

The test includes these sample events based on your actual SSE structure:

1. **Tool Result** - Your exact event structure
2. **Tool Call** - Simulated tool call event
3. **Message Chunk** - Text streaming event
4. **Tool Result (Success)** - Alternative success case
5. **Tool Result (Error)** - Error handling case

## Files

- `testSSETransformLocal.ts` - Main test script
- `test-sse.sh` - Convenient shell wrapper
- `sseTransformTester.ts` - UI-based tester (for browser)
- `runSSETests.ts` - Browser integration helpers

## Debugging

If tests fail, check:

1. **Field Paths**: Verify the SSE event structure matches expectations
2. **Transformation Logic**: Check `toUnifiedEvent.ts` for correct field extraction
3. **Type Definitions**: Ensure `SSEEvent` interface matches actual events
4. **Nested Data**: Confirm `data.result` and `data.tool_call` structures

## Integration

This local testing can be integrated into:

- **CI/CD Pipelines**: Add to GitHub Actions or similar
- **Pre-commit Hooks**: Validate transformations before commits
- **Development Workflow**: Quick verification during development
- **Automated Testing**: Part of broader test suites

## Performance

The local tests are fast and lightweight:
- No browser dependencies
- No UI rendering
- Direct function calls
- Minimal overhead

Perfect for rapid iteration and debugging of transformation logic.