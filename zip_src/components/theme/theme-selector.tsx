import React from 'react';
import { useTheme } from './theme-provider';
import { Button } from '@/components/ui/button';

export function ThemeSelector() {
  const { theme, setTheme, availableThemes } = useTheme();
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Theme</h3>
        <div className="grid grid-cols-2 gap-2">
          {availableThemes.map((t) => (
            <Button 
              key={t.id}
              variant={theme === t.id ? 'default' : 'outline'}
              onClick={() => setTheme(t.id)}
              size="sm"
            >
              {t.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Debug button */}
      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          onClick={() => {
            console.log('Current theme:', theme);
            console.log('HTML data-theme attribute:', document.documentElement.dataset.theme);
            console.log('Available themes:', availableThemes);
          }}
          size="sm"
          variant="outline"
          className="w-full"
        >
          Debug Theme
        </Button>
      </div>
    </div>
  );
}