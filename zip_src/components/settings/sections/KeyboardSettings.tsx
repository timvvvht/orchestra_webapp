import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KeyboardSearchResults from './keyboard/KeyboardSearchResults';
import { ShortcutCategory } from './keyboard/KeyboardShortcutList';
import KeyboardShortcutsDisplay from '@/components/KeyboardShortcutsDisplay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from 'sonner';

interface ShortcutCategory {
  id: string;
  name: string;
  shortcuts: Shortcut[];
}

interface Shortcut {
  id: string;
  action: string;
  keys: string[];
  isEditing?: boolean;
}

const KeyboardSettings = () => {
  // Get settings from the store
  const { 
    settings, 
    isLoading, 
    error, 
    setKeyboardSetting,
    initSettings 
  } = useSettingsStore();
  
  // Extract keyboard settings for easier access
  const { shortcuts, categories: categoryMap } = settings.keyboard;
  
  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('global');
  const { shortcuts: globalShortcuts } = useKeyboardShortcuts();
  
  // Initialize settings on component mount
  useEffect(() => {
    initSettings();
  }, [initSettings]);
  
  // Convert the settings data structure to the UI data structure
  const categories: ShortcutCategory[] = [
    {
      id: 'global',
      name: 'Global',
      shortcuts: [
        { id: 'toggle-theme', action: 'Toggle Theme', keys: ['Cmd', '/'] },
      ]
    },
    {
      id: 'general',
      name: 'General',
      shortcuts: [
        { id: 'settings', action: 'Open Settings', keys: ['Cmd', ','] },
        { id: 'search', action: 'Global Search', keys: ['Cmd', 'K'] },
        { id: 'new-note', action: 'New Note', keys: ['Cmd', 'N'] },
      ]
    },
    {
      id: 'navigation',
      name: 'Navigation',
      shortcuts: [
        { id: 'back', action: 'Go Back', keys: ['Cmd', '['] },
        { id: 'forward', action: 'Go Forward', keys: ['Cmd', ']'] },
        { id: 'focus-sidebar', action: 'Focus Sidebar', keys: ['Cmd', 'Shift', 'S'] },
      ]
    },
    {
      id: 'editing',
      name: 'Editing',
      shortcuts: [
        { id: 'bold', action: 'Bold Text', keys: ['Cmd', 'B'] },
        { id: 'italic', action: 'Italic Text', keys: ['Cmd', 'I'] },
        { id: 'link', action: 'Insert Link', keys: ['Cmd', 'K'] },
      ]
    }
  ];
  
  // Handle settings update
  const handleKeyboardSettingChange = (categoryId: string, shortcutId: string, keys: string[]) => {
    // Update the shortcuts in the settings store
    const newShortcuts = { ...shortcuts };
    newShortcuts[shortcutId] = {
      ...newShortcuts[shortcutId], // Preserve existing properties
      keys // Update keys
    };
    
    setKeyboardSetting('shortcuts', newShortcuts);
    toast.success(`Shortcut updated successfully`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-accent-brand" />
        <span className="ml-2 text-text-muted">Loading keyboard settings...</span>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-md">
        <h3 className="text-lg font-medium text-red-500 mb-2">Error loading settings</h3>
        <p className="text-sm text-text-muted">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-accent-brand rounded-md text-sm font-medium"
          onClick={() => initSettings()}
        >
          Retry
        </button>
      </div>
    );
  };
  
  const toggleEditMode = (categoryId: string, shortcutId: string) => {
    // This would update the local UI state for editing mode
    // In a real implementation, we would update the categories state
    // For now, we'll just show a toast
    toast.info(`Editing shortcut ${shortcutId} in category ${categoryId}`);
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    shortcuts: category.shortcuts.filter(shortcut => 
      shortcut.action.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter(category => category.shortcuts.length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Keyboard Shortcuts</h2>
        <p className="text-muted-foreground">Customize keyboard shortcuts to enhance your productivity.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          className="pl-10 bg-surface-0 border-border"
          placeholder="Search shortcuts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {searchTerm ? (
        <KeyboardSearchResults 
          categories={filteredCategories} 
          onToggleEdit={toggleEditMode}
        />
      ) : (
        <Card className="border border-border bg-surface-1 overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <div className="border-b border-border">
                <TabsList className="bg-transparent w-full justify-start rounded-none px-4 pt-2 h-auto">
                  {categories.map(category => (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-primary pb-2 px-4"
                    >
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              <div className="p-6">
                <TabsContent value="global" className="mt-0 space-y-4">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-foreground mb-4">Global Shortcuts</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      These shortcuts work anywhere in the application.
                    </p>
                    <KeyboardShortcutsDisplay showGlobal={true} />
                  </div>
                </TabsContent>
                
                {categories.filter(c => c.id !== 'global').map(category => (
                  <TabsContent key={category.id} value={category.id} className="mt-0 space-y-4">
                    <ShortcutCategory
                      name={category.name}
                      shortcuts={category.shortcuts}
                      onToggleEdit={(shortcutId) => toggleEditMode(category.id, shortcutId)}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KeyboardSettings;
