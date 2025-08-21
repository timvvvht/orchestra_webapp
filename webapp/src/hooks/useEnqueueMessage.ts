import { useState, useEffect } from "react";
import { enqueue, list, remove, hasQueued } from "@/lib/simpleQueues";

/** Returns queue management functions bound to this sessionId */
export function useEnqueueMessage(sessionId: string) {
  const [queuedCount, setQueuedCount] = useState(0);

  // Update count when queue changes
  const updateCount = () => {
    const currentList = list(sessionId);
    setQueuedCount(currentList.length);
  };

  // Update count on mount and when sessionId changes
  useEffect(() => {
    updateCount();
  }, [sessionId]);

  return {
    enqueue: (text: string) => {
      enqueue(sessionId, text);
      updateCount();
    },
    queuedCount,
    list: () => list(sessionId),
    remove: (index: number) => {
      remove(sessionId, index);
      updateCount();
    },
    hasQueued: () => hasQueued(sessionId),
    refresh: updateCount, // Manual refresh if needed
  };
}
