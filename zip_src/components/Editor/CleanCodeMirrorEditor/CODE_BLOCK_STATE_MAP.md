# Code Block Implementation State Map

## Quick Reference Paths
- **Main Editor**: `/Users/tim/Code/orchestra/src/components/Editor/CleanCodeMirrorEditor/index.tsx`
- **Current Extension**: `/Users/tim/Code/orchestra/src/components/Editor/CleanCodeMirrorEditor/extensions/code-block-ink-style.ts`
- **Theme Styles**: `/Users/tim/Code/orchestra/src/components/Editor/CleanCodeMirrorEditor/styles/tokyo-night.css`

## Current State (As of Last Attempt)

### What's Working ✅
- Markdown parsing correctly identifies `FencedCode` nodes
- Syntax highlighting inside code blocks
- Other editor features (headers, lists, inline code)
- Console logs confirm code blocks are detected

### What's Not Working ❌
- No visible background color on code blocks
- No visible borders or styling
- Copy buttons don't appear or aren't clickable
- Line decorations logged but not visually applied

### Active Implementation
Currently using: `code-block-ink-style.ts`
```typescript
// Simplified approach with single line decoration
const codeBlockLine = Decoration.line({ class: 'cm-code-block-line' });
```

### Import in index.tsx
```typescript
import { createCodeBlockStylingExtension } from './extensions/code-block-ink-style';
```

## Technical Context

### CodeMirror 6 Architecture
- **Decorations**: Used to add styling/elements to the editor
  - `Decoration.line()`: Adds classes to entire lines
  - `Decoration.mark()`: Adds classes to text ranges
  - `Decoration.widget()`: Inserts DOM elements
  - `Decoration.replace()`: Replaces content

### Markdown Configuration
```typescript
markdown({
  base: markdownLanguage,
  codeLanguages: languages,
  defaultCodeLanguage: markdownLanguage,
})
```

### Known Constraints
1. CodeMirror intercepts all clicks for cursor positioning
2. Widgets must handle events carefully to not interfere
3. Line decorations should add CSS classes but something prevents visual application
4. The editor has many other extensions that might conflict

## Debug Information

### Console Logs to Check
```javascript
// These appear when code blocks are processed:
[CodeBlock] Extension being created!
[CodeBlock] Building decorations...
[CodeBlock] Found code block node: FencedCode
[CodeBlock] Processing FencedCode from X to Y
[CodeBlock] Adding decoration to line N
```

### Test Code Block
````markdown
```javascript
console.log("test");
```
````

### Expected Visual Result
- Gray/dark background
- Rounded corners
- Subtle border
- Monospace font
- Copy button in top-right

### Actual Visual Result
- No background
- No borders
- Just monospace font from syntax highlighting

## Previous Attempts Summary

| File | Approach | Result |
|------|----------|---------|
| `code-block-enhanced.ts` | Widgets + line decorations | No backgrounds |
| `code-block-styling-simplified.ts` | Line decorations only | Worked initially, broke after modifications |
| `code-block-with-copy.ts` | CSS pseudo-elements | Not clickable |
| `code-block-final.ts` | domEventHandlers | No visual output |
| `code-block-proper.ts` | DOM injection | Clicks intercepted |
| `code-block-simple.ts` | Keyboard shortcuts | Works but poor UX |
| `code-block-obsidian-style.ts` | Widget with capture events | Nothing appears |
| `code-block-working.ts` | Line-by-line iteration | Decorations logged but not visible |
| `code-block-ink-style.ts` | Simplified single class | Current attempt |

## Key Questions

1. **Why do line decorations not apply visually?**
   - Classes might be added to wrong elements
   - CSS might be overridden
   - Decorations might be cleared by another extension

2. **How to make buttons clickable in CodeMirror 6?**
   - Need to prevent CodeMirror from handling the click
   - Widgets should work but don't in our case

3. **Is there a working reference?**
   - ink-mde does this successfully
   - Obsidian does this successfully
   - Both use CodeMirror 6

## Next Steps for New Agent

1. **Verify decoration application**
   - Inspect DOM to see if classes are actually added
   - Check if CSS is being overridden

2. **Test minimal implementation**
   - Remove all other extensions temporarily
   - Test with just code block extension

3. **Study working implementations**
   - Look at ink-mde source code
   - Check how Obsidian implements this

4. **Consider alternative approaches**
   - Use mark decorations instead of line
   - Use a different event handling strategy
   - Implement as a separate overlay

## Success Criteria

A working implementation must:
1. Show visible background on all code block lines
2. No gaps between lines
3. Rounded corners on first/last lines
4. Copy button always visible
5. Copy button is clickable
6. Maintains full editability
7. Works with existing extensions

## Additional Notes

- The editor is part of a larger application (Orchestra)
- Dark theme is active (`theme-dark` class)
- CSS variables are properly defined
- Other styling (headers, lists) works correctly
- The issue seems specific to code block decorations