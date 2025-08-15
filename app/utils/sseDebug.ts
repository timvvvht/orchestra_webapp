/**
 * SSE Debug Helper - Records all SSE events and associated information
 * 
 * This helper logs every SSE event and processing decision to help debug
 * potential event loss issues. It stores the last 1000 entries in 
 * window.__SSE_HISTORY and also calls __SSE_DEBUG.addLogEntry if available.
 */

interface SSEDebugEntry {
  timestamp: number;
  kind: string;
  event?: any;
  unified?: any;
  canonicalEvent?: any;
  eventId?: string;
  sessionId?: string;
  messageId?: string;
  reason?: string;
  error?: string;
  [key: string]: any;
}

declare global {
  interface Window {
    __SSE_HISTORY: SSEDebugEntry[];
    __SSE_DEBUG?: {
      addLogEntry: (entry: any) => void;
    };
  }
}

// Helper function to deep clone objects to prevent mutation
const clone = (v: any): any =>
  v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;

/**
 * Log debug information about SSE event processing
 * @param kind - Type of log entry (e.g., 'raw_in', 'skip_no_session', 'unified_ok', 'store_add')
 * @param data - Additional data to log
 */
export function logDebug(kind: string, data: any = {}): void {
  if (typeof window === 'undefined') return;
  
  // Initialize global history array if it doesn't exist
  if (!window.__SSE_HISTORY) {
    window.__SSE_HISTORY = [];
    console.log('🔧 [SSE Debug] Initialized window.__SSE_HISTORY');
  }

  // Deep-clone objects so they can't be mutated later
  const safeData: any = {};
  Object.entries(data).forEach(([k, v]) => (safeData[k] = clone(v)));

  // Create debug entry with timestamp
  const entry: SSEDebugEntry = {
    timestamp: Date.now(),
    kind,
    ...safeData
  };

  // Add to global history, maintaining last 1000 entries
  window.__SSE_HISTORY.push(entry);
  if (window.__SSE_HISTORY.length > 1000) {
    window.__SSE_HISTORY.shift();
  }

  // Log first few entries to console for debugging
  if (window.__SSE_HISTORY.length <= 5) {
    console.log(`🔧 [SSE Debug] Entry ${window.__SSE_HISTORY.length}: ${kind}`, entry);
  }

  // Also call existing debug overlay if available
  if (window.__SSE_DEBUG?.addLogEntry) {
    window.__SSE_DEBUG.addLogEntry({
      type: kind,
      data: safeData,
      sessionId: safeData.sessionId || safeData.event?.sessionId,
      messageId: safeData.messageId || safeData.event?.messageId
    });
  }
}