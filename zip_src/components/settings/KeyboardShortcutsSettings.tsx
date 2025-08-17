import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import KeyboardShortcutsDisplay from '@/components/KeyboardShortcutsDisplay';

export const KeyboardShortcutsSettings = () => {
  const { shortcuts } = useKeyboardShortcuts();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
        <p className="text-sm text-muted-foreground">
          Customize keyboard shortcuts for faster navigation and actions.
        </p>
      </div>
      
      <div className="border rounded-md p-4">
        <KeyboardShortcutsDisplay />
      </div>
      
      <div className="text-sm text-muted-foreground">
        <p>Keyboard shortcuts help you navigate and perform actions quickly.</p>
        <p className="mt-2">Press <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border">?</kbd> anywhere to see all available shortcuts.</p>
      </div>
    </div>
  );
};

export default KeyboardShortcutsSettings;