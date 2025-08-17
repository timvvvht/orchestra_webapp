# Event Tap Debugging System

A comprehensive debugging system for inspecting and comparing data transformations at various stages of the SSE and Supabase data pipelines in Orchestra.

## 🎯 Purpose

This system helps identify data mismatch issues between Supabase and SSE handling that cause incorrect tool results (e.g., empty results, duplicated events) to be displayed in the UI. It ensures that the canonical event representation is identical regardless of whether it originated from SSE or Supabase.

## 🚀 Quick Start

### 1. Enable Event Tapping

Set the environment variable in your `.env` file:

```bash
VITE_EVENT_TAP=true
```

### 2. Start the Application

```bash
npm run dev
```

### 3. Open the Debug Overlay

Use one of these methods:

- **Keyboard Shortcut**: `Ctrl+Shift+E` (E for "Events")
- **Console Command**: `window.eventTapDebug.toggle()`
- **Browser DevTools**: The overlay will automatically appear when events are detected

## 📊 Pipeline Stages

The system taps into these key stages of the data pipeline:

### 1. **Raw SSE** (`raw-sse`)
- **Location**: `useACSChatStreaming.ts`
- **Purpose**: Captures raw SSE events as they arrive from the server
- **Color**: Blue 🔵

### 2. **SSE Parsed** (`sse-parsed`)
- **Location**: `SseParser.ts`
- **Purpose**: Captures events after SSE parsing and normalization
- **Color**: Green 🟢

### 3. **Raw Supabase** (`raw-supa`)
- **Location**: `historyBridge.ts`
- **Purpose**: Captures raw Supabase database rows before processing
- **Color**: Purple 🟣

### 4. **Supabase Processed** (`supa-processed`)
- **Location**: `historyBridge.ts`
- **Purpose**: Captures Supabase events after conversion to canonical format
- **Color**: Amber 🟡

### 5. **Canonical Store** (`store`)
- **Location**: `eventStore.ts`
- **Purpose**: Captures final canonical events entering the event store
- **Color**: Red 🔴

## 🔍 Debug Overlay Features

### Event List
- View events by pipeline stage
- Search events by ID or content
- Real-time updates with auto-refresh
- Timestamp tracking

### Event Details
- Full event inspection with JSON formatting
- Metadata display (source, timestamp, etc.)
- Event type and structure analysis

### Diff Analysis
- Automatic detection of data mismatches
- Side-by-side comparison of SSE vs Supabase events
- Highlighting of differences between pipeline stages

### Export & Management
- Export debug data as JSON
- Clear all captured events
- Manual refresh capability
- Auto-refresh toggle

## 🛠️ Usage Examples

### Debugging Data Mismatches

1. **Enable event tapping** with `VITE_EVENT_TAP=true`
2. **Trigger the issue** by performing actions that cause the mismatch
3. **Open the debug overlay** with `Ctrl+Shift+D`
4. **Look for red warning badges** indicating mismatches
5. **Select events** to inspect differences
6. **Export data** for further analysis

### Console Commands

```javascript
// Show/hide the debug overlay
window.eventTapDebug.show()
window.eventTapDebug.hide()
window.eventTapDebug.toggle()

// Check if overlay is visible
window.eventTapDebug.isVisible()

// Access raw tap data
window.eventTap.getTappedEvents()
window.eventTap.exportTapSummary()
window.eventTap.clearTappedEvents()
```

### Manual Event Tapping

```javascript
import { tap } from '@/debug/eventTap';

// Tap a custom event
tap('custom', eventData, {
  source: 'my-component',
  customMetadata: 'value'
});
```

## 🔧 Configuration

### Environment Variables

- `VITE_EVENT_TAP=true` - Enables the event tapping system
- `VITE_CANONICAL_STORE=true` - Enables the canonical event store (required)

### Performance Considerations

- Event tapping only runs when `VITE_EVENT_TAP=true`
- Automatic cleanup keeps only the last 100 events per layer
- Memory usage is bounded and events are garbage collected

## 📁 File Structure

```
src/debug/
├── eventTap.ts                    # Core tapping utility
├── README.md                      # This documentation
└── /components/debug/
    └── EventTapDebugOverlay.tsx   # Debug UI component

src/hooks/
└── useEventTapDebug.ts           # React hook for overlay state

# Integration points:
src/hooks/acs-chat/useACSChatStreaming.ts  # Raw SSE tap
src/adapters/SseParser.ts                  # SSE parsed tap
src/stores/eventBridges/historyBridge.ts   # Supabase taps
src/stores/eventBridges/sseBridge.ts       # SSE bridge tap
src/stores/eventStore.ts                   # Store tap
src/App.tsx                                # Overlay integration
```

## 🐛 Troubleshooting

### Debug Overlay Not Appearing

1. Check that `VITE_EVENT_TAP=true` is set
2. Restart the development server
3. Try the keyboard shortcut `Ctrl+Shift+D`
4. Check browser console for errors

### No Events Being Captured

1. Verify `VITE_CANONICAL_STORE=true` is set
2. Ensure you're performing actions that trigger events
3. Check that the relevant pipeline stages are active
4. Look for console errors in the browser

### Performance Issues

1. Clear captured events regularly
2. Disable auto-refresh if not needed
3. Use search filters to reduce displayed events
4. Consider disabling event tapping in production

## 🔬 Advanced Usage

### Custom Tap Points

Add custom tap points in your code:

```typescript
import { tap } from '@/debug/eventTap';

// In your component or service
const processData = (data) => {
  // Tap the input
  tap('custom', data, { 
    source: 'processData',
    stage: 'input'
  });
  
  const processed = transform(data);
  
  // Tap the output
  tap('custom', processed, { 
    source: 'processData',
    stage: 'output'
  });
  
  return processed;
};
```

### Diff Analysis

The system automatically performs diff analysis when events reach the store layer. You can also manually compare events:

```javascript
import { diffObj } from '@/debug/eventTap';

const differences = diffObj(event1, event2);
console.log('Differences:', differences);
```

## 📈 Best Practices

1. **Enable only during debugging** - Don't leave event tapping enabled in production
2. **Use descriptive metadata** - Include source and context information
3. **Clear events regularly** - Prevent memory buildup during long debugging sessions
4. **Export important findings** - Save debug data for analysis and bug reports
5. **Focus on specific layers** - Use filters to reduce noise when debugging specific issues

## 🤝 Contributing

When adding new tap points:

1. Import the `tap` function: `import { tap } from '@/debug/eventTap';`
2. Choose an appropriate layer name or use 'custom'
3. Include meaningful metadata about the source and context
4. Test that events appear in the debug overlay
5. Update this documentation if adding new layers

## 📝 Example Debug Session

```bash
# 1. Enable event tapping
echo "VITE_EVENT_TAP=true" >> .env

# 2. Start development server
npm run dev

# 3. Trigger the issue you're debugging
# (e.g., send a message, load chat history)

# 4. Open debug overlay
# Press Ctrl+Shift+D

# 5. Look for mismatches
# Check for red warning badges

# 6. Export findings
# Click the download button to save debug data
```

This debugging system provides comprehensive visibility into the Orchestra event pipeline, making it easier to identify and resolve data synchronization issues between SSE and Supabase systems.