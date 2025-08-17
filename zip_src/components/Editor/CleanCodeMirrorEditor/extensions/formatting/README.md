# Markdown Formatting Extensions

## Overview

This directory contains a modular system for Markdown syntax highlighting and live preview features. The implementation is inspired by Zettlr's approach to CodeMirror 6 integration.

## Structure

- `index.ts`: Main coordinator for all formatting extensions
- `base-renderer.ts`: Base utilities for creating renderers
- `range-in-selection.ts`: Utility to check if a range is in selection
- `renderers/`: Directory containing individual renderers
  - `render-headings.ts`: Heading-specific renderer
  - `render-emphasis.ts`: Bold/italic renderer
  - `render-code.ts`: Inline and block code renderer
  - (Additional renderers as needed)

## Key Concepts

1. **Modular Renderer Architecture**
   - Separate renderers for different Markdown elements
   - A main coordinator that combines all renderers

2. **Selection-Aware Formatting**
   - Uses the `rangeInSelection` utility to determine when to show/hide formatting
   - Shows formatting characters when the cursor is inside them

3. **Decoration-Based Approach**
   - Uses CodeMirror decorations to hide or replace formatting characters

4. **CSS-Based Styling**
   - Styling is defined in `/styles/formatting.css`

## Usage

```typescript
import { createFormattingExtension } from './extensions/formatting';

// Create the extension with default options
const extension = createFormattingExtension();

// Or with specific options
const extension = createFormattingExtension({
  renderHeadings: true,
  renderEmphasis: true,
  renderCode: true
});
```

## Behavior

- Header markers (e.g., `###`) are always hidden, showing only the styled header text
- Other inline formatting markers (e.g., `**` for bold, `*` for italic) are visible on the active line but hidden on inactive lines
- Content is always styled appropriately