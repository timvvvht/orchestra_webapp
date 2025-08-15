import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useKeyboardShortcuts, showNotification } from './useKeyboardShortcuts';

interface UseMissionControlShortcutsProps {
  onNewDraft?: () => void;
  onSaveDraft?: () => void;
  onSendToAgent?: () => void;
  isModalOpen?: boolean;
}

/**
 * Mission Control specific keyboard shortcuts hook
 * - ⌘+N: Open new draft modal (only on Mission Control route)
 * - ⌘+S: Save draft (only when modal is open)
 * - ⌘+Enter: Send to agent (only when modal is open)
 */
export const useMissionControlShortcuts = ({
  onNewDraft,
  onSaveDraft,
  onSendToAgent,
  isModalOpen = false
}: UseMissionControlShortcutsProps = {}) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const location = useLocation();
  const registeredShortcuts = useRef<Set<string>>(new Set());

  // Check if we're on the Mission Control route
  const isMissionControlRoute = location.pathname === '/mission-control';

  // Detect platform for appropriate modifier key
  const isMac = navigator.platform.toLowerCase().includes('mac');

  // Register/unregister shortcuts based on context
  useEffect(() => {
    // Clear all previously registered shortcuts
    registeredShortcuts.current.forEach(id => {
      unregisterShortcut(id);
    });
    registeredShortcuts.current.clear();

    // Only register shortcuts on Mission Control route
    if (!isMissionControlRoute) {
      return;
    }

    // ⌘+N: New Draft (global on Mission Control route)
    if (onNewDraft) {
      const newDraftShortcutId = 'mission-control-new-draft';
      registerShortcut({
        id: newDraftShortcutId,
        key: 'n',
        metaKey: isMac,
        ctrlKey: !isMac,
        description: 'Create new draft',
        group: 'mission-control',
        global: true,
        handler: () => {
          console.log('🎯 [MissionControl] New draft shortcut triggered');
          onNewDraft();
          showNotification('Opening new draft modal');
        },
      });
      registeredShortcuts.current.add(newDraftShortcutId);
    }

    // Modal-specific shortcuts (only when modal is open)
    if (isModalOpen) {
      // ⌘+S: Save Draft
      if (onSaveDraft) {
        const saveDraftShortcutId = 'mission-control-save-draft';
        registerShortcut({
          id: saveDraftShortcutId,
          key: 's',
          metaKey: isMac,
          ctrlKey: !isMac,
          description: 'Save draft',
          group: 'mission-control-modal',
          global: true,
          handler: (e) => {
            console.log('💾 [MissionControl] Save draft shortcut triggered');
            onSaveDraft();
          },
        });
        registeredShortcuts.current.add(saveDraftShortcutId);
      }

      // ⌘+Enter: Send to Agent
      if (onSendToAgent) {
        const sendToAgentShortcutId = 'mission-control-send-to-agent';
        registerShortcut({
          id: sendToAgentShortcutId,
          key: 'Enter',
          metaKey: isMac,
          ctrlKey: !isMac,
          description: 'Send to agent',
          group: 'mission-control-modal',
          global: true,
          handler: () => {
            console.log('🚀 [MissionControl] Send to agent shortcut triggered');
            onSendToAgent();
            showNotification('Sending to agent');
          },
        });
        registeredShortcuts.current.add(sendToAgentShortcutId);
      }
    }

    // Cleanup function
    return () => {
      registeredShortcuts.current.forEach(id => {
        unregisterShortcut(id);
      });
      registeredShortcuts.current.clear();
    };
  }, [
    isMissionControlRoute,
    isModalOpen,
    onNewDraft,
    onSaveDraft,
    onSendToAgent,
    registerShortcut,
    unregisterShortcut,
    isMac
  ]);

  // Return utility functions for components to use
  return {
    isMissionControlRoute,
    getShortcutHint: useCallback((action: 'new' | 'save' | 'send') => {
      const modifier = isMac ? '⌘' : 'Ctrl+';
      switch (action) {
        case 'new':
          return `${modifier}N`;
        case 'save':
          return `${modifier}S`;
        case 'send':
          return `${modifier}↵`;
        default:
          return '';
      }
    }, [isMac])
  };
};