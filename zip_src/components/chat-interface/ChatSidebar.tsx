import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatUI } from '@/context/ChatUIContext';
import { Search, Plus, ChevronLeft, ChevronRight, MessageSquare, Edit3, X, BrainCircuit, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import AgentListItem from './AgentListItem';
import CreateAgentDialog from './CreateAgentDialog';
import NewChatModal from './NewChatModal';
import { SessionMeta } from '@/types/chatTypes';

// ─────────────────────────────────────────────────────────────
// 💡 Grouping Helper: categorize sessions into Today / This Week / Older
// ─────────────────────────────────────────────────────────────
const groupSessionsByRecency = (sessions: SessionMeta[]) => {
  const ONE_DAY = 86_400_000;           // 24 h
  const ONE_WEEK = 7 * ONE_DAY;         // 7 d
  const now = Date.now();

  const buckets: Record<string, SessionMeta[]> = {
    Today: [],
    'This Week': [],
    Older: []
  };

  sessions.forEach(s => {
    const age = now - (s.lastUpdated ?? 0);
    if (age <= ONE_DAY) buckets.Today.push(s);
    else if (age <= ONE_WEEK) buckets['This Week'].push(s);
    else buckets.Older.push(s);
  });

  // sort newest→oldest inside each bucket
  Object.values(buckets).forEach(arr =>
    arr.sort((a, b) => (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0))
  );

  // return only non-empty buckets, in the order we want to show them
  return (['Today', 'This Week', 'Older'] as const)
    .filter(label => buckets[label].length)
    .map(label => ({ label, sessions: buckets[label] }));
};

interface ChatSidebarProps {
  selectedAgentId: string | null;
  collapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  // ACS Integration - New props for cloud-based sessions
  sessions?: SessionMeta[];
  onSessionSelect?: (sessionId: string) => void;
  onSessionDelete?: (sessionId: string) => void;
  onSessionRename?: (sessionId: string, newName: string) => void;
  onNewSession?: () => void;
  isLoading?: boolean;
  currentSessionId?: string;
  // Mobile support props
  mobile?: boolean;
  onClose?: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  selectedAgentId,
  collapsed,
  onToggleCollapse,
  sessions: acsSessions,
  onSessionSelect,
  onSessionDelete,
  onSessionRename,
  onNewSession,
  isLoading = false,
  currentSessionId,
  mobile = false,
  onClose
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use ACS chat UI context
  const chatUI = useChatUI();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreateAgentDialogOpen, setIsCreateAgentDialogOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Use ACS sessions if provided via props, otherwise use context sessions
  const sessions = acsSessions;
  const isACSMode = true; // Always in ACS mode now

  const filteredSessions = useMemo(() => {
    console.log("[ChatSidebar] Raw sessions prop:", JSON.stringify(sessions, null, 2));
    console.log("[ChatSidebar] Raw chatUI.sessions:", JSON.stringify(chatUI.sessions, null, 2));
    let sessionValues: SessionMeta[] = [];
    
    if (Array.isArray(sessions)) {
      // ACS mode via props - sessions already in expected format
      console.log("[ChatSidebar] Using sessions prop - first session:", sessions[0]);
      sessionValues = sessions;
    } else if (Array.isArray(chatUI.sessions)) {
      // ACS mode via context - map to expected format
      console.log("[ChatSidebar] Using chatUI.sessions - first session:", chatUI.sessions[0]);
      sessionValues = chatUI.sessions.map(session => ({
        id: session.id,
        name: session.name,
        avatar: 'assets/robots/robot1.png', // TODO: Get from session metadata
        lastUpdated: session.last_message_at ? new Date(session.last_message_at).getTime() : new Date(session.created_at).getTime(),
        createdAt: new Date(session.created_at).getTime(),
        unreadCount: 0, // TODO: Implement unread count
        messageCount: session.message_count || 0
      }));
    }
    
    console.log("[ChatSidebar] Transformed sessionValues:", JSON.stringify(sessionValues.slice(0, 3), null, 2));
    
    // Early return if no sessions
    if (sessionValues.length === 0) return [];
    
    // Filter first, then sort (more efficient)
    let filtered = sessionValues;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = sessionValues.filter((session) => 
        session.name && session.name.toLowerCase().includes(query)
      );
    }
    
    // Sort by lastUpdated timestamp in descending order (newest first)
    return filtered.sort((a, b) => {
      const aTime = a.lastUpdated || 0;
      const bTime = b.lastUpdated || 0;
      return bTime - aTime;
    });
  }, [sessions, searchQuery, chatUI.sessions]);

  const handleNewChat = () => {
    if (onNewSession) {
      // ACS mode via props: use callback
      onNewSession();
    } else {
      // ACS mode via context: create session directly
      chatUI.createSession().then(sessionId => {
        chatUI.navigateToSession(sessionId);
      }).catch(error => {
        console.error('Failed to create new session:', error);
        toast.error('Failed to create new session');
      });
    }
  };
  // Group sessions by recency for section headers
  const groupedBuckets = useMemo(() => groupSessionsByRecency(filteredSessions), [filteredSessions]);

  return (
    <div className="h-full relative flex flex-col z-10">
      {/* Header - Apple style with subtle depth */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-transparent opacity-50" />
        <div className={cn(
          "relative flex items-center gap-3 h-16 px-6", 
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-[#007AFF] blur-xl opacity-30" />
                <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#0051D5] flex items-center justify-center shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              </div>
              <h2 className="font-semibold text-white text-lg tracking-tight">Conversations</h2>
            </motion.div>
          )}
          
          {/* New Chat Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewChat}
            className="relative group"
            title="Start new conversation"
          >
            <div className="absolute inset-0 bg-white/10 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Plus className="h-4 w-4 text-white/70 group-hover:text-white" />
            </div>
          </motion.button>
        </div>
      </div>
      
      {/* Search Bar - Floating style */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-3 bg-white/5 border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/20 transition-all"
            />
          </div>
        </div>
      )}

      {/* Chat List - Refined with better spacing and animations */}
      <ScrollArea className="flex-1 px-3">
        <AnimatePresence mode="popLayout">
          {groupedBuckets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-40 text-center px-4"
            >
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-white/5 blur-2xl" />
                <MessageSquare className="relative h-12 w-12 text-white/20" />
              </div>
              <p className="text-white/70 text-sm font-medium">No conversations found</p>
              <p className="text-xs text-white/40 mt-1">Start a new chat or adjust your search</p>
            </motion.div>
          ) : (
            <div className="space-y-6 pb-4">
              {groupedBuckets.map((bucket, bucketIdx) => (
                <div key={bucket.label} className="space-y-2">
                  {/* section label */}
                  <div className="pt-2 pb-1">
                    <h3 className="text-xs font-medium text-white/40 px-3">
                      {bucket.label}
                    </h3>
                  </div>

                  {/* sessions in this bucket */}
                  {bucket.sessions.map((session, idx) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (bucketIdx * 5 + idx) * 0.05 }}
                    >
                      <AgentListItem
                        session={session}
                        selected={
                          currentSessionId === session.id ||
                          chatUI.currentSessionId === session.id
                        }
                        collapsed={collapsed}
                        editMode={isEditMode}
                        onClick={() => {
                          onSessionSelect
                            ? onSessionSelect(session.id)
                            : chatUI.navigateToSession(session.id);
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Bottom Actions - Refined */}
      {!collapsed && (
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="p-4 space-y-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreateAgentDialogOpen(true)}
              className="w-full relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#007AFF] to-[#5856D6] rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
              <div className="relative flex items-center justify-center gap-2 h-10 px-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
                <BrainCircuit className="h-4 w-4 text-white/70" />
                <span className="text-sm font-medium text-white/70">Create Agent</span>
              </div>
            </motion.button>
          </div>
        </div>
      )}

      {/* Create Agent Dialog */}
      <CreateAgentDialog 
        isOpen={isCreateAgentDialogOpen}
        onClose={() => setIsCreateAgentDialogOpen(false)}
      />
      
      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </div>
  );
};

export default ChatSidebar;