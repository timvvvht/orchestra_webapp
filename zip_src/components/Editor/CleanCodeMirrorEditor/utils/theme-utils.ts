import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * Creates a CodeMirror theme based on the application's theme
 * Uses CSS variables from the theme system for consistent styling
 */
export function createEditorTheme(theme: string, forceDark?: boolean) {
  const isDark = forceDark !== undefined ? forceDark : theme.includes('dark');
  
  // Get CSS variables from the document root
  const getCssVar = (name: string, fallback: string): string => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  };
  
  // Define colors based on theme system CSS variables
  const colors = {
    // Use theme system variables with fallbacks
    background: getCssVar('--background-primary', isDark ? '#191919' : '#ffffff'),
    backgroundSecondary: getCssVar('--background-secondary', isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
    foreground: getCssVar('--text-normal', isDark ? '#E0E0E0' : '#333333'),
    selection: getCssVar('--text-selection', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
    cursor: getCssVar('--text-accent', isDark ? '#E0E0E0' : '#333333'),
    gutterBackground: getCssVar('--background-secondary', isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
    gutterForeground: getCssVar('--text-muted', isDark ? '#A0A0A0' : '#666666'),
    lineHighlight: getCssVar('--background-tertiary', isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
    borderColor: getCssVar('--background-modifier-border', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
    
    // Syntax highlighting colors
    comment: getCssVar('--code-comment', isDark ? '#707070' : '#999999'),
    string: getCssVar('--code-string', isDark ? '#9ece6a' : '#0a3069'),
    number: getCssVar('--code-number', isDark ? '#ff9e64' : '#953800'),
    keyword: getCssVar('--code-keyword', isDark ? '#7dcfff' : '#0550ae'),
    function: getCssVar('--code-function', isDark ? '#bb9af7' : '#6f42c1'),
    operator: getCssVar('--code-operator', isDark ? '#89ddff' : '#0550ae'),
    variable: getCssVar('--code-property', isDark ? '#73daca' : '#116329'),
    heading: getCssVar('--text-accent', isDark ? '#E0E0E0' : '#333333'),
    link: getCssVar('--text-accent', isDark ? '#E0E0E0' : '#333333'),
    
    // Markdown specific
    markdownFormatting: getCssVar('--text-faint', isDark ? '#707070' : '#999999'),
    codeBackground: getCssVar('--code-background', isDark ? 'rgba(25, 25, 25, 0.6)' : 'rgba(245, 245, 245, 0.6)'),
  };

  // Create the theme extension
  const editorTheme = EditorView.theme({
    '&': {
      backgroundColor: 'var(--background-primary)',
      color: 'var(--text-normal)',
      height: '100%',
      fontSize: 'var(--font-size-normal, 14px)',
      fontFamily: 'var(--font-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif)',
    },
    '.cm-content': {
      caretColor: 'var(--text-accent)',
      fontFamily: 'var(--font-text, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif)',
      lineHeight: 'var(--line-height, 1.6)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--text-accent)',
      borderLeftWidth: '2px',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--background-tertiary)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'var(--text-selection)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--background-secondary)',
      color: 'var(--text-muted)',
      border: 'none',
      borderRight: '1px solid var(--background-modifier-border)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--background-tertiary)',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--font-text, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif)',
    },
    '.cm-line': {
      padding: '0 4px',
    },
    // Markdown specific styling
    '.cm-header': {
      fontWeight: 'bold',
      color: 'var(--text-normal)',
    },
    '.cm-header-1': {
      fontSize: 'var(--font-size-h1, 20px)',
    },
    '.cm-header-2': {
      fontSize: 'var(--font-size-h2, 1.5em)',
    },
    '.cm-header-3': {
      fontSize: 'var(--font-size-h3, 1.3em)',
    },
    '.cm-header-4': {
      fontSize: 'var(--font-size-h4, 1.1em)',
    },
    '.cm-header-5': {
      fontSize: 'var(--font-size-h5, 1em)',
    },
    '.cm-header-6': {
      fontSize: 'var(--font-size-h6, 0.9em)',
      color: 'var(--text-muted)',
    },
    '.cm-formatting': {
      color: 'var(--text-faint)',
      opacity: '0.7',
    },
    // Hide formatting on non-active lines
    '.cm-formatting:not(.cm-activeLine .cm-formatting)': {
      display: 'none',
    },
    // Show formatting on active line
    '.cm-activeLine .cm-formatting': {
      display: 'inline',
    },
    // Code blocks
    '.cm-hmd-codeblock': {
      fontFamily: 'var(--font-monospace, "JetBrains Mono", "Fira Code", monospace)',
      fontSize: '0.9em',
      backgroundColor: 'var(--code-background)',
    },
    // Links
    '.cm-url': {
      color: 'var(--text-accent)',
      textDecoration: 'underline',
    },
    // Strong/bold text
    '.cm-strong': {
      color: 'var(--text-normal)',
      fontWeight: 'bold',
    },
    // Emphasis/italic text
    '.cm-emphasis': {
      color: 'var(--text-normal)',
      fontStyle: 'italic',
    },
    // Lists
    '.cm-list': {
      color: 'var(--text-normal)',
    },
    // Quotes
    '.cm-quote': {
      color: 'var(--text-muted)',
      fontStyle: 'italic',
      borderLeft: '3px solid var(--background-modifier-border)',
      paddingLeft: '10px',
      marginLeft: '5px',
    },
  });

  // Create syntax highlighting style using theme variables
  const highlightStyle = HighlightStyle.define([
    { tag: tags.comment, color: 'var(--code-comment)' },
    { tag: tags.string, color: 'var(--code-string)' },
    { tag: tags.number, color: 'var(--code-number)' },
    { tag: tags.keyword, color: 'var(--code-keyword)' },
    { tag: tags.function(tags.variableName), color: 'var(--code-function)' },
    { tag: tags.operator, color: 'var(--code-operator)' },
    { tag: tags.variableName, color: 'var(--code-property)' },
    { tag: tags.heading, color: 'var(--text-normal)', fontWeight: 'bold' },
    { tag: tags.link, color: 'var(--text-accent)' },
    { tag: tags.url, color: 'var(--text-accent)' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strong, fontWeight: 'bold' },
  ]);

  return [
    editorTheme,
    syntaxHighlighting(highlightStyle),
  ];
}