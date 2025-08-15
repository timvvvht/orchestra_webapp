import { LocalToolOrchestrator } from './LocalToolOrchestrator';
import { getFirehose } from '@/services/GlobalServiceManager';

/**
 * LocalToolOrchestrator Bootstrap
 * 
 * ARCHITECTURE NOTE: This orchestrator is initialized ONCE in App.tsx and persists
 * for the entire application lifecycle. It is NOT tied to React component lifecycle.
 * 
 * - Single initialization point: App.tsx useEffect
 * - Persistent across navigation and component remounts
 * - Accessible via useOrchestrator() hook (simple accessor)
 * - GlobalServiceManager references (not creates) this instance
 */

// Keep the singleton on window to avoid double-start
declare global {
  interface Window { __orch?: LocalToolOrchestrator }
}

export async function bootstrapOrchestrator() {
  if (window.__orch) return window.__orch;           // already running

  // Get the FirehoseMux instance from GlobalServiceManager
  const firehose = getFirehose();
  if (!firehose) {
    throw new Error('FirehoseMux not available from GlobalServiceManager');
  }
  
  const orch = new LocalToolOrchestrator(firehose);
  window.__orch = orch;
  await orch.start();                                // await ensures ready
  console.log('[bootstrapOrchestrator] LocalToolOrchestrator started with FirehoseMux');
  
  // Export globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).__orchestrator = orch;
  }
  
  return orch;
}