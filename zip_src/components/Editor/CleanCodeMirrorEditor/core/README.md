# CodeMirror Extension System

## Overview

This extension system provides a robust framework for creating, managing, and coordinating extensions for the CodeMirror editor. It solves several key challenges:

1. **Decoration Sorting**: Properly sorts decorations to prevent the "Ranges must be added sorted" error
2. **Extension Management**: Provides a centralized system for registering, enabling/disabling, and managing extensions
3. **Conflict Resolution**: Handles conflicts between extensions that might try to decorate the same regions
4. **Priority System**: Allows extensions to specify their priority to determine the order of execution

## Core Components

### DecorationManager

The `DecorationManager` is responsible for collecting, sorting, and merging decorations from different extensions. It ensures that decorations are properly sorted before being added to the editor.

```typescript
// Create a decoration manager
const decorationManager = new DecorationManager();

// Add decorations
decorationsManager.addDecoration({
  from: 0,
  to: 10,
  decoration: Decoration.mark({ class: 'my-decoration' }),
  priority: 10,
  source: 'my-extension'
});

// Build the decoration set
const decorationSet = decorationManager.buildDecorationSet();
```

### ExtensionManager

The `ExtensionManager` is responsible for registering, enabling/disabling, and managing extensions. It coordinates with the `DecorationManager` to handle decorations from multiple extensions.

```typescript
// Create an extension manager
const extensionManager = new ExtensionManager(decorationManager);

// Register an extension
extensionManager.registerExtension(new MyExtension());

// Enable/disable an extension
extensionManager.setExtensionEnabled('my-extension', false);

// Get all extensions
const extensions = extensionManager.getAllExtensions();

// Create CodeMirror extensions
const cmExtensions = extensionManager.createExtensions();
```

### BaseExtension

The `BaseExtension` class provides a base implementation for the `MarkdownExtension` interface with common functionality and default implementations.

```typescript
class MyExtension extends BaseExtension {
  constructor() {
    super({
      id: 'my-extension',
      name: 'My Extension',
      priority: ExtensionPriority.Normal,
      enabled: true
    });
  }

  createExtensions() {
    return [
      // CodeMirror extensions
    ];
  }
}
```

### BaseDecorationExtension

The `BaseDecorationExtension` class extends `BaseExtension` and provides common functionality for extensions that provide decorations to the editor.

```typescript
class MyDecorationExtension extends BaseDecorationExtension {
  constructor() {
    super({
      id: 'my-decoration-extension',
      name: 'My Decoration Extension',
      priority: ExtensionPriority.Normal,
      enabled: true
    });
  }

  createDecorations(view: EditorView) {
    return [
      {
        from: 0,
        to: 10,
        decoration: Decoration.mark({ class: 'my-decoration' }),
        priority: 10,
        source: this.config.id
      }
    ];
  }
}
```

## Usage

### Basic Setup

```typescript
// Create managers
const decorationManager = new DecorationManager();
const extensionManager = new ExtensionManager(decorationManager);

// Register extensions
extensionManager.registerExtension(new ActiveLineExtension());
extensionManager.registerExtension(new BasicFormattingExtension());

// Create CodeMirror editor
const state = EditorState.create({
  doc: content,
  extensions: [
    // ... other extensions ...
    
    // Add extensions from the extension manager
    ...extensionManager.createExtensions()
  ]
});

const view = new EditorView({
  state,
  parent: editorRef.current
});

// Set the view in the managers
decorationsManager.setView(view);
extensionManager.setView(view);
```

### Creating a New Extension

1. **Create a new extension class**:

```typescript
import { BaseDecorationExtension } from '../core/BaseDecorationExtension';
import { ExtensionPriority } from '../core/types';
import { SortableDecoration } from '../core/DecorationManager';

export class MyExtension extends BaseDecorationExtension {
  constructor() {
    super({
      id: 'my-extension',
      name: 'My Extension',
      priority: ExtensionPriority.Normal,
      enabled: true
    });
  }

  createDecorations(view: EditorView): SortableDecoration[] {
    // Create decorations
    return [];
  }

  createExtensions() {
    return [
      // Add the view plugin for decorations
      this.createViewPlugin(),
      
      // Add other extensions
      EditorView.theme({
        // Theme styles
      })
    ];
  }
}
```

2. **Register the extension**:

```typescript
extensionManager.registerExtension(new MyExtension());
```

## Extension Priority

Extensions can specify their priority to determine the order of execution. The priority levels are:

- `ExtensionPriority.Highest` (100)
- `ExtensionPriority.High` (75)
- `ExtensionPriority.Normal` (50)
- `ExtensionPriority.Low` (25)
- `ExtensionPriority.Lowest` (0)

Higher priority extensions are processed first.

## Decoration Priority

Decorations can also specify their priority to determine the order of application when multiple decorations overlap. Higher priority decorations take precedence.

## Utilities

The extension system includes several utility functions:

- `isLineVisible(view, line)`: Check if a line is within the visible viewport
- `getActiveLine(view)`: Get the active line number (where the cursor is)
- `isOnActiveLine(view, pos)`: Check if a position is on the active line
- `getVisibleLineRange(view)`: Get the visible line range
- `normalizeLanguageName(lang)`: Normalize a language name for syntax highlighting

## Testing

A test page is available at `/extension-test` to demonstrate the extension system in action.