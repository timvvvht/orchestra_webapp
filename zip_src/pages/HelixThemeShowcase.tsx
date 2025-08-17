/**
 * Helix Theme Showcase Page
 * Demonstrates the new transcendent markdown styling
 */

import React, { useState } from 'react';
// import { HelixThemeDemo } from '@/components/Editor/CleanCodeMirrorEditor/HelixThemeDemo'; // Removed - migrated to Tiptap
// import { ThemeComparison } from '@/components/Editor/CleanCodeMirrorEditor/ThemeComparison'; // Removed - migrated to Tiptap
import TiptapEditor from '@/components/Editor/TiptapEditor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Layers, BookOpen } from 'lucide-react';

export function HelixThemeShowcase() {
  const [activeTab, setActiveTab] = useState('demo');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-surface-2 to-background border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-light tracking-tight text-foreground mb-4">
            Helix Markdown Theme
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A revolutionary approach to markdown styling that treats every word as interface 
            and every line as an opportunity for beauty.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border bg-surface-1">
          <div className="max-w-4xl mx-auto px-6">
            <TabsList className="h-12 bg-transparent border-0 p-0">
              <TabsTrigger 
                value="demo" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Live Demo
              </TabsTrigger>
              <TabsTrigger 
                value="comparison" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <Layers className="w-4 h-4 mr-2" />
                Theme Comparison
              </TabsTrigger>
              <TabsTrigger 
                value="guide" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Integration Guide
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="demo" className="flex-1 m-0">
          <HelixThemeDemo />
        </TabsContent>

        <TabsContent value="comparison" className="flex-1 m-0">
          <ThemeComparison />
        </TabsContent>

        <TabsContent value="guide" className="flex-1 m-0 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <h2>Quick Start</h2>
              <p>
                The Helix theme can be applied to any CodeMirror editor with just a few lines of code:
              </p>
              <pre><code>{`// 1. Import the CSS
import './styles/helix-markdown.css';

// 2. Add the class to your editor container
<div className="helix-markdown">
  <TiptapEditor content={props.value || ''} onChange={props.onChange || (() => {})} onSave={() => Promise.resolve(true)} filePath={null} isLoading={false} />
</div>

// 3. For dark mode support
<div className={\`helix-markdown \${isDark ? 'theme-dark' : ''}\`}>
  <TiptapEditor content={props.value || ''} onChange={props.onChange || (() => {})} onSave={() => Promise.resolve(true)} filePath={null} isLoading={false} />
</div>`}</code></pre>

              <h2>Design Philosophy</h2>
              <p>
                Helix represents a fundamental shift in how we think about markdown styling:
              </p>
              <ul>
                <li><strong>Typography First</strong> - Size and weight create hierarchy, not color</li>
                <li><strong>Subtle Depth</strong> - Shadows and layers instead of borders</li>
                <li><strong>Purposeful Motion</strong> - Every transition enhances understanding</li>
                <li><strong>Invisible Interface</strong> - The design disappears, leaving only content</li>
              </ul>

              <h2>Key Differences from Tokyo Night</h2>
              <table>
                <thead>
                  <tr>
                    <th>Aspect</th>
                    <th>Tokyo Night</th>
                    <th>Helix</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Color Philosophy</td>
                    <td>Vibrant, rainbow headers</td>
                    <td>Monochromatic elegance</td>
                  </tr>
                  <tr>
                    <td>Code Blocks</td>
                    <td>Traditional backgrounds</td>
                    <td>Glassmorphic cards</td>
                  </tr>
                  <tr>
                    <td>Typography</td>
                    <td>Standard sizing</td>
                    <td>Golden ratio scale</td>
                  </tr>
                  <tr>
                    <td>Interactions</td>
                    <td>Basic hover states</td>
                    <td>Smooth micro-animations</td>
                  </tr>
                </tbody>
              </table>

              <h2>Customization</h2>
              <p>
                The theme uses CSS variables for easy customization. Override any of these in your own CSS:
              </p>
              <pre><code>{`.helix-markdown {
  /* Change accent color */
  --helix-accent: 147, 51, 234; /* Purple */
  
  /* Adjust typography */
  --font-display: 'Inter', sans-serif;
  --font-text: 'Inter', sans-serif;
  
  /* Modify spacing */
  --content-width: 720px;
}`}</code></pre>

              <h2>Performance Notes</h2>
              <p>
                The Helix theme uses modern CSS features that may require consideration:
              </p>
              <ul>
                <li>Backdrop filters require GPU acceleration</li>
                <li>Smooth animations work best on 60Hz+ displays</li>
                <li>Consider reducing effects on battery-powered devices</li>
              </ul>

              <h2>Get Started</h2>
              <p>
                Ready to transform your markdown editing experience? The Helix theme is now available 
                in the Orchestra codebase. Simply import the CSS and add the class to start using it.
              </p>
              <div className="flex gap-4 mt-6">
                <Button onClick={() => setActiveTab('demo')}>
                  Try Live Demo
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('comparison')}>
                  See Comparison
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HelixThemeShowcase;