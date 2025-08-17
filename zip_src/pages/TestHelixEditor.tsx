import React, { useState } from 'react';
// import { HelixEditor } from '@/components/Editor/CleanCodeMirrorEditor/HelixEditor'; // Removed - migrated to Tiptap
import TiptapEditor from '@/components/Editor/TiptapEditor';
import { useTheme } from '@/components/theme/theme-provider';

const TEST_CONTENT = `# Welcome to Helix

The new default markdown theme for Orchestra—where typography meets transcendence.

## What's Changed

We've replaced the colorful Tokyo Night theme with something more refined:

### Before (Tokyo Night)
- 🔴 Red H1 headers
- 🟡 Yellow H2 headers  
- 🟢 Green H3 headers
- 🔵 Cyan bold/italic text

### After (Helix)
- Monochromatic elegance with subtle accents
- Typography-driven hierarchy using size and weight
- Glassmorphic code blocks that float above the page
- Smooth micro-interactions on every element

## See It In Action

Notice how **bold text** and *italic text* no longer scream for attention. They simply guide your eye through the content with grace.

Links like [this one](https://example.com) and [[wiki links]] have subtle hover effects that feel natural, not forced.

\`\`\`typescript
// Code blocks now have depth and dimension
interface HelixTheme {
  philosophy: "Less is exponentially more";
  approach: "Typography as interface";
  result: "Invisible design that elevates content";
}
\`\`\`

## The Reading Experience

> "Simplicity is the ultimate sophistication."  
> — Leonardo da Vinci

Every element has been carefully considered to create a reading experience that feels effortless. The spacing breathes. The typography guides. The interactions delight without distraction.

### Try These Interactions

- [ ] Hover over headers to see the accent line
- [ ] Click on links to see the underline animation
- [ ] Notice how code blocks lift on hover
- [ ] Watch the cursor breathe as you type

## Technical Details

| Feature | Implementation |
|---------|---------------|
| Typography | Golden ratio scaling |
| Colors | CSS variables for theming |
| Animations | GPU-accelerated transforms |
| Performance | Optimized for 60fps |

---

This is markdown as it was meant to be—not just formatted text, but a *designed experience*.`;

export function TestHelixEditor() {
  const [content, setContent] = useState(TEST_CONTENT);
  const { theme } = useTheme();

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-semibold">Helix Theme Test</h1>
        <p className="text-sm text-muted-foreground">
          The new default markdown experience • {theme} mode
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <TiptapEditor
          content={content}
          onChange={setContent}
          onSave={() => Promise.resolve(true)}
          filePath={null}
          isLoading={false}
        />
      </div>
    </div>
  );
}

export default TestHelixEditor;