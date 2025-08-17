import React, { useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useChatUI } from '@/context/ChatUIContext';
import { useSelections } from '@/context/SelectionContext';
import { ChatResponsiveLayout } from '@/layouts/ChatResponsiveLayout';
import ChatMainCanonicalLegacy from '@/components/chat-interface/ChatMainCanonicalLegacy';

/**
 * OptimisticBootstrap - Handles optimistic conversation starting inside the provider
 */
const OptimisticBootstrap: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { search } = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  // Use the context hook instead of creating a new instance
  const chat = useChatUI();



  const agentConfigId = useMemo(() => searchParams.get('agentConfigId') ?? undefined, [searchParams.get('agentConfigId')]);
  const sessionName = useMemo(() => searchParams.get('sessionName') ?? undefined, [searchParams.get('sessionName')]);
  const modelId = useMemo(() => searchParams.get('modelId') ?? undefined, [searchParams.get('modelId')]);
  const projectPath = useMemo(() => {
    const path = searchParams.get('projectPath');
    return path ? decodeURIComponent(path) : undefined;
  }, [searchParams.get('projectPath')]); // 👈 ADD PROJECT PATH EXTRACTION

  // Track if we've started optimistic bootstrap
  const hasStartedRef = useRef(false);
  const bootstrapTokenRef = useRef<string>();

  // 🔧 ORACLE FIX: Stable useEffect with minimal dependencies and empty query guard
  useEffect(() => {
    // Only run once per mount
    if (!sessionId || hasStartedRef.current) return;
    if (!chat.isInitialized || chat.isLoading) return;

    // 🚨 CRITICAL: Guard against undefined session ID
    if (sessionId === 'undefined' || sessionId.trim() === '') {
      console.error('❌ [ChatRoute] Invalid sessionId detected:', sessionId);
      navigate('/', { replace: true }); // Redirect to landing page
      return;
    }

    // Guard against empty query & duplicates
    const initialQP = searchParams.get('initialMessage');
    if (!initialQP) {
      console.warn('[ChatRoute] No initialMessage param; abort bootstrap');
      return; // prevents blank duplicate call
    }

    hasStartedRef.current = true;

    // Use decoded param (guaranteed to exist from guard above)
    const initialMessage = decodeURIComponent(initialQP);

    // Dedup token to prevent remount duplicates
    const dedupToken = `${sessionId}:${initialMessage}`;
    if (bootstrapTokenRef.current === dedupToken) {
      console.warn('[ChatRoute] Duplicate bootstrap attempt detected, skipping');
      return;
    }
    bootstrapTokenRef.current = dedupToken;

    console.log('🚀 [ChatRoute] REAL SESSION BOOTSTRAP START:', {
      realSessionId: sessionId,
      initialMessage: `"${initialMessage}"`,
      initialMessageLength: initialMessage.length,
      agentConfigId,
      sessionName,
      modelId, // 👈 ADD MODEL ID TO LOGGING
      projectPath, // 👈 ADD PROJECT PATH TO LOGGING
      searchParamsRaw: search
    });

    // Send message into existing real session
    const startOptions: Parameters<typeof chat.startConversation>[1] = {
      optimistic: true,           // paint user bubble immediately
      sessionId                   // still send into the real session
    };

    if (sessionName) startOptions.sessionName = sessionName;
    if (agentConfigId) startOptions.agentConfigId = agentConfigId;
    if (modelId) startOptions.modelId = modelId; // 👈 ADD MODEL ID TO START OPTIONS
    if (projectPath) startOptions.projectPath = projectPath; // 👈 ADD PROJECT PATH TO START OPTIONS

    console.log('📤 [ChatRoute] Calling chat.startConversation with:', {
      message: `"${initialMessage}"`,
      options: startOptions,
      sessionIdCheck: { sessionId, type: typeof sessionId, length: sessionId?.length }
    });

    chat.startConversation(initialMessage, startOptions)
      .then(async () => {
        /* ------------------------------------------------------------------ *
         *  Force-refresh session metadata (incl. agent_cwd)                  *
         *  – createSession sets cwd='/workspace'                             *
         *  – startConversation updates the cwd on the backend                *
         *  – but local store still holds the old value until we reload it.   *
         * ------------------------------------------------------------------ */
        try {
          await chat.refresh();            // ⬅️ pulls fresh session details
        } catch (err) {
          console.error(
            '[ChatRoute] Failed to refresh session after bootstrap:', err
          );
        }

        console.log('✅ [ChatRoute] First message sent into existing session', { sessionId });

        /* Note: Query parameter cleanup now handled by ChatMainCanonicalLegacy */
      })
      .catch(err => {
        console.error('❌ [ChatRoute] Failed to send first message:', {
          sessionId,
          error: err.message,
          stack: err.stack
        });
        // TODO: surface error UI / retry
      });

  }, [sessionId, chat.isInitialized, chat.isLoading, searchParams, agentConfigId, sessionName, modelId, projectPath, chat.startConversation, navigate, search]); // 👈 ADD MODEL ID AND PROJECT PATH TO DEPENDENCIES

  return null; // This component only handles side effects
};

/**
 * ChatRoute - ACS-powered ChatLayout with optimistic UI support
 * 
 * This component wraps the ChatLayout with the ChatUIProvider
 * and handles optimistic bootstrapping for temp sessions.
 */
const ChatRoute: React.FC = () => {
  console.log('🚨 ChatRoute: Component rendering');

  // Add a visual indicator that React is working
  React.useEffect(() => {
    console.log('🚨 ChatRoute: useEffect running');
    document.title = `Chat Route Loaded - ${new Date().toLocaleTimeString()}`;
  }, []);

  return (
    <>
      <OptimisticBootstrap />
      <ChatResponsiveLayout>
        <ChatMainCanonicalLegacy sidebarCollapsed={false} />
      </ChatResponsiveLayout>
    </>
  );
};

export default ChatRoute;