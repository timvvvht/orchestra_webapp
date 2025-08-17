/**
 * Simplified extension system based on ink-mde's approach
 * Uses Compartments for dynamic configuration
 */

import { Compartment, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// Create compartments for features that can be toggled
export const compartments = {
  codeBlocks: new Compartment(),
  inlineCode: new Compartment(),
  taskLists: new Compartment(),
  tables: new Compartment(),
  mermaid: new Compartment(),
  vim: new Compartment(),
  spellcheck: new Compartment(),
  lineWrapping: new Compartment(),
};

// Simple extension creators
export const extensions = {
  codeBlocks: async () => {
    const { createCodeBlockStylingExtension } = await import('./code-block-styling-simplified');
    return createCodeBlockStylingExtension();
  },
  
  inlineCode: async () => {
    const { createInlineCodeStylingExtension } = await import('./inline-code-styling');
    return createInlineCodeStylingExtension();
  },
  
  taskLists: async () => {
    const { createTaskListStylingExtension } = await import('./task-list-styling');
    return createTaskListStylingExtension();
  },
  
  tables: async () => {
    const { createEnhancedTableExtension } = await import('./enhanced-table');
    return createEnhancedTableExtension();
  },
  
  mermaid: async () => {
    const { createMermaidDiagramExtension } = await import('./mermaid-diagram');
    return createMermaidDiagramExtension();
  },
  
  vim: async () => {
    const { vim } = await import('@codemirror/vim');
    return vim();
  },
  
  spellcheck: () => {
    return EditorView.contentAttributes.of({ spellcheck: 'true' });
  },
  
  lineWrapping: () => {
    return EditorView.lineWrapping;
  },
};

// Create initial extensions based on options
export async function createInitialExtensions(options: {
  codeBlocks?: boolean;
  inlineCode?: boolean;
  taskLists?: boolean;
  tables?: boolean;
  mermaid?: boolean;
  vim?: boolean;
  spellcheck?: boolean;
  lineWrapping?: boolean;
} = {}): Promise<Extension[]> {
  const result: Extension[] = [];
  
  // Add compartments with initial values
  result.push(compartments.codeBlocks.of(
    options.codeBlocks !== false ? await extensions.codeBlocks() : []
  ));
  
  result.push(compartments.inlineCode.of(
    options.inlineCode !== false ? await extensions.inlineCode() : []
  ));
  
  result.push(compartments.taskLists.of(
    options.taskLists ? await extensions.taskLists() : []
  ));
  
  result.push(compartments.tables.of(
    options.tables ? await extensions.tables() : []
  ));
  
  result.push(compartments.mermaid.of(
    options.mermaid ? await extensions.mermaid() : []
  ));
  
  result.push(compartments.vim.of(
    options.vim ? await extensions.vim() : []
  ));
  
  result.push(compartments.spellcheck.of(
    options.spellcheck ? extensions.spellcheck() : []
  ));
  
  result.push(compartments.lineWrapping.of(
    options.lineWrapping ? extensions.lineWrapping() : []
  ));
  
  return result;
}

// Helper to toggle features at runtime
export async function toggleFeature(
  view: EditorView, 
  feature: keyof typeof compartments, 
  enabled: boolean
) {
  const compartment = compartments[feature];
  const extension = enabled ? await extensions[feature]() : [];
  
  view.dispatch({
    effects: compartment.reconfigure(extension)
  });
}