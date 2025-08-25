import React, { useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import ChatMainCanonicalLegacy from '@/components/chat-interface/ChatMainCanonicalLegacy';
import PreviewFrame from '@/components/preview/PreviewFrame';
import { useSessionRepoContextStore } from '@/stores/sessionRepoContextStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ChatUIProvider } from '@/context/ChatUIContext';
import { SelectionProvider } from '@/context/SelectionContext';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { supabase } from '@/auth/SupabaseClient';
import { useAuth } from '@/auth/AuthContext';

export default function WorkspaceSessionFocused() {
  const { hashed_workspace_id, sessionId } = useParams<{
    hashed_workspace_id: string;
    sessionId: string;
  }>();
  const acsBase = (import.meta.env.VITE_ACS_BASE_URL || 'http://localhost:8001').replace(/\/$/, '');
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { setSessions } = useMissionControlStore();

  // Populate mission control store with session data so ChatMainCanonicalLegacy can find it
  const populateSessionInStore = useCallback(async () => {
    if (!sessionId || !isAuthenticated) return;

    try {
      console.log('[WorkspaceSessionFocused] Fetching session data for store population:', sessionId);
      
      // Fetch the specific session from Supabase
      // Only add user_id filter when authenticated (avoids single-player-user timing issues)
      const query = supabase.from('chat_sessions').select('*').eq('id', sessionId);
      if (isAuthenticated && user?.id) {
        query.eq('user_id', user.id);
      }
      const { data: sessionData, error: sessionError } = await query.single();

      if (sessionError || !sessionData) {
        console.warn('[WorkspaceSessionFocused] Session not found or error:', sessionError);
        return;
      }

      // Get latest message for this session
      const { data: latestMessage } = await supabase
        .from('chat_messages')
        .select('id, role, content, timestamp')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      // Create session object for mission control store
      const sessionForStore = {
        ...sessionData,
        latest_message_id: latestMessage?.id || null,
        latest_message_role: latestMessage?.role || null,
        latest_message_content: latestMessage?.content || null,
        latest_message_timestamp: latestMessage?.timestamp || null,
      };

      console.log('[WorkspaceSessionFocused] Populating mission control store with session:', sessionForStore);
      
      // Add to mission control store so ChatMainCanonicalLegacy can find it
      setSessions([sessionForStore]);
      
    } catch (error) {
      console.error('[WorkspaceSessionFocused] Failed to populate session in store:', error);
    }
  }, [sessionId, isAuthenticated, user?.id, setSessions]);

  // If navigation provided repo context in location.state, hydrate store synchronously
  useEffect(() => {
    try {
      const navState = (location.state as any) || {};
      const repoCtx = navState.repoCtx;
      if (repoCtx && sessionId) {
        useSessionRepoContextStore.getState().setRepoContext(sessionId, {
          repo_id: repoCtx.repo_id,
          repo_full_name: repoCtx.repo_full_name,
          branch: repoCtx.branch || 'main',
        });
        console.log('[WorkspaceSessionFocused] Hydrated sessionRepoContextStore from navigation state', { sessionId, repoCtx });
      }
    } catch (err) {
      // Don't block rendering on hydration failures
      console.warn('[WorkspaceSessionFocused] Failed to hydrate repo context from navigation state', err);
    }
  }, [location.state, sessionId]);

  // Populate mission control store with session data on mount
  useEffect(() => {
    populateSessionInStore();
  }, [populateSessionInStore]);

  // Guard: don't render ChatMain until we have a route sessionId
  if (!sessionId) {
    return <div className="h-screen flex items-center justify-center text-white/60">Loading...</div>;
  }

  return (
    <ChatUIProvider>
      <SelectionProvider>
        <div className="h-screen flex flex-col bg-black">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-2 border-b border-white/10">
            <div className="text-sm text-white/80">
              <span className="font-medium">Workspace</span>
              {" / "}
              <span className="font-semibold">
                {sessionId ? `Session ${sessionId.slice(0, 8)}...` : "No session"}
              </span>
            </div>
            <div className="text-xs text-white/60">Focused Mode</div>
          </div>

          {/* Split Panes */}
          <div className="flex flex-1 min-h-0">
            <div className="w-1/2 min-w-[420px] border-r border-white/10">
              <ChatMainCanonicalLegacy
                sessionId={sessionId || ''}
                hideHeader={true}
                sidebarCollapsed={true}
                renderMode="focused"
              />
            </div>
            <div className="flex-1">
              <PreviewFrame acsBaseUrl={acsBase} sessionId={sessionId || ''} />
            </div>
          </div>
        </div>
      </SelectionProvider>
    </ChatUIProvider>
  );
}