import React from 'react';
import { pushHydro, useHydroDebug } from '@/utils/hydroDebug';
import { X, Database, Activity, Package, MessageCircle, Eye, Copy, Check, Filter, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const iconMap = {
  DB: Database,
  PARSED: Activity,
  STORE: Package,
  CHAT: MessageCircle,
  TL: Eye,
} as const;

export default function HydrationDebugOverlay({ open, onClose }:{
  open:boolean; onClose:()=>void;
}) {
  // subscribe to buffer updates
  const [entries, setEntries] = React.useState<any[]>([]);
  const [copiedStage, setCopiedStage] = React.useState<string | null>(null);
  const [copiedEntry, setCopiedEntry] = React.useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = React.useState<string>('');
  const [showFilter, setShowFilter] = React.useState<boolean>(false);
  
  React.useEffect(() => {
    const updateEntries = () => {
      const current = useHydroDebug();
      setEntries(prev => {
        // Only update if the length changed to prevent unnecessary re-renders
        if (prev.length !== current.length) {
          return [...current];
        }
        return prev;
      });
    };
    
    // Initial load
    updateEntries();
    
    // Poll for updates
    const interval = setInterval(updateEntries, 1000);
    return () => clearInterval(interval);
  }, []);

  // Copy functionality
  const copyToClipboard = async (text: string, id: string, type: 'stage' | 'entry') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'stage') {
        setCopiedStage(id);
        setTimeout(() => setCopiedStage(null), 2000);
      } else {
        setCopiedEntry(id);
        setTimeout(() => setCopiedEntry(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Filter entries by session ID if filter is active
  const filteredEntries = React.useMemo(() => {
    if (!sessionFilter.trim()) return entries;
    
    return entries.filter(entry => {
      // Check various places where session ID might be stored
      const payload = entry.payload;
      if (!payload) return false;
      
      // Check direct sessionId field
      if (payload.sessionId && payload.sessionId.includes(sessionFilter.trim())) return true;
      
      // Check session_id field
      if (payload.session_id && payload.session_id.includes(sessionFilter.trim())) return true;
      
      // Check nested sessionId in firstRow (for DB stage)
      if (payload.firstRow?.session_id && payload.firstRow.session_id.includes(sessionFilter.trim())) return true;
      
      // Check if it's a ChatMessage with session info
      if (payload.sessionId && payload.sessionId.includes(sessionFilter.trim())) return true;
      
      // Check msgId for partial matches (in case session ID is part of message ID)
      if (payload.msgId && payload.msgId.includes(sessionFilter.trim())) return true;
      
      return false;
    });
  }, [entries, sessionFilter]);

  const grouped = filteredEntries.reduce<Record<string, any[]>>((acc,e)=>{
    (acc[e.stage]=acc[e.stage]||[]).push(e); return acc;
  },{});

  // Extract unique session IDs from all entries for quick selection
  const availableSessionIds = React.useMemo(() => {
    const sessionIds = new Set<string>();
    
    entries.forEach(entry => {
      const payload = entry.payload;
      if (!payload) return;
      
      // Collect session IDs from various fields
      if (payload.sessionId) sessionIds.add(payload.sessionId);
      if (payload.session_id) sessionIds.add(payload.session_id);
      if (payload.firstRow?.session_id) sessionIds.add(payload.firstRow.session_id);
    });
    
    return Array.from(sessionIds).sort();
  }, [entries]);

  if(!open) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x:0, opacity:1 }}
      exit={{ x:400, opacity:0 }}
      transition={{ type:'spring', stiffness:300, damping:30 }}
      className="fixed top-0 right-0 w-[380px] h-full bg-[#0D0D0D] border-l border-white/10 z-[130]"
    >
      <div className="border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Hydration Debug</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={cn(
                "p-1.5 hover:bg-white/10 rounded transition-colors",
                showFilter ? "text-blue-400" : "text-white/60 hover:text-white"
              )}
              title="Filter by session ID"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => copyToClipboard(JSON.stringify(grouped, null, 2), 'all', 'stage')}
              className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
              title="Copy all data"
            >
              {copiedStage === 'all' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X className="w-4 h-4"/>
            </button>
          </div>
        </div>
        
        {showFilter && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-white/40" />
                <input
                  type="text"
                  placeholder="Enter session ID to filter..."
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/10"
                />
              </div>
              {sessionFilter && (
                <button
                  onClick={() => setSessionFilter('')}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {sessionFilter && (
              <div className="mt-2 text-xs text-white/60">
                Showing {filteredEntries.length} of {entries.length} entries
                {filteredEntries.length === 0 && entries.length > 0 && (
                  <span className="text-yellow-400 ml-2">No matches found</span>
                )}
              </div>
            )}
            
            {availableSessionIds.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-white/50 mb-1">Quick select:</div>
                <div className="flex flex-wrap gap-1">
                  {availableSessionIds.slice(0, 3).map(sessionId => (
                    <button
                      key={sessionId}
                      onClick={() => setSessionFilter(sessionId)}
                      className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/70 hover:text-white transition-colors"
                      title={`Filter by ${sessionId}`}
                    >
                      {sessionId.slice(-8)}
                    </button>
                  ))}
                  {availableSessionIds.length > 3 && (
                    <span className="px-2 py-1 text-xs text-white/40">
                      +{availableSessionIds.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-full overflow-y-auto px-3 py-2 space-y-4">
        {(['DB','PARSED','STORE','CHAT','TL'] as const).map(stage=>{
          const Icon = iconMap[stage];
          const list = grouped[stage] ?? [];
          return (
            <div key={stage}>
              <div className="flex items-center gap-2 mb-1 text-xs text-white/70">
                <Icon className="w-3 h-3"/> <span>{stage}</span>
                <span className="text-white/40">{list.length}</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(list, null, 2), stage, 'stage')}
                  className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                  title={`Copy all ${stage} entries`}
                >
                  {copiedStage === stage ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-white/50 hover:text-white/80" />
                  )}
                </button>
              </div>
              <div className="space-y-1">
                {list.slice(-10).reverse().map((e,i)=>{
                  const entryId = `${stage}-${i}`;
                  return (
                    <details key={i} className="bg-white/[0.05] rounded px-2 py-1 text-[10px] text-white/80">
                      <summary className="cursor-pointer truncate select-none flex items-center justify-between">
                        <span className="flex-1 truncate">
                          {JSON.stringify(e.payload).slice(0,70)}…
                        </span>
                        <button
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            copyToClipboard(JSON.stringify(e.payload, null, 2), entryId, 'entry');
                          }}
                          className="ml-2 p-0.5 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                          title="Copy this entry"
                        >
                          {copiedEntry === entryId ? (
                            <Check className="w-2.5 h-2.5 text-green-400" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-white/50 hover:text-white/80" />
                          )}
                        </button>
                      </summary>
                      <div className="flex items-start justify-between mt-1">
                        <pre className="whitespace-pre-wrap break-all max-h-[150px] overflow-auto flex-1">
                          {JSON.stringify(e.payload,null,2)}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(e.payload, null, 2), `${entryId}-full`, 'entry')}
                          className="ml-2 p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                          title="Copy full JSON"
                        >
                          {copiedEntry === `${entryId}-full` ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-white/50 hover:text-white/80" />
                          )}
                        </button>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}