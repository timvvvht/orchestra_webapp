
import React from 'react';
import { Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ShortcutItemProps {
  action: string;
  keys: string[];
  isEditing: boolean;
  onToggleEdit: () => void;
}

export const ShortcutItem = ({ action, keys, isEditing, onToggleEdit }: ShortcutItemProps) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-foreground">{action}</span>
    {isEditing ? (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Press new shortcut...</span>
        <Button 
          variant="outline" 
          size="sm"
          className="h-7 text-xs border-border hover:bg-surface-1"
          onClick={onToggleEdit}
        >
          Cancel
        </Button>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {keys.map((key, index) => (
            <React.Fragment key={index}>
              <kbd className="px-2 py-1 text-xs rounded bg-surface-1 border border-border text-foreground font-mono">
                {key}
              </kbd>
              {index < keys.length - 1 && <span className="text-muted-foreground">+</span>}
            </React.Fragment>
          ))}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0"
          onClick={onToggleEdit}
        >
          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    )}
  </div>
);

interface ShortcutCategoryProps {
  name: string;
  shortcuts: Array<{
    id: string;
    action: string;
    keys: string[];
    isEditing?: boolean;
  }>;
  onToggleEdit: (shortcutId: string) => void;
}

export const ShortcutCategory = ({ name, shortcuts, onToggleEdit }: ShortcutCategoryProps) => (
  <div className="mb-6 last:mb-0">
    <h3 className="text-lg font-medium text-foreground mb-4">{name}</h3>
    <div className="space-y-3">
      {shortcuts.map(shortcut => (
        <ShortcutItem
          key={shortcut.id}
          action={shortcut.action}
          keys={shortcut.keys}
          isEditing={shortcut.isEditing || false}
          onToggleEdit={() => onToggleEdit(shortcut.id)}
        />
      ))}
    </div>
  </div>
);
