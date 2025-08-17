/**
 * Test page for the new InkStyleEditor
 */

import React, { useState } from 'react';
import { InkStyleEditor } from '@/components/Editor/InkStyleEditor';
import type { EditorOptions } from '@/components/Editor/InkStyleEditor/types';

const initialContent = `# The Art of Writing

Welcome to the **InkStyleEditor** — a beautiful writing experience that combines the power of markdown with the elegance of a modern word processor. This editor features *Obsidian-style live preview* where markdown syntax gracefully fades away, leaving only beautifully formatted text.

## A New Writing Experience

The philosophy behind this editor is simple: **focus on your words, not the syntax**. As you write, the markdown formatting disappears, replaced by clean, readable text. Click on any line to reveal the underlying markdown — it's still there, just hidden from view.

### Key Features

- **Live Preview**: Markdown syntax hides automatically on non-active lines
- **Elegant Typography**: Carefully chosen fonts and spacing for optimal readability  
- **Smart Formatting**: Bold, italic, and other styles apply instantly
- **Wiki-Style Links**: Create connections with [[Knowledge Base]] links
- **Beautiful Code Blocks**: Syntax-highlighted code with a clean design

## Typography in Action

Good typography is invisible — it doesn't call attention to itself, but rather serves the content. This editor uses **Inter** for body text, providing excellent readability at any size. Headers use careful sizing and spacing to create a clear hierarchy.

*Italic text* adds emphasis without disrupting the flow. **Bold text** makes important points stand out. You can even combine them for ***extra emphasis*** when needed.

### Links and References

Links are styled subtly to avoid distraction. Regular [markdown links](https://example.com) appear with a gentle underline, while [[wiki-style links]] get a distinctive pill-shaped background that makes them easy to spot.

## Code and Technical Content

When you need to include code, the editor provides beautiful syntax highlighting:

\`\`\`javascript
// A simple greeting function
function greet(name) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : 'Good evening';
  
  return \`\${greeting}, \${name}! Welcome to InkStyleEditor.\`;
}

console.log(greet('Writer'));
\`\`\`

Inline code like \`const editor = new InkStyleEditor()\` blends seamlessly with your text.

## Lists and Structure

Creating structured content is effortless:

1. **First**, write your content naturally
2. **Second**, let the editor handle the formatting
3. **Third**, enjoy the clean, professional result

Or use bullet points for unordered thoughts:

- Clean, minimal design
- Powerful markdown support
- Obsidian-style live preview
- Beautiful typography

## The Writing Flow

> "The best writing tool is the one that gets out of your way and lets you focus on your words."

This editor embodies that philosophy. Whether you're writing technical documentation, creative prose, or anything in between, it adapts to your needs while maintaining a consistent, elegant appearance.

## Try It Yourself

Click on any line above to see the markdown syntax appear. Notice how the formatting transforms — headers become normal text, links show their URLs, and styled text reveals its markers. Move to another line, and everything returns to its formatted beauty.

---

*Happy writing! May your words flow as smoothly as this editor.*`;

const TestInkStyleEditor: React.FC = () => {
  const [content, setContent] = useState(initialContent);
  const [options, setOptions] = useState<EditorOptions>({
    theme: 'tokyo-night',
    lineWrapping: true,
    vim: false,
    lineNumbers: false,
    highlightActiveLine: true,
    codeBlockStyling: true,
    inlineCodeStyling: true,
    headerStyling: true,
  });
  
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Controls */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-900 flex gap-4 items-center">
        <h1 className="text-xl font-semibold">InkStyleEditor Test</h1>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.lineNumbers}
            onChange={(e) => setOptions({ ...options, lineNumbers: e.target.checked })}
          />
          Line Numbers
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.vim}
            onChange={(e) => setOptions({ ...options, vim: e.target.checked })}
          />
          Vim Mode
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.lineWrapping}
            onChange={(e) => setOptions({ ...options, lineWrapping: e.target.checked })}
          />
          Line Wrapping
        </label>
        
        <select 
          value={options.theme} 
          onChange={(e) => setOptions({ ...options, theme: e.target.value as EditorOptions['theme'] })}
          className="px-3 py-1 border rounded"
        >
          <option value="tokyo-night">Tokyo Night</option>
          <option value="one-dark">One Dark</option>
          <option value="github-light">GitHub Light</option>
          <option value="github-dark">GitHub Dark</option>
        </select>
      </div>
      
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <InkStyleEditor
          value={content}
          onChange={setContent}
          options={options}
          placeholder="Start typing..."
          className={options.theme?.includes('dark') || options.theme === 'tokyo-night' ? 'dark' : ''}
        />
      </div>
    </div>
  );
};

export default TestInkStyleEditor;