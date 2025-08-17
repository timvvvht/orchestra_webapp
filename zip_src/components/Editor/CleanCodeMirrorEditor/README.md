# Clean CodeMirror Editor

A high-performance, clean implementation of a Markdown editor using CodeMirror 6 with Obsidian-like live preview features.

## Design Principles

1. **Performance First**: Optimized for speed and responsiveness, even with large documents
2. **Clean Architecture**: Clear separation of concerns and minimal dependencies
3. **Unified Styling Approach**: Consistent styling through CSS, avoiding redundant DOM manipulations
4. **Minimal Extensions**: Only essential extensions to avoid performance overhead
5. **React Best Practices**: Proper use of hooks and memoization

## Architecture

### Component Structure

- `index.tsx`: Main editor component with React hooks for initialization and updates
- `extensions/markdown-extensions.ts`: Unified markdown extensions for live preview features
- `utils/theme-utils.ts`: Theme utilities for consistent styling
- `styles/editor.css`: Clean CSS styling without excessive specificity or !important rules

### Key Features

1. **Live Preview**: Markdown formatting characters are hidden on non-active lines
2. **Code Block Styling**: Professional code block styling with language indicator and copy button
3. **Syntax Highlighting**: Built-in syntax highlighting for code blocks
4. **Callouts**: Support for Obsidian-like callouts with [!note] syntax
5. **Wiki Links**: Support for [[wiki links]]
6. **Task Lists**: Support for task lists with checkboxes

### Performance Optimizations

1. **Viewport-Based Rendering**: Only process visible content
2. **Memoized Extensions**: Prevent unnecessary recreation of extensions
3. **Efficient CSS**: Clean CSS without excessive specificity or !important rules
4. **Minimal DOM Manipulation**: Rely on CodeMirror's built-in mechanisms when possible
5. **No Redundant Observers**: Avoid multiple observers watching the same elements

## Usage

```jsx
<CleanCodeMirrorEditor
  content={content}
  filePath={filePath}
  isLoading={isLoading}
  onChange={handleChange}
  onSave={handleSave}
/>
```

## Comparison with Previous Implementation

1. **Reduced Complexity**: Consolidated multiple overlapping extensions into a unified approach
2. **Improved Performance**: Eliminated redundant DOM operations and observers
3. **Cleaner Styling**: Removed excessive CSS specificity and !important rules
4. **Better Maintainability**: Clear separation of concerns and minimal dependencies
5. **Reduced Bundle Size**: Fewer dependencies and smaller code footprint

## Future Improvements

1. **Multiplayer Support**: Add support for collaborative editing
2. **Custom Extensions**: Make it easier to add custom extensions
3. **Performance Monitoring**: Add built-in performance monitoring
4. **Accessibility**: Improve accessibility features
5. **Mobile Support**: Optimize for mobile devices