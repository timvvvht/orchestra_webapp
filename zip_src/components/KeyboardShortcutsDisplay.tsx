import React from 'react';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

type KeyboardShortcutsDisplayProps = {
  group?: string;
  showGlobal?: boolean;
};

export const KeyboardShortcutsDisplay: React.FC<KeyboardShortcutsDisplayProps> = ({
  group,
  showGlobal = true,
}) => {
  const { shortcuts } = useKeyboardShortcuts();
  
  // Filter shortcuts based on props
  const filteredShortcuts = shortcuts.filter(shortcut => {
    if (shortcut.disabled) return false;
    if (group && shortcut.group !== group) return false;
    if (!showGlobal && shortcut.global) return false;
    return true;
  });
  
  // Group shortcuts by their group
  const groupedShortcuts: Record<string, KeyboardShortcut[]> = {};
  filteredShortcuts.forEach(shortcut => {
    const group = shortcut.group || 'Ungrouped';
    if (!groupedShortcuts[group]) {
      groupedShortcuts[group] = [];
    }
    groupedShortcuts[group].push(shortcut);
  });
  
  // Format key combination for display
  const formatKeyCombo = (shortcut: KeyboardShortcut) => {
    const keys: string[] = [];
    if (shortcut.metaKey) keys.push('⌘');
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };
  
  if (filteredShortcuts.length === 0) {
    return <div className="text-muted-foreground text-sm">No keyboard shortcuts available</div>;
  }
  
  return (
    <div className="keyboard-shortcuts-display">
      {Object.entries(groupedShortcuts).map(([groupName, shortcuts]) => (
        <div key={groupName} className="mb-4">
          <h3 className="text-sm font-medium mb-2 text-foreground">{groupName}</h3>
          <div className="space-y-2">
            {shortcuts.map(shortcut => (
              <div key={shortcut.id} className="flex justify-between items-center">
                <span className="text-sm text-foreground">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted rounded border border-border">
                  {formatKeyCombo(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KeyboardShortcutsDisplay;