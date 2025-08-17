import React from 'react';
import { ThemeSelector } from '@/components/theme/theme-selector';
import { Card } from '@/components/ui/card';

export default function ThemeSettings() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Theme Settings</h1>
      
      <Card className="p-6 max-w-md">
        <ThemeSelector />
      </Card>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Preview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 text-foreground">UI Components</h3>
            
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Buttons</p>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary">Primary</button>
                  <button className="btn-secondary">Secondary</button>
                  <button className="btn-ghost">Ghost</button>
                </div>
              </div>
              
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Inputs</p>
                <input className="input-standard w-full" placeholder="Standard input" />
              </div>
              
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Surfaces</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="surface-0 p-3 text-center rounded">0</div>
                  <div className="surface-1 p-3 text-center rounded">1</div>
                  <div className="surface-2 p-3 text-center rounded">2</div>
                  <div className="surface-3 p-3 text-center rounded">3</div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 text-foreground">Typography</h3>
            
            <div className="space-y-4">
              <div>
                <h1 className="text-foreground">Heading 1</h1>
                <h2 className="text-foreground">Heading 2</h2>
                <h3 className="text-foreground">Heading 3</h3>
                <h4 className="text-foreground">Heading 4</h4>
              </div>
              
              <div>
                <p className="mb-2 text-foreground">Regular paragraph text with <a href="#" className="text-primary">links</a> and <strong>bold text</strong>.</p>
                <p className="text-muted-foreground">Muted text for secondary information</p>
                <p className="text-muted-foreground/60">Faint text for tertiary information</p>
              </div>
              
              <div>
                <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm">Code snippet</code>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}