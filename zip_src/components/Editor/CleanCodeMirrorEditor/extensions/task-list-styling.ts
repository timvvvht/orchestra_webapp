/**
 * Task List Styling Extension for CodeMirror 6
 * 
 * This extension provides enhanced styling for task lists in Markdown,
 * similar to Obsidian's implementation with custom checkboxes and strikethrough
 * for completed items.
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder, StateField, StateEffect, Transaction } from '@codemirror/state';

// Regular expression to match task list items: - [ ] or - [x]
const TASK_LIST_REGEX = /^(\s*)([-*+]\s+\[([ xX])\]\s+)(.*)$/;

// State effect for toggling task state
export const toggleTask = StateEffect.define<{pos: number, lineText: string}>();

/**
 * Widget for rendering a custom checkbox
 */
class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked;
  }

  toDOM(): HTMLElement {
    const checkbox = document.createElement('span');
    checkbox.className = `task-checkbox ${this.checked ? 'checked' : 'unchecked'}`;
    checkbox.innerHTML = this.checked 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 12l2 2 4-4"></path></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>';
    
    checkbox.setAttribute('aria-checked', this.checked ? 'true' : 'false');
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('tabindex', '0');
    checkbox.setAttribute('data-task-checkbox', 'true');
    
    return checkbox;
  }

  ignoreEvent(): boolean {
    return false; // Allow events to be handled
  }
}

/**
 * State field to track task list items and handle toggling
 */
export const taskListField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    
    // Handle toggle task effect
    for (const effect of tr.effects) {
      if (effect.is(toggleTask)) {
        const { pos, lineText } = effect.value;
        const line = tr.state.doc.lineAt(pos);
        const match = lineText.match(TASK_LIST_REGEX);
        
        if (match) {
          const indentation = match[1];
          const prefix = match[2];
          const checked = match[3] !== ' ';
          const content = match[4];
          
          // Create the new line text with toggled checkbox state
          const newChecked = !checked;
          const newPrefix = prefix.replace(/\[([ xX])\]/, newChecked ? '[x]' : '[ ]');
          const newLineText = `${indentation}${newPrefix}${content}`;
          
          // Return a new transaction that updates the line
          const from = line.from;
          const to = line.to;
          
          // Create a new transaction to update the document
          const newTr = tr.state.update({
            changes: { from, to, insert: newLineText },
            scrollIntoView: true
          });
          
          // Apply the transaction
          if (tr.state.facet(EditorView.updateListener).length) {
            setTimeout(() => {
              const view = tr.state.facet(EditorView.updateListener)[0].view;
              view.dispatch(newTr);
            }, 0);
          }
        }
      }
    }
    
    return decorations;
  },
  provide(field) {
    return EditorView.decorations.from(field);
  }
});

/**
 * ViewPlugin that adds decorations to task list items
 */
export const taskListStylingPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();

      // Process visible lines
      for (let { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          const lineText = line.text;
          
          // Check if this line is a task list item
          const match = lineText.match(TASK_LIST_REGEX);
          if (match) {
            const indentation = match[1];
            const prefix = match[2];
            const checked = match[3] !== ' ';
            const content = match[4];
            
            // Calculate positions
            const checkboxStart = line.from + indentation.length + 2; // After the list marker (- ) and before [
            const checkboxEnd = checkboxStart + 3; // [ ] is 3 chars
            const contentStart = line.from + indentation.length + prefix.length;
            const contentEnd = line.to;
            
            // Add decoration for the checkbox
            builder.add(
              checkboxStart,
              checkboxEnd,
              Decoration.replace({
                widget: new CheckboxWidget(checked),
                inclusive: false
              })
            );
            
            // Add decoration for the content if checked
            if (checked && contentStart < contentEnd) {
              builder.add(
                contentStart,
                contentEnd,
                Decoration.mark({
                  class: 'cm-task-checked',
                  attributes: { 'data-task-state': 'checked' }
                })
              );
            }
          }
          
          pos = line.to + 1;
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
    eventHandlers: {
      click: (e, view) => {
        // Check if the click was on a checkbox
        const target = e.target as HTMLElement;
        if (target.hasAttribute('data-task-checkbox') || target.closest('[data-task-checkbox]')) {
          // Find the line that contains this checkbox
          const pos = view.posAtDOM(target);
          const line = view.state.doc.lineAt(pos);
          const lineText = line.text;
          
          // Check if this line is a task list item
          const match = lineText.match(TASK_LIST_REGEX);
          if (match) {
            // Dispatch the toggle task effect
            view.dispatch({
              effects: toggleTask.of({ pos, lineText })
            });
            return true;
          }
        }
        return false;
      }
    }
  }
);

/**
 * CSS styles for task lists
 */
export const taskListStyles = EditorView.baseTheme({
  // Task checkbox styling
  '.task-checkbox': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    marginRight: '6px',
    cursor: 'pointer',
    color: 'var(--text-normal)',
    verticalAlign: 'middle',
    position: 'relative',
    top: '-1px',
  },
  
  '.task-checkbox.checked': {
    color: 'var(--text-accent)',
  },
  
  '.task-checkbox.unchecked': {
    color: 'var(--text-muted)',
  },
  
  // Checked task styling
  '.cm-task-checked': {
    textDecoration: 'line-through',
    color: 'var(--text-muted)',
    opacity: 0.8,
  },
  
  // Hover effects
  '.task-checkbox:hover': {
    color: 'var(--text-accent)',
    opacity: 1,
  },
});

/**
 * Create the task list styling extension
 */
export function createTaskListStylingExtension() {
  return [
    taskListField,
    taskListStylingPlugin,
    taskListStyles,
  ];
}