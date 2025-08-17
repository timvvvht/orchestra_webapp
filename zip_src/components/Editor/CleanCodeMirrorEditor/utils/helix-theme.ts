/**
 * Helix Theme for CodeMirror
 * A transcendent markdown editing experience
 */

import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Create the Helix theme
export function createHelixTheme(isDark: boolean = false): Extension[] {
  // Base theme styles using CSS variables
  const helixTheme = EditorView.theme({
    // Editor root
    '&': {
      fontSize: '17px',
      fontFamily: 'var(--font-text)',
    },
    
    // Content area
    '.cm-content': {
      padding: '48px 0',
      maxWidth: '720px',
      margin: '0 auto',
      fontFamily: 'inherit',
      lineHeight: '1.75',
    },
    
    // Lines
    '.cm-line': {
      padding: '3px 0',
      transition: 'all 0.2s cubic-bezier(0.19, 1, 0.22, 1)',
    },
    
    // Headers with elegant hierarchy
    '.cm-header': {
      fontFamily: 'var(--font-display)',
      fontWeight: '600',
      color: 'var(--text-primary)',
      position: 'relative',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    },
    
    '.cm-header-1': {
      fontSize: '20px',
      lineHeight: '1.1',
      letterSpacing: '-0.03em',
      fontWeight: '700',
      marginTop: '2em',
      marginBottom: '0.5em',
    },
    
    '.cm-header-2': {
      fontSize: '18px',
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
      fontWeight: '600',
      marginTop: '1.8em',
      marginBottom: '0.4em',
    },
    
    '.cm-header-3': {
      fontSize: '16px',
      lineHeight: '1.3',
      letterSpacing: '-0.01em',
      fontWeight: '600',
      marginTop: '1.6em',
      marginBottom: '0.3em',
    },
    
    '.cm-header-4': {
      fontSize: '1.3em',
      lineHeight: '1.4',
      fontWeight: '500',
      marginTop: '1.4em',
      marginBottom: '0.2em',
    },
    
    '.cm-header-5, .cm-header-6': {
      fontSize: '1.1em',
      lineHeight: '1.5',
      fontWeight: '500',
      marginTop: '1.2em',
      marginBottom: '0.1em',
      color: 'var(--text-secondary)',
    },
    
    // Text emphasis
    '.cm-strong': {
      fontWeight: '600',
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em',
    },
    
    '.cm-emphasis': {
      fontStyle: 'italic',
      color: 'var(--text-secondary)',
      letterSpacing: '0.01em',
    },
    
    '.cm-strong.cm-emphasis': {
      fontWeight: '600',
      fontStyle: 'italic',
      color: 'var(--interactive-primary)',
    },
    
    // Links
    '.cm-url, .cm-link': {
      color: 'var(--interactive-primary)',
      textDecoration: 'none',
      position: 'relative',
      fontWeight: '500',
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    },
    
    // Wiki links
    '.cm-wiki-link': {
      color: 'var(--interactive-primary)',
      background: 'var(--interactive-ghost)',
      padding: '2px 6px',
      borderRadius: '4px',
      fontWeight: '500',
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      textDecoration: 'none',
    },
    
    // Inline code
    '.cm-inline-code': {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.85em',
      fontWeight: '500',
      padding: '3px 8px',
      borderRadius: '6px',
      background: 'rgba(var(--helix-mist), 0.5)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(var(--helix-smoke), 0.3)',
      color: 'var(--text-primary)',
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      position: 'relative',
      top: '-1px',
    },
    
    // Code blocks
    '.cm-code-block-start, .cm-code-block-content, .cm-code-block-end': {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.9em',
      lineHeight: '1.6',
      background: `linear-gradient(
        135deg,
        rgba(var(--helix-mist), 0.8),
        rgba(var(--helix-paper), 0.9)
      )`,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(var(--helix-smoke), 0.2)',
    },
    
    // Lists
    '.cm-list': {
      color: 'var(--text-primary)',
    },
    
    '.cm-formatting-list': {
      color: 'var(--interactive-primary)',
      fontWeight: '600',
      marginRight: '0.5em',
    },
    
    // Blockquotes
    '.cm-quote': {
      borderLeft: '3px solid var(--interactive-primary)',
      paddingLeft: '1.5em',
      margin: '1.5em 0',
      color: 'var(--text-secondary)',
      fontStyle: 'italic',
      position: 'relative',
      background: `linear-gradient(
        to right,
        var(--interactive-ghost),
        transparent
      )`,
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    },
    
    // Selection
    '.cm-selectionBackground': {
      background: 'rgba(var(--helix-accent), 0.2) !important',
    },
    
    // Cursor
    '.cm-cursor': {
      borderLeft: '2px solid var(--interactive-primary)',
      animation: 'helix-breathe 1s ease-in-out infinite',
    },
    
    // Active line
    '.cm-activeLine': {
      background: `linear-gradient(
        to right,
        transparent,
        rgba(var(--helix-mist), 0.3),
        transparent
      )`,
      transition: 'background 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    },
    
    // Formatting characters
    '.cm-formatting': {
      color: 'var(--text-ghost)',
      fontSize: '0.8em',
      opacity: '0',
      transition: 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    },
    
    '.cm-line.cm-activeLine .cm-formatting': {
      opacity: '0.5',
    },
    
    '.cm-formatting-header': {
      display: 'none !important',
    },
    
    // Gutters
    '.cm-gutters': {
      background: 'transparent',
      border: 'none',
      color: 'var(--text-ghost)',
    },
    
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 16px 0 8px',
      fontSize: '0.85em',
      fontFamily: 'var(--font-mono)',
    },
    
    // Focus state
    '&.cm-focused': {
      outline: 'none',
    },
    
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--interactive-primary)',
    },
    
    // Scrollbar
    '&::-webkit-scrollbar': {
      width: '12px',
    },
    
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    
    '&::-webkit-scrollbar-thumb': {
      background: 'rgba(var(--helix-steel), 0.3)',
      borderRadius: '6px',
      border: '3px solid transparent',
      backgroundClip: 'content-box',
    },
    
    '&::-webkit-scrollbar-thumb:hover': {
      background: 'rgba(var(--helix-steel), 0.5)',
      backgroundClip: 'content-box',
    },
  }, { dark: isDark });

  // Syntax highlighting styles
  const helixHighlightStyle = HighlightStyle.define([
    // Comments
    { tag: t.comment, color: 'var(--text-tertiary)', fontStyle: 'italic' },
    
    // Strings
    { tag: t.string, color: 'var(--text-secondary)' },
    { tag: t.special(t.string), color: 'var(--interactive-primary)' },
    
    // Keywords
    { tag: t.keyword, color: 'var(--interactive-primary)', fontWeight: '500' },
    { tag: t.controlKeyword, color: 'var(--interactive-primary)', fontWeight: '600' },
    
    // Types
    { tag: t.typeName, color: 'var(--text-primary)', fontWeight: '500' },
    { tag: t.className, color: 'var(--text-primary)', fontWeight: '600' },
    
    // Functions
    { tag: t.function(t.variableName), color: 'var(--text-primary)', fontWeight: '500' },
    { tag: t.function(t.propertyName), color: 'var(--text-primary)', fontWeight: '500' },
    
    // Variables
    { tag: t.variableName, color: 'var(--text-primary)' },
    { tag: t.propertyName, color: 'var(--text-secondary)' },
    
    // Numbers
    { tag: t.number, color: 'var(--text-secondary)' },
    { tag: t.bool, color: 'var(--interactive-primary)', fontWeight: '500' },
    
    // Operators
    { tag: t.operator, color: 'var(--text-tertiary)' },
    { tag: t.punctuation, color: 'var(--text-tertiary)' },
    
    // Tags (HTML/XML)
    { tag: t.tagName, color: 'var(--interactive-primary)', fontWeight: '500' },
    { tag: t.attributeName, color: 'var(--text-secondary)' },
    
    // Headings
    { tag: t.heading1, fontSize: '20px', fontWeight: '700' },
    { tag: t.heading2, fontSize: '18px', fontWeight: '600' },
    { tag: t.heading3, fontSize: '16px', fontWeight: '600' },
    { tag: t.heading4, fontSize: '15px', fontWeight: '500' },
    { tag: t.heading5, fontSize: '14px', fontWeight: '500' },
    { tag: t.heading6, fontSize: '13px', fontWeight: '500' },
    
    // Markdown
    { tag: t.link, color: 'var(--interactive-primary)', fontWeight: '500' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strong, fontWeight: '600' },
    { tag: t.monospace, fontFamily: 'var(--font-mono)', fontSize: '0.85em' },
  ]);

  return [
    helixTheme,
    syntaxHighlighting(helixHighlightStyle),
  ];
}

// Helper to add the helix-markdown class to the editor
export function helixEditorClass(): Extension {
  return EditorView.editorAttributes.of({
    class: 'helix-markdown',
  });
}

// Complete Helix theme package
export function helixTheme(isDark: boolean = false): Extension[] {
  return [
    ...createHelixTheme(isDark),
    helixEditorClass(),
  ];
}