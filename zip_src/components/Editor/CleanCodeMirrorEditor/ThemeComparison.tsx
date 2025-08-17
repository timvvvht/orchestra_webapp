/**
 * Theme Comparison Component
 * Side-by-side comparison of Tokyo Night vs Helix themes
 */

import React, { useState } from 'react';
import CleanCodeMirrorEditor from './index';
import { HelixEditor } from './HelixEditor';
import { useTheme } from '@/components/theme/theme-provider';

const SAMPLE_CONTENT = `# Markdown Theme Comparison

## Visual Hierarchy

This document demonstrates the different approaches to markdown styling. Notice how each theme creates its own unique reading experience.

### Typography and Color

The way we present text affects how it's perceived. **Bold text** draws attention, while *italic text* adds emphasis. Some themes use \`inline code\` as a design element.

### Links and Interactions

External links like [GitHub](https://github.com) and [[wiki links]] can be styled to match the overall aesthetic.

## Code Presentation

\`\`\`javascript
// How code blocks appear can dramatically affect readability
function demonstrateTheme(theme) {
  return {
    name: theme.name,
    philosophy: theme.core_principle,
    impact: theme.visual_impact
  };
}
\`\`\`

## Lists and Structure

1. Ordered lists provide sequence
2. Each item has its place
3. Hierarchy matters

- Unordered lists show relationships
  - Nested items create depth
  - Visual weight guides the eye

## Quotes and Callouts

> "Design is not just what it looks like and feels like. Design is how it works."
> — Steve Jobs

The best themes enhance content without overwhelming it.`;

export function ThemeComparison() {
  const [content] = useState(SAMPLE_CONTENT);
  const { theme } = useTheme();
  const isDarkMode = theme.includes('dark');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface-1 px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground text-center">
          Tokyo Night vs Helix: A Study in Contrast
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Two philosophies of markdown styling
        </p>
      </div>

      {/* Split View */}
      <div className="flex-1 flex divide-x divide-border overflow-hidden">
        {/* Tokyo Night */}
        <div className="flex-1 flex flex-col">
          <div className="bg-surface-2 px-4 py-2 border-b border-border">
            <h2 className="font-medium text-foreground">Tokyo Night</h2>
            <p className="text-xs text-muted-foreground">Vibrant syntax highlighting</p>
          </div>
          <div className={`flex-1 overflow-auto ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
            <CleanCodeMirrorEditor
              value={content}
              onChange={() => {}}
              readOnly={true}
              className="h-full"
            />
          </div>
        </div>

        {/* Helix */}
        <div className="flex-1 flex flex-col">
          <div className="bg-surface-2 px-4 py-2 border-b border-border">
            <h2 className="font-medium text-foreground">Helix</h2>
            <p className="text-xs text-muted-foreground">Transcendent minimalism</p>
          </div>
          <div className="flex-1 overflow-auto">
            <HelixEditor
              value={content}
              onChange={() => {}}
              readOnly={true}
              className="h-full"
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>

      {/* Comparison Points */}
      <div className="border-t border-border bg-surface-1 px-6 py-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 gap-8 text-sm">
          <div>
            <h3 className="font-medium text-foreground mb-2">Tokyo Night Characteristics</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Rainbow header colors (H1=Red, H2=Yellow, etc.)</li>
              <li>• High contrast syntax highlighting</li>
              <li>• Traditional code block styling</li>
              <li>• Vibrant, playful aesthetic</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-2">Helix Characteristics</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Monochromatic with strategic accents</li>
              <li>• Typography-driven hierarchy</li>
              <li>• Glassmorphic code blocks</li>
              <li>• Refined, professional aesthetic</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemeComparison;