/**
 * Code Block Styling Extension for CodeMirror 6
 * 
 * This file provides styling for code blocks in the editor,
 * working alongside the unified formatting system.
 */

import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';

/**
 * Create a code block styling extension
 */
export function createCodeBlockStylingExtension(): Extension[] {
  return [
    EditorView.baseTheme({
      // Base styling for code blocks
      '.cm-line.cm-code-block-start': {
        fontFamily: 'var(--font-monospace, monospace)',
        backgroundColor: 'var(--code-background-enhanced, rgba(0, 0, 0, 0.08))',
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        padding: '8px 16px',
        marginTop: '16px',
      },
      
      '.cm-line.cm-code-block-content': {
        fontFamily: 'var(--font-monospace, monospace)',
        backgroundColor: 'var(--code-background-enhanced, rgba(0, 0, 0, 0.08))',
        padding: '0 16px',
        whiteSpace: 'pre-wrap',
      },
      
      '.cm-line.cm-code-block-end': {
        fontFamily: 'var(--font-monospace, monospace)',
        backgroundColor: 'var(--code-background-enhanced, rgba(0, 0, 0, 0.08))',
        borderBottomLeftRadius: '6px',
        borderBottomRightRadius: '6px',
        padding: '0 16px 8px',
        marginBottom: '16px',
      },
      
      // Language indicator
      '.code-block-language': {
        position: 'absolute',
        top: '8px',
        right: '44px',
        fontSize: 'var(--font-size-smallest, 0.75em)',
        padding: '2px 8px',
        borderRadius: 'var(--border-radius, 4px)',
        backgroundColor: 'var(--interactive-accent-hover, rgba(94, 129, 172, 0.8))',
        color: 'var(--text-on-accent, white)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        opacity: '0.9',
        transition: 'opacity 0.2s ease',
        border: '1px solid var(--background-modifier-border)',
        zIndex: '10',
      },
      
      // Copy button
      '.code-block-copy-button': {
        position: 'absolute',
        top: '8px',
        right: '8px',
        width: '28px',
        height: '28px',
        padding: '4px',
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: 'var(--border-radius, 4px)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        opacity: '0.8',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '10',
      },
      
      '.code-block-copy-button:hover': {
        opacity: '1',
        backgroundColor: 'var(--background-modifier-hover)',
      },
      
      '.code-block-copy-button.copied': {
        backgroundColor: 'var(--interactive-accent)',
        color: 'var(--text-on-accent)',
      },
      
      // Add animation for copy success
      '@keyframes copy-success': {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.2)' },
        '100%': { transform: 'scale(1)' },
      },
      
      '.code-block-copy-button.copied svg': {
        animation: 'copy-success 0.3s ease-in-out',
      },
      
      // Syntax highlighting colors - based on common themes
      '.cm-hmd-codeblock .cm-keyword, .cm-code-block-content .cm-keyword': {
        color: 'var(--code-keyword, #c678dd)',
      },
      
      '.cm-hmd-codeblock .cm-operator, .cm-code-block-content .cm-operator': {
        color: 'var(--code-operator, #56b6c2)',
      },
      
      '.cm-hmd-codeblock .cm-string, .cm-code-block-content .cm-string': {
        color: 'var(--code-string, #98c379)',
      },
      
      '.cm-hmd-codeblock .cm-number, .cm-code-block-content .cm-number': {
        color: 'var(--code-value, #d19a66)',
      },
      
      '.cm-hmd-codeblock .cm-comment, .cm-code-block-content .cm-comment': {
        color: 'var(--code-comment, #7f848e)',
        fontStyle: 'italic',
      },
      
      '.cm-hmd-codeblock .cm-property, .cm-code-block-content .cm-property': {
        color: 'var(--code-property, #e06c75)',
      },
      
      '.cm-hmd-codeblock .cm-variable, .cm-code-block-content .cm-variable': {
        color: 'var(--code-normal, #abb2bf)',
      },
      
      '.cm-hmd-codeblock .cm-variable-2, .cm-code-block-content .cm-variable-2': {
        color: 'var(--code-function, #61afef)',
      },
      
      '.cm-hmd-codeblock .cm-def, .cm-code-block-content .cm-def': {
        color: 'var(--code-function, #61afef)',
      },
      
      '.cm-hmd-codeblock .cm-atom, .cm-code-block-content .cm-atom': {
        color: 'var(--code-important, #e06c75)',
      },
      
      '.cm-hmd-codeblock .cm-tag, .cm-code-block-content .cm-tag': {
        color: 'var(--code-tag, #e06c75)',
      },
      
      '.cm-hmd-codeblock .cm-attribute, .cm-code-block-content .cm-attribute': {
        color: 'var(--code-property, #d19a66)',
      },
      
      // Ensure Python comments don't get styled as headers
      '.cm-line.cm-code-block-content .cm-comment, .cm-line.cm-code-block-content .cm-comment.cm-meta': {
        fontSize: 'var(--font-size-small, 0.9em) !important',
        fontWeight: 'normal !important',
        color: 'var(--code-comment, #7f848e) !important',
        fontStyle: 'italic !important',
        fontFamily: 'var(--font-monospace, monospace) !important',
        backgroundColor: 'transparent !important',
        borderBottom: 'none !important',
        marginTop: '0 !important',
        marginBottom: '0 !important',
        paddingBottom: '0 !important',
        lineHeight: 'inherit !important',
      },
      
      // Dark theme adjustments
      '&.theme-dark .cm-line.cm-code-block-start, &.theme-dark .cm-line.cm-code-block-content, &.theme-dark .cm-line.cm-code-block-end': {
        backgroundColor: 'var(--code-background-enhanced-dark, rgba(255, 255, 255, 0.05))',
      },
    }),
  ];
}