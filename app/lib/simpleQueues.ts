// Simple in-memory per-session message queues
type QueueMap = Record<string /*sessionId*/, string[]>;

const queues: QueueMap = {};

/** Put a draft at the tail of the session queue */
export function enqueue(sessionId: string, text: string) {
  (queues[sessionId] ??= []).push(text);
}

/** Remove and return the next draft, or undefined if none */
export function shift(sessionId: string): string | undefined {
  return queues[sessionId]?.shift();
}

/** True if anything waiting for that session */
export function hasQueued(sessionId: string) {
  return (queues[sessionId]?.length ?? 0) > 0;
}

/** Get all queued messages for a session (for display) */
export function list(sessionId: string): string[] {
  return [...(queues[sessionId] ?? [])];
}

/** Remove a specific message by index */
export function remove(sessionId: string, index: number): void {
  const queue = queues[sessionId];
  if (queue && index >= 0 && index < queue.length) {
    queue.splice(index, 1);
  }
}

/** Get queue length for debugging/UI purposes */
export function getQueueLength(sessionId: string): number {
  return queues[sessionId]?.length ?? 0;
}

/** Clear all queued messages for a session */
export function clearQueue(sessionId: string) {
  delete queues[sessionId];
}