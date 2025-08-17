import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * Creates a Tokyo Night theme for CodeMirror that uses CSS variables
 * This allows the theme to integrate with the Obsidian-style CSS system
 */
export function createTokyoNightTheme(isDark: boolean = true) {
  // Create the theme extension using CSS variables instead of hardcoded colors
  const tokyoNightTheme = EditorView.theme({
    '&': {
      backgroundColor: 'transparent', // Let CSS handle background
      color: 'var(--text-normal)', // Use CSS variable
    },
    
    '.cm-content': {
      caretColor: 'var(--text-accent)', // Use CSS variable
      /* Use global font instead of custom font */
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--text-accent)', // Use CSS variable
      borderLeftWidth: '2px',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--background-modifier-hover)', // Use CSS variable
    },
    '.cm-selectionMatch': {
      backgroundColor: 'var(--text-selection)', // Use CSS variable
    },
    '.cm-selectionBackground': {
      backgroundColor: 'var(--text-selection) !important', // Use CSS variable
    },
    '.cm-gutters': {
      backgroundColor: 'var(--background-secondary)', // Use CSS variable
      color: 'var(--text-muted)', // Use CSS variable
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--background-modifier-hover)', // Use CSS variable
    },
    '.cm-lineNumbers': { 
      color: 'var(--text-muted)', // Use CSS variable
    },
    '.cm-foldPlaceholder': { 
      backgroundColor: 'var(--background-modifier-hover)', // Use CSS variable
      color: 'var(--text-normal)', // Use CSS variable
    },
    
    // 🎨 Chat-Style Markdown Headers - Exact Typography Match
    '.cm-header': {
      fontWeight: 'bold',
      position: 'relative',
    },
    '.cm-header-1': {
      fontSize: '1.5rem',           // text-[1.5rem]
      fontWeight: '600',            // font-semibold
      letterSpacing: '-0.021em',    // tracking-[-0.021em]
      color: 'var(--h1-color)',
      textShadow: 'var(--h1-shadow, none)', // Pianissimo depth effect
      marginTop: '2rem',            // mt-8 (8 * 0.25rem)
      marginBottom: '1rem',         // mb-4 (4 * 0.25rem)
    },
    '.cm-header-2': {
      fontSize: '1.25rem',          // text-[1.25rem]
      fontWeight: '600',            // font-semibold
      letterSpacing: '-0.019em',    // tracking-[-0.019em]
      color: 'var(--h2-color)',
      textShadow: 'var(--h2-shadow, none)', // Pianissimo depth effect
      marginTop: '1.5rem',          // mt-6 (6 * 0.25rem)
      marginBottom: '0.75rem',      // mb-3 (3 * 0.25rem)
    },
    '.cm-header-3': {
      fontSize: '1.125rem',         // text-[1.125rem]
      fontWeight: '500',            // font-medium
      letterSpacing: '-0.017em',    // tracking-[-0.017em]
      color: 'var(--h3-color)',
      textShadow: 'var(--h3-shadow, none)', // Pianissimo depth effect
      marginTop: '1.25rem',         // mt-5 (5 * 0.25rem)
      marginBottom: '0.5rem',       // mb-2 (2 * 0.25rem)
    },
    '.cm-header-4': {
      fontSize: '1rem',             // text-[1rem]
      fontWeight: '500',            // font-medium
      letterSpacing: '-0.014em',    // tracking-[-0.014em]
      color: 'var(--h4-color)',
      marginTop: '1rem',            // mt-4 (4 * 0.25rem)
      marginBottom: '0.5rem',       // mb-2 (2 * 0.25rem)
    },
    '.cm-header-5': {
      fontSize: '0.875rem',         // text-[0.875rem]
      fontWeight: '500',            // font-medium
      letterSpacing: '-0.011em',    // tracking-[-0.011em]
      color: 'var(--h5-color)',
      marginTop: '0.75rem',         // mt-3 (3 * 0.25rem)
      marginBottom: '0.25rem',      // mb-1 (1 * 0.25rem)
    },
    '.cm-header-6': {
      fontSize: '0.875rem',         // text-[0.875rem]
      fontWeight: '400',            // normal weight (no font-medium)
      letterSpacing: '-0.011em',    // tracking-[-0.011em]
      color: 'var(--h6-color)',
      marginTop: '0.5rem',          // mt-2 (2 * 0.25rem)
      marginBottom: '0.25rem',      // mb-1 (1 * 0.25rem)
    },
    
    // Formatting characters
    '.cm-formatting': {
      color: 'var(--text-faint)', // Use CSS variable
      opacity: '0.7',
    },
    '.cm-formatting-list': {
      color: 'var(--text-accent)', // Use CSS variable
      opacity: '0.9',
    },
    
    // Bold text
    '.cm-strong': {
      color: 'var(--bold-color)', // Use CSS variable
      fontWeight: 'bold',
    },
    
    // Italic text
    '.cm-emphasis': {
      color: 'var(--italic-color)', // Use CSS variable
      fontStyle: 'italic',
    },
    
    // Strikethrough text
    '.cm-strikethrough': {
      color: 'var(--text-muted)', // Use CSS variable
      textDecoration: 'line-through',
      opacity: '0.9',
    },
    
    // 🎨 Chat-Style Paragraphs - Generous Breathing Room
    '.cm-line:not(.cm-header):not(.cm-list):not(.cm-code-block-content)': {
      marginTop: '1rem',            // my-4 top
      marginBottom: '1rem',         // my-4 bottom
      lineHeight: '1.75',           // leading-[1.75]
      letterSpacing: '-0.011em',    // tracking-[-0.011em]
    },
    
    // 🎨 Chat-Style Inline Code - Exact Match
    '.cm-inline-code': {
      fontFamily: 'var(--font-monospace, monospace)',
      fontSize: '0.85em',                           // text-[0.85em]
      color: 'var(--inline-code-text)',             // emerald-300/90
      backgroundColor: 'var(--inline-code-bg)',     // emerald-400/[0.08]
      border: '1px solid var(--inline-code-border)', // emerald-400/[0.15]
      paddingLeft: '0.375rem',                      // px-[0.375rem]
      paddingRight: '0.375rem',
      paddingTop: '0.0625rem',                      // py-[0.0625rem]
      paddingBottom: '0.0625rem',
      marginLeft: '0.125rem',                       // mx-[0.125rem]
      marginRight: '0.125rem',
      borderRadius: '0.1875rem',                    // rounded-[0.1875rem]
      display: 'inline-block',
      alignItems: 'baseline',
      lineHeight: 'none',
      letterSpacing: '-0.01em',                     // tracking-[-0.01em]
    },
    
    // 🎨 Chat-Style Links - Trustworthy, Not Shouty
    '.cm-url': {
      color: 'var(--link-color-chat)',              // blue-400/90
      textDecoration: 'underline',
      textDecorationColor: 'var(--link-decoration)', // blue-400/30
      textDecorationThickness: '0.5px',             // decoration-[0.5px]
      textUnderlineOffset: '3px',                   // underline-offset-[3px]
      transition: 'color 0.2s, text-decoration-color 0.2s',
    },
    '.cm-url:hover': {
      color: 'var(--link-color-chat-hover)',        // blue-400
      textDecorationColor: 'var(--link-decoration-hover)', // blue-400/50
    },
    
    // Wiki links
    '.cm-wiki-link': {
      color: 'var(--link-color)', // Use CSS variable
      textDecoration: 'underline',
      textDecorationStyle: 'solid',
      textDecorationColor: 'var(--link-color)', // Use CSS variable
      textDecorationThickness: '1px',
      textUnderlineOffset: '2px',
      borderRadius: '2px',
      padding: '0 2px',
    },
    '.cm-wiki-link:hover': {
      backgroundColor: 'var(--background-modifier-hover)', // Use CSS variable
      color: 'var(--link-color-hover)', // Use CSS variable
      textDecorationColor: 'var(--link-color-hover)', // Use CSS variable
    },
    '.cm-wiki-link-broken': {
      color: 'var(--text-error)', // Use CSS variable
      textDecorationColor: 'var(--text-error)', // Use CSS variable
      textDecorationStyle: 'dashed',
    },
    '.cm-wiki-link-broken:hover': {
      backgroundColor: 'var(--background-modifier-error-hover)', // Use CSS variable
      color: 'var(--text-error)', // Use CSS variable
      textDecorationColor: 'var(--text-error)', // Use CSS variable
    },
    
    // 🎨 Chat-Style Lists - Clean, Scannable
    '.cm-list': {
      color: 'var(--white-80)',     // text-white/80
      marginTop: '1rem',            // my-4 top
      marginBottom: '1rem',         // my-4 bottom
      marginLeft: '1.5rem',         // ml-6 (6 * 0.25rem)
      lineHeight: '1.6',            // Comfortable reading
    },
    
    // List spacing between items
    '.cm-list + .cm-list': {
      marginTop: '0.5rem',          // space-y-2 equivalent
    },
    
    // Styling for List Item Bullets (Depth Aware) - using CSS variables
    '[class*="cm-list-depth-"]': { 
      position: 'relative', 
    },

    // Depth 0 (Top Level)
    '.cm-line.cm-list-depth-0:has(span.cm-formatting-list)': {
       paddingLeft: '0px', 
    },

    // Depth 1
    '.cm-line.cm-list-depth-1:has(span.cm-formatting-list)': {
       paddingLeft: '24px', 
    },

    // Depth 2
    '.cm-line.cm-list-depth-2:has(span.cm-formatting-list)': {
       paddingLeft: '48px', 
    },

    // Depth 3
    '.cm-line.cm-list-depth-3:has(span.cm-formatting-list)': {
       paddingLeft: '72px', 
    },
    
    // Task lists
    '.cm-list.cm-task': {
      color: 'var(--text-normal)', // Use CSS variable
    },
    '.cm-list.cm-task.cm-checked': {
      color: 'var(--text-muted)', // Use CSS variable
      textDecoration: 'line-through',
      opacity: '0.8',
    },
    
    // 🎨 Chat-Style Blockquotes - Wisdom, Not Decoration
    '.cm-quote': {
      color: 'var(--blockquote-text)',              // text-white/70
      fontStyle: 'italic',
      borderLeft: '2px solid var(--blockquote-border)', // border-white/20
      paddingLeft: '1rem',                          // pl-4 (4 * 0.25rem)
      marginTop: '1.5rem',                          // my-6 top
      marginBottom: '1.5rem',                       // my-6 bottom
      marginLeft: '0',                              // No left margin like chat
      opacity: '1',                                 // Full opacity, color handles it
    },
    
    // Code blocks
    '.cm-code-block-start, .cm-code-block-content, .cm-code-block-end': {
      backgroundColor: 'var(--code-background)', // Use CSS variable
      position: 'relative',
    },
    
    // Callouts
    '.cm-callout': {
      position: 'relative',
      borderLeft: '4px solid var(--text-accent)', // Use CSS variable
      backgroundColor: 'var(--background-secondary)', // Use CSS variable
      borderRadius: '0 4px 4px 0',
      padding: '0 8px',
      marginLeft: '0',
    },
    '.cm-callout-title': {
      fontWeight: 'bold',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    },
    '.cm-callout-content': {
      paddingTop: '2px',
      paddingBottom: '2px',
    },
    
    // 🎨 Chat-Style Text Emphasis - Subtle Emphasis
    '.cm-strong': {
      fontWeight: '600',            // font-semibold
      color: 'var(--white-100)',    // text-white (full white)
    },
    
    '.cm-emphasis': {
      fontStyle: 'italic',
      color: 'var(--white-90)',     // text-white/90
    },
    
    // 🎨 Chat-Style HR - Breathing Space
    '.cm-hr': {
      display: 'block',
      height: '1px',
      border: '0',
      background: 'linear-gradient(to right, transparent 0%, var(--white-40) 20%, var(--white-40) 80%, transparent 100%)',
      marginTop: '2rem',            // my-8 top
      marginBottom: '2rem',         // my-8 bottom
      width: '100%',
    },
  });

  // Create syntax highlighting style using CSS variables
  const tokyoNightHighlightStyle = HighlightStyle.define([
    { tag: tags.comment, color: 'var(--comment)' },
    { tag: tags.string, color: 'var(--green)' },
    { tag: tags.number, color: 'var(--orange)' },
    { tag: tags.keyword, color: 'var(--magenta)' },
    { tag: tags.operator, color: 'var(--cyan)' },
    { tag: tags.definition(tags.variableName), color: 'var(--blue)' },
    { tag: tags.function(tags.variableName), color: 'var(--blue)' },
    { tag: tags.className, color: 'var(--yellow)' }, 
    { tag: tags.typeName, color: 'var(--yellow)' },   
    { tag: tags.tagName, color: 'var(--red)' },
    { tag: tags.attributeName, color: 'var(--yellow)' },
    { tag: tags.propertyName, color: 'var(--blue)' },
    
    // 🎨 Orchestra Pianissimo Header Colors - HighlightStyle Override
    // These take precedence over EditorView.theme() for syntax highlighting colors
    { tag: tags.heading1, color: 'var(--h1-color)', fontWeight: 'bold' }, // H1 - Soft periwinkle
    { tag: tags.heading2, color: 'var(--h2-color)', fontWeight: 'bold' }, // H2 - Muted sky blue
    { tag: tags.heading3, color: 'var(--h3-color)', fontWeight: 'bold' }, // H3 - Dusty blue
    { tag: tags.heading4, color: 'var(--h4-color)', fontWeight: 'bold' }, // H4 - Blue-gray
    { tag: tags.heading5, color: 'var(--h5-color)', fontWeight: 'bold' }, // H5 - Near neutral
    { tag: tags.heading6, color: 'var(--h6-color)', fontWeight: 'bold' }, // H6 - Whisper gray
    { tag: tags.heading, fontWeight: 'bold' }, // Fallback for any unspecified headers
    
    // 🎨 Chat-Style Token Colors
    { tag: tags.link, color: 'var(--link-color-chat)' },           // Use chat link color
    { tag: tags.emphasis, fontStyle: 'italic', color: 'var(--white-90)' }, // text-white/90
    { tag: tags.strong, fontWeight: 'bold', color: 'var(--white-100)' },   // text-white
  ]);

  return [
    tokyoNightTheme,
    syntaxHighlighting(tokyoNightHighlightStyle),
  ];
}