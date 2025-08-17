import { useEffect } from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';

export const useMissionControlHotkeys = () => {
  const { setShowNewDraftModal } = useMissionControlStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events from input fields, textareas, and contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' || 
        target?.tagName === 'TEXTAREA' ||
        target?.contentEditable === 'true'
      ) {
        return;
      }

      // CMD+N (or Ctrl+N) - Open New Draft Modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewDraftModal(true);
        return;
      }

      // Note: CMD+S and CMD+ENTER will be handled by specific components:
      // - CMD+S: Chat input component for saving as draft
      // - CMD+ENTER: Chat input component for sending message
      // These are context-specific and should be handled in the chat components
    };
    
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [setShowNewDraftModal]);
};