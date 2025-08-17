# Code Block Implementation Help Request

## Current State Summary

### Objective
Implement code blocks in a CodeMirror 6 markdown editor with:
1. Visible background color (continuous, no gaps between lines)
2. Rounded corners and subtle borders
3. Always-visible copy button that can be clicked
4. Syntax highlighting (already working)
5. Full editability maintained

### Environment
- **Editor**: CodeMirror 6
- **Language**: TypeScript/React
- **Markdown Parser**: @codemirror/lang-markdown
- **Reference Implementation**: ink-mde (successfully implements code blocks with CM6)
- **Inspiration**: Obsidian's code block implementation (also CM6-based)

### Current Issues
1. **Background colors not showing** despite multiple implementation attempts
2. **Copy buttons either don't appear or can't be clicked** due to CodeMirror intercepting clicks
3. **Line decorations are being found but not visually applied**

### What We Know Works
- Syntax tree correctly identifies `FencedCode` nodes
- Console logs confirm code blocks are being detected
- Syntax highlighting within code blocks is functional
- Other decorations (headers, lists) work correctly

### What We've Tried

#### Attempt 1: Enhanced Widget System (`code-block-enhanced.ts`)
- Used widgets for copy button
- Line decorations for styling
- **Result**: No background colors appeared

#### Attempt 2: Simplified Line Decorations (`code-block-styling-simplified.ts`)
- Based on ink-mde approach
- Line decorations only
- **Result**: Backgrounds worked initially, then stopped after adding widgets

#### Attempt 3: CSS Pseudo-elements (`code-block-with-copy.ts`)
- Used ::before/::after for copy button
- Click detection in specific areas
- **Result**: Pseudo-elements not clickable

#### Attempt 4: DOM Event Handlers (`code-block-final.ts`)
- Used CodeMirror's domEventHandlers
- **Result**: Events intercepted but decorations not visible

#### Attempt 5: Direct DOM Injection (`code-block-proper.ts`)
- Injected real button elements
- **Result**: CodeMirror intercepts all clicks

#### Attempt 6: Keyboard Shortcuts (`code-block-simple.ts`)
- Cmd+Shift+C to copy
- **Result**: Works but not the desired UX

#### Attempt 7: Obsidian-style Widgets (`code-block-obsidian-style.ts`)
- Widgets with capture phase events
- **Result**: No visual output at all

#### Current Attempt: Ink-style Simplified (`code-block-ink-style.ts`)
- Single line decoration class
- CSS pseudo-selectors for styling
- **Result**: Still testing

### Key Technical Challenges

1. **Line Decoration Application**: Despite logs showing decorations being added, they don't appear visually
2. **Click Handling**: CodeMirror intercepts all clicks in the editor area for cursor positioning
3. **Widget Positioning**: Widgets either don't appear or interfere with editing
4. **CSS Class Application**: Classes might not be applied to the correct DOM elements

### File Structure
```
/Users/tim/Code/orchestra/src/components/Editor/CleanCodeMirrorEditor/
├── extensions/
│   ├── code-block-enhanced.ts (attempt 1)
│   ├── code-block-styling-simplified.ts (attempt 2)
│   ├── code-block-with-copy.ts (attempt 3)
│   ├── code-block-final.ts (attempt 4)
│   ├── code-block-proper.ts (attempt 5)
│   ├── code-block-simple.ts (attempt 6)
│   ├── code-block-obsidian-style.ts (attempt 7)
│   └── code-block-ink-style.ts (current)
├── styles/
│   └── tokyo-night.css (theme styles)
└── index.tsx (main editor component)
```

### Console Output Example
```
[CodeBlock] Extension being created!
[CodeBlock] Building decorations...
[CodeBlock] Found code block node: FencedCode
[CodeBlock] All node types found: [Document, FencedCode, CodeBlock, ...]
[CodeBlock] Total code blocks found: 1
[CodeBlock] Processing visible range: 0 to 500
[CodeBlock] Adding decoration to line 1
```

### Questions for Investigation

1. **Why aren't line decorations being visually applied?** The logs show they're being added but no visual changes occur.

2. **How does Obsidian handle clickable copy buttons?** They work in Obsidian which also uses CodeMirror 6.

3. **Is there a conflict with other extensions?** The editor has many other extensions that might interfere.

4. **Are we using the correct decoration type?** Should we use mark decorations instead of line decorations?

5. **Is the CSS being applied correctly?** The classes might be added to unexpected DOM elements.

### Desired Solution

A working implementation that:
1. Shows code blocks with visible backgrounds (like the original `code-block-styling-simplified.ts`)
2. Has always-visible, clickable copy buttons (like Obsidian)
3. Maintains full editability
4. Works reliably with the existing editor setup

### Resources
- [CodeMirror 6 Decoration Examples](https://codemirror.net/examples/decoration/)
- [ink-mde repository](https://github.com/davidmyersdev/ink-mde) - reference implementation
- Current editor setup uses standard CodeMirror 6 packages

### Request
Please help implement a working code block extension that achieves the desired functionality. The key challenge is making both the visual styling AND the interactive copy button work together in CodeMirror 6's architecture.