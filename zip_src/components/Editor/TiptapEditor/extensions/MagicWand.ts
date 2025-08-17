import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import MagicWandBubble from '../ui/MagicWandBubble';

export interface MagicWandOptions {
  element?: HTMLElement;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    magicWand: {
      /**
       * Show the magic wand bubble
       */
      showMagicWand: () => ReturnType;
      /**
       * Hide the magic wand bubble
       */
      hideMagicWand: () => ReturnType;
    };
  }
}

export const MagicWandPluginKey = new PluginKey('magicWand');

export const MagicWand = Extension.create<MagicWandOptions>({
  name: 'magicWand',

  addOptions() {
    return {
      element: undefined,
    };
  },

  addCommands() {
    return {
      showMagicWand:
        () =>
        ({ editor }) => {
          const plugin = MagicWandPluginKey.getState(editor.state);
          if (plugin) {
            plugin.show();
          }
          return true;
        },
      hideMagicWand:
        () =>
        ({ editor }) => {
          const plugin = MagicWandPluginKey.getState(editor.state);
          if (plugin) {
            plugin.hide();
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    const { element } = this.options;

    return [
      new Plugin({
        key: MagicWandPluginKey,
        view(editorView) {
          return new MagicWandView({
            editor,
            editorView,
            element,
          });
        },
      }),
    ];
  },
});

class MagicWandView {
  public editor: any;
  public editorView: EditorView;
  public element: HTMLElement;
  public root: Root | null = null;
  public isVisible = false;
  public position = { x: 0, y: 0 };

  constructor({
    editor,
    editorView,
    element,
  }: {
    editor: any;
    editorView: EditorView;
    element?: HTMLElement;
  }) {
    this.editor = editor;
    this.editorView = editorView;
    this.element = element || document.body;

    // Create bubble container
    this.createElement();
    this.setupEventListeners();
  }

  createElement() {
    const bubbleElement = document.createElement('div');
    bubbleElement.className = 'magic-wand-bubble-container';
    bubbleElement.style.position = 'absolute';
    bubbleElement.style.zIndex = '1000';
    bubbleElement.style.pointerEvents = 'none'; // Container is non-interactive
    bubbleElement.style.top = '0';
    bubbleElement.style.left = '0';
    bubbleElement.style.width = '100%';
    bubbleElement.style.height = '100%';
    
    this.element.appendChild(bubbleElement);
    this.root = createRoot(bubbleElement);
    this.render();
  }

  setupEventListeners() {
    // Listen for selection changes
    this.editorView.dom.addEventListener('mouseup', this.handleSelectionChange.bind(this));
    this.editorView.dom.addEventListener('keyup', this.handleSelectionChange.bind(this));
    
    // Listen for scroll events to update position
    window.addEventListener('scroll', this.updatePosition.bind(this), true);
    window.addEventListener('resize', this.updatePosition.bind(this));
  }

  handleSelectionChange() {
    const { selection } = this.editorView.state;
    const { from, to } = selection;
    
    // Show bubble only if there's a non-empty selection and editor is editable
    const hasSelection = from !== to;
    const isEditable = this.editor.isEditable;
    
    if (hasSelection && isEditable) {
      this.updatePosition();
      this.show();
    } else {
      this.hide();
    }
  }

  updatePosition() {
    const { selection } = this.editorView.state;
    const { from, to } = selection;
    
    if (from === to) {
      this.hide();
      return;
    }

    // Get the editor container bounds
    const editorRect = this.editorView.dom.getBoundingClientRect();
    
    // Get the coordinates of the selection for vertical positioning
    const start = this.editorView.coordsAtPos(from);
    const end = this.editorView.coordsAtPos(to);
    
    // Position like Google Docs: at the right edge of the editor, aligned with selection
    const x = editorRect.right - 60; // 60px from the right edge of editor
    const y = Math.min(start.top, end.top); // Aligned with top of selection
    
    this.position = { x, y };
    this.render();
  }

  show() {
    if (!this.isVisible) {
      this.isVisible = true;
      this.render();
    }
  }

  hide() {
    if (this.isVisible) {
      this.isVisible = false;
      this.render();
    }
  }

  render() {
    if (!this.root) return;

    const bubbleProps = {
      editor: this.editor,
      isVisible: this.isVisible,
      position: this.position,
      onClose: () => this.hide(),
    };

    this.root.render(React.createElement(MagicWandBubble, bubbleProps));
  }

  destroy() {
    // Clean up event listeners
    this.editorView.dom.removeEventListener('mouseup', this.handleSelectionChange.bind(this));
    this.editorView.dom.removeEventListener('keyup', this.handleSelectionChange.bind(this));
    window.removeEventListener('scroll', this.updatePosition.bind(this), true);
    window.removeEventListener('resize', this.updatePosition.bind(this));

    // Clean up React root
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    // Remove DOM element
    const bubbleContainer = this.element.querySelector('.magic-wand-bubble-container');
    if (bubbleContainer) {
      this.element.removeChild(bubbleContainer);
    }
  }
}

export default MagicWand;