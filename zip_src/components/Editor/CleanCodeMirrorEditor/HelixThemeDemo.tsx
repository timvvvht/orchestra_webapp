/**
 * Helix Theme Demo
 * Showcases the transcendent markdown styling system
 */

import React, { useState } from 'react';
import { HelixEditor } from './HelixEditor';
import { useTheme } from '@/components/theme/theme-provider';

const DEMO_CONTENT = `# The Helix Markdown Experience

Welcome to a new paradigm in markdown editing—where every character breathes with purpose and every line flows with intention.

## Design Philosophy

The Helix theme embodies three core principles:

1. **Clarity through Restraint** — Less is exponentially more
2. **Motion with Meaning** — Every transition tells a story  
3. **Depth without Decoration** — Subtle layers create dimension

### Typography as Interface

Notice how headers don't scream for attention. They command it through *proportion* and **weight**, creating a natural reading rhythm that guides your eye down the page.

## Interactive Elements

Links become [portals to possibility](https://example.com), while [[wiki links]] feel like gentle suggestions rather than demands.

\`Inline code\` sits comfortably within text, neither hiding nor shouting, while code blocks float like cards in space:

\`\`\`typescript
// A function that captures the essence of simplicity
function createBeauty(intention: string): Experience {
  return {
    visual: 'transcendent',
    interaction: 'effortless',
    emotion: 'delight'
  };
}
\`\`\`

## Lists with Purpose

- First-level thoughts flow naturally
  - Nested ideas indent with grace
    - Third-level details whisper softly
- Back to primary concepts

### Task Management

- [ ] Design with intention
- [x] Remove the unnecessary
- [ ] Polish until it gleams
- [x] Ship with confidence

## Quotes that Inspire

> "Simplicity is the ultimate sophistication."  
> — Leonardo da Vinci

The best interfaces disappear, leaving only the content and the reader in perfect harmony.

## Data with Dignity

| Element | Purpose | Impact |
|---------|---------|--------|
| Headers | Hierarchy | Structure |
| Emphasis | Attention | Focus |
| Code | Precision | Clarity |
| Links | Connection | Flow |

---

## The Reading Experience

Notice how your eye moves through this document. The spacing breathes. The typography guides. The interactions delight without distraction.

This is markdown as it was meant to be—not just formatted text, but a *designed experience* that respects both the writer and the reader.

### Final Thoughts

When design reaches its apex, it becomes invisible. The Helix theme doesn't just style your markdown—it elevates it to an art form.

**Welcome to the future of writing.**`;

export function HelixThemeDemo() {
  const [content, setContent] = useState(DEMO_CONTENT);
  const { theme } = useTheme();
  const isDarkMode = theme.includes('dark');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface-1 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Helix Markdown Theme
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              A transcendent editing experience
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {isDarkMode ? 'Dark' : 'Light'} Mode
            </span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <div className={`h-full`}>
          <HelixEditor
            value={content}
            onChange={setContent}
            className="h-full"
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-surface-1 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>Designed for those who appreciate beauty in simplicity</span>
          <span>{content.split(/\s+/).length} words</span>
        </div>
      </div>
    </div>
  );
}

export default HelixThemeDemo;