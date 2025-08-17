// traceSet.ts - Zustand middleware for tracing setState calls and detecting infinite loops

interface StackFrame {
  function: string;
  file: string;
  line: number;
}

interface SetLogEntry {
  timestamp: number;
  stackSignature: string;
  fullStack: string;
}

interface LoopGuardEntry {
  count: number;
  firstSeen: number;
}

// Global log for test access
declare global {
  var __ZUSTAND_SET_LOG__: SetLogEntry[];
}

if (typeof globalThis !== 'undefined') {
  globalThis.__ZUSTAND_SET_LOG__ = globalThis.__ZUSTAND_SET_LOG__ || [];
}

// LoopGuard to detect rapid repeated calls
const loopGuard = new Map<string, LoopGuardEntry>();
const LOOP_THRESHOLD = 3;
const LOOP_TIME_WINDOW = 100; // ms

function parseStackTrace(stack: string): StackFrame[] {
  const lines = stack.split('\n');
  const frames: StackFrame[] = [];
  
  for (const line of lines) {
    // Match various stack trace formats
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/) || 
                  line.match(/at\s+(.+?)\s+(.+?):(\d+):\d+/) ||
                  line.match(/(.+?)@(.+?):(\d+):\d+/);
    
    if (match) {
      frames.push({
        function: match[1] || 'anonymous',
        file: match[2] || 'unknown',
        line: parseInt(match[3] || '0', 10)
      });
    }
  }
  
  return frames;
}

function getStackSignature(stack: string): string {
  const frames = parseStackTrace(stack);
  // Use top 3 frames for signature, excluding traceSet itself
  const relevantFrames = frames
    .filter(frame => !frame.function.includes('traceSet'))
    .slice(0, 3);
  
  return relevantFrames
    .map(frame => `${frame.function}@${frame.file}:${frame.line}`)
    .join(' -> ');
}

export function traceSet<T>(
  config: (set: any, get: any, api: any) => T
) {
  return (set: any, get: any, api: any): T => {
    const wrappedSet = (partial: any, replace?: boolean) => {
      const stack = new Error().stack || '';
      const signature = getStackSignature(stack);
      const timestamp = Date.now();
      
      // LoopGuard check
      const existing = loopGuard.get(signature);
      if (existing) {
        if (timestamp - existing.firstSeen < LOOP_TIME_WINDOW) {
          existing.count++;
          if (existing.count > LOOP_THRESHOLD) {
            console.error(`🚨 INFINITE LOOP DETECTED: ${signature}`);
            console.error(`Called ${existing.count} times in ${timestamp - existing.firstSeen}ms`);
            console.error('Full stack:', stack);
            throw new Error(`Infinite setState loop detected: ${signature}`);
          }
        } else {
          // Reset if outside time window
          existing.count = 1;
          existing.firstSeen = timestamp;
        }
      } else {
        loopGuard.set(signature, { count: 1, firstSeen: timestamp });
      }
      
      // Log for test analysis
      if (globalThis.__ZUSTAND_SET_LOG__) {
        globalThis.__ZUSTAND_SET_LOG__.push({
          timestamp,
          stackSignature: signature,
          fullStack: stack
        });
      }
      
      // Console logging for development
      if (process.env.NODE_ENV === 'test') {
        console.log(`🔄 setState: ${signature}`);
      }
      
      return set(partial, replace);
    };
    
    return config(wrappedSet, get, api);
  };
}
