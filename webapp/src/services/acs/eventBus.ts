/*
 * Global lightweight event bus for SSE events (and future ACS events).
 * We use mitt because it is < 1k and tree-shakable.
 *
 *   import { eventBus } from '@/services/acs/eventBus';
 *   eventBus.on('sse', evt => { ... })
 */
import mitt from 'mitt';
import type { SSEEvent } from './shared/types';

export type ACSBusEvents = {
  sse: SSEEvent;
  // future: 'auth': AuthState, etc.
};

export const eventBus = mitt<ACSBusEvents>();

// Convenient re-export for default import style
export default eventBus;
