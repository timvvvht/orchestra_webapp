import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/types/chatTypes';
import { useEventStore } from '@/stores/eventStores';

interface Props {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  sessionId: string;
}

export default function ToolEventDebugPanel({ open, onClose, messages, sessionId }: Props) {
  const toolMsgs = messages.filter(m =>
    Array.isArray(m.content) &&
    m.content.some(p => p.type === 'tool_use' || p.type === 'tool_result' ||
                        'tool_use_id' in (p as any))
  );

  /* ───────────────────────────────
   * Pull raw CanonicalEvents for the same session
   * ─────────────────────────────── */
  const storeEvents = useMemo(() => {
    const state = useEventStore.getState();
    const eventIds = state.bySession.get(sessionId) ?? [];
    return eventIds.map(id => state.byId.get(id)).filter(Boolean);
  }, [sessionId]);
  
  // Subscribe to store changes to trigger re-render when events change
  useEventStore(state => state.bySession.get(sessionId)?.length ?? 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed top-0 right-0 h-full w-[380px] bg-gray-900 border-l
                     border-white/10 shadow-xl z-[140] flex flex-col"
        >
          {/* header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Tool Debug</h3>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* body */}
          <ScrollArea className="flex-1 p-3 space-y-6">
            {/* ChatMessage layer */}
            <div>
              <h4 className="text-xs font-semibold text-blue-300 mb-2">
                ChatMessage tool messages ({toolMsgs.length})
              </h4>
              {toolMsgs.length === 0 ? (
                <p className="text-[11px] text-white/50">none</p>
              ) : (
                toolMsgs.map(msg => (
                  <div key={msg.id} className="mb-3 border border-blue-500/40 rounded p-2">
                    <div className="text-[10px] text-blue-400 mb-1">
                      {msg.role} • {new Date(msg.createdAt).toLocaleTimeString()} • id:{' '}
                      {msg.id.slice(0, 8)}
                    </div>
                    <pre className="text-[10px] text-white/80 whitespace-pre-wrap">
{JSON.stringify(msg.content, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>

            {/* Raw Event-Store layer */}
            <div>
              <h4 className="text-xs font-semibold text-amber-300 mb-2">
                Canonical store events ({storeEvents.length})
              </h4>
              {storeEvents.length === 0 ? (
                <p className="text-[11px] text-white/50">store empty</p>
              ) : (
                storeEvents.map(ev => (
                  <div key={ev.id} className="mb-3 border border-amber-500/40 rounded p-2">
                    <div className="text-[10px] text-amber-400 mb-1">
                      {ev.kind} • {ev.id.slice(0,8)}
                    </div>
                    <pre className="text-[10px] text-white/80 whitespace-pre-wrap">
{JSON.stringify(ev, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}