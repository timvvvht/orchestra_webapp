import { useEffect, useRef } from 'react';
import { generateSessionTitle } from '@/api/titleApi';
import * as ChatService from '@/services/supabase/chatService';
import type { ChatMessage } from '@/types/chatTypes';

interface Options {
  sessionId: string | undefined;
  displayTitle: string | null | undefined;
  messages: ChatMessage[];
  setSessionTitle: (title: string) => void;   // callback into parent hook
}

const CONFIG = {
  MIN_MESSAGES: 4,
  MIN_TOTAL_CHARS: 1000,
  MIN_USER_CHARS: 20
};

export const useSessionTitleAutoGen = ({
  sessionId,
  displayTitle,
  messages,
  setSessionTitle
}: Options) => {
  const hasTriggered = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId) return;
    if (displayTitle) return;                    // already has a title
    if (hasTriggered.current.has(sessionId)) return;

    if (messages.length < CONFIG.MIN_MESSAGES) return;

    let total = 0, userTotal = 0;
    messages.forEach(m => {
      const len = m.content
        .filter(p => p.type === 'text')
        .reduce((sum, p: any) => sum + (p.text?.length || 0), 0);
      total += len;
      if (m.role === 'user') userTotal += len;
    });
    if (total < CONFIG.MIN_TOTAL_CHARS) return;
    if (userTotal < CONFIG.MIN_USER_CHARS) return;

    (async () => {
      try {
        console.log(`[useSessionTitleAutoGen] Generating title for session ${sessionId}: ${messages.length} messages, ${total} total chars, ${userTotal} user chars`);
        
        const title = await generateSessionTitle(messages);
        
        // Optimistic UI update first
        setSessionTitle(title);
        
        // Then persist to Supabase
        if (sessionId) {
          await ChatService.updateSessionTitle(sessionId, title);
        }
        
        hasTriggered.current.add(sessionId);
        
        console.log(`[useSessionTitleAutoGen] Successfully generated and updated title for session ${sessionId}: "${title}"`);
      } catch (err) {
        console.error('[useSessionTitleAutoGen] Title generation failed for session', sessionId, ':', err);
        // Don't add to hasTriggered on failure so it can retry later
      }
    })();
  }, [sessionId, displayTitle, messages, setSessionTitle]);
};