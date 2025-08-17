
import React from 'react';
import { Keyboard } from 'lucide-react';
import { ShortcutCategory } from './KeyboardShortcutList';
import { Card, CardContent } from '@/components/ui/card';

interface KeyboardSearchResultsProps {
  categories: Array<{
    id: string;
    name: string;
    shortcuts: Array<{
      id: string;
      action: string;
      keys: string[];
      isEditing?: boolean;
    }>;
  }>;
  onToggleEdit: (categoryId: string, shortcutId: string) => void;
}

const KeyboardSearchResults = ({ categories, onToggleEdit }: KeyboardSearchResultsProps) => {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Keyboard className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm font-medium">No shortcuts match your search</p>
        <p className="text-xs mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <Card className="border border-border bg-surface-1 backdrop-blur-md">
      <CardContent className="pt-6 space-y-6">
        {categories.map(category => (
          <ShortcutCategory
            key={category.id}
            name={category.name}
            shortcuts={category.shortcuts}
            onToggleEdit={(shortcutId) => onToggleEdit(category.id, shortcutId)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default KeyboardSearchResults;
