import { Extension, Editor } from "@tiptap/core";
import {
  Plugin,
  PluginKey,
  TextSelection,
  EditorState,
} from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { createRoot, Root } from "react-dom/client";
import React from "react";
import ElixirCommandBar from "../ui/ElixirCommandBar";

export interface ElixirCommandBarOptions {
  element?: HTMLElement | undefined;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    elixirCommandBar: {
      /**
       * Show the elixir command bar
       */
      showElixirCommandBar: () => ReturnType;
      /**
       * Hide the elixir command bar
       */
      hideElixirCommandBar: () => ReturnType;
    };
  }
}

export const ElixirCommandBarPluginKey = new PluginKey("elixirCommandBar");

export const ElixirCommandBarExtension =
  Extension.create<ElixirCommandBarOptions>({
    name: "elixirCommandBar",

    addOptions() {
      return {
        element: undefined,
      };
    },

    onCreate() {
      console.log("🎯 ElixirCommandBar extension created");
    },

    addCommands() {
      return {
        showElixirCommandBar:
          () =>
          ({ editor }) => {
            const plugin = ElixirCommandBarPluginKey.getState(editor.state);
            if (plugin) {
              plugin.show();
            }
            return true;
          },
        hideElixirCommandBar:
          () =>
          ({ editor }) => {
            const plugin = ElixirCommandBarPluginKey.getState(editor.state);
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
          key: ElixirCommandBarPluginKey,
          view(editorView) {
            return new ElixirCommandBarView({
              editor,
              editorView,
              element,
            });
          },
        }),
      ];
    },
  });

class ElixirCommandBarView {
  public editor: Editor;
  public editorView: EditorView;
  public sidebarElement: HTMLElement | null = null;
  public root: Root | null = null;
  public isVisible = false;

  constructor({
    editor,
    editorView,
  }: {
    editor: Editor;
    editorView: EditorView;
    element?: HTMLElement | undefined;
  }) {
    console.log("🧪 [ElixirCommandBarView] Constructor called");
    this.editor = editor;
    this.editorView = editorView;

    // Find and use the sidebar container
    this.initializeSidebar();
  }

  initializeSidebar() {
    console.log("🧪 [ElixirCommandBarView] Initializing sidebar");

    // Find the sidebar root element
    const sidebarRoot = document.getElementById("elixir-sidebar-root");
    if (!sidebarRoot) {
      console.error(
        "🚨 [ElixirCommandBarView] Sidebar root element not found!"
      );
      return;
    }

    this.sidebarElement = sidebarRoot;
    console.log(
      "🧪 [ElixirCommandBarView] Sidebar element found and connected"
    );

    this.root = createRoot(sidebarRoot);
    this.render();
  }

  /** Called by ProseMirror on every state change */
  update(view: EditorView, prevState: EditorState) {
    // Only act when the selection really changed
    if (view.state.selection.eq(prevState.selection)) return;

    const sel = view.state.selection;
    const hasSelection = !sel.empty && sel instanceof TextSelection;
    const isEditable = this.editor.isEditable;

    console.log("🧪 [ElixirCommandBarView] Selection update:", {
      hasSelection,
      isEditable,
      from: sel.from,
      to: sel.to,
      selectionType: sel.constructor.name,
    });

    if (hasSelection && isEditable) {
      this.show();
    } else {
      this.hide();
    }
  }

  show() {
    if (!this.isVisible) {
      console.log("🧪 [ElixirCommandBarView] Showing sidebar command bar");
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
    if (!this.root) {
      console.log("🧪 [ElixirCommandBarView] No root element for rendering");
      return;
    }

    const commandBarProps = {
      editor: this.editor,
      isVisible: this.isVisible,
      onClose: () => this.hide(),
    };

    console.log(
      "🧪 [ElixirCommandBarView] Rendering with props:",
      commandBarProps
    );
    this.root.render(React.createElement(ElixirCommandBar, commandBarProps));
  }

  destroy() {
    // Clean up React root
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    // Note: We don't remove the sidebar element since it's part of the editor's DOM structure
    this.sidebarElement = null;
  }
}

export default ElixirCommandBarExtension;
