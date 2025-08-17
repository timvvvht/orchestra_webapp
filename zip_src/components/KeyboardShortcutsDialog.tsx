import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

export const KeyboardShortcutsDialog = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { shortcuts, registerShortcut } = useKeyboardShortcuts();
  const registeredRef = useRef(false);
  
  // Register the ? shortcut to open this dialog - only once
  useEffect(() => {
    if (!registeredRef.current) {
      // Detect platform to use appropriate modifier key
      const isMac = navigator.platform.toLowerCase().includes('mac');
      
      registerShortcut({
        id: 'show-shortcuts',
        key: '?',
        // No modifier keys for the ? shortcut - just press ? directly
        description: 'Show keyboard shortcuts',
        group: 'help',
        global: true,
        handler: () => setOpen(true),
      });
      
      console.log('Registered keyboard shortcuts dialog with ? key');
      registeredRef.current = true;
    }
  }, [registerShortcut]);
  
  // Filter shortcuts based on search term
  const filteredShortcuts = searchTerm
    ? shortcuts.filter(s => 
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.group && s.group.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : shortcuts;
  
  // Group shortcuts by their group
  const groupedShortcuts: Record<string, KeyboardShortcut[]> = {};
  filteredShortcuts.forEach(shortcut => {
    const group = shortcut.group || 'General';
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
    if (shortcut.altKey) keys.push('⌥');
    if (shortcut.shiftKey) keys.push('⇧');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4">
            <Input
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto mt-4 pr-2">
          {Object.entries(groupedShortcuts).length > 0 ? (
            Object.entries(groupedShortcuts).map(([group, shortcuts]) => (
              <div key={group} className="mb-6 last:mb-0">
                <h3 className="text-sm font-medium mb-2 text-foreground">{group}</h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div key={shortcut.id} className="flex justify-between items-center py-1 border-b border-border last:border-0">
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border">
                        {formatKeyCombo(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No shortcuts found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;