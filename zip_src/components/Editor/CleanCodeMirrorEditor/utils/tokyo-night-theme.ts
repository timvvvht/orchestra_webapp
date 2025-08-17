import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * Creates an Orchestra theme for CodeMirror
 * A sacred writing space for cognitive amplification
 * Mystical minimalism meets functional elegance
 */
export function createTokyoNightTheme(isDark: boolean = true) {
    // Define colors based on Orchestra's mystical aesthetic
    const colors = isDark
        ? {
              // Orchestra Dark Theme - Mystical & Ethereal
              bg: 'transparent',
              bg_dark: 'rgba(0, 0, 0, 0.4)',
              bg_highlight: 'rgba(255, 255, 255, 0.05)',
              bg_highlight_dark: 'rgba(255, 255, 255, 0.02)',
              fg: 'rgba(255, 255, 255, 0.9)',
              fg_dark: 'rgba(255, 255, 255, 0.85)',
              comment: 'rgba(255, 255, 255, 0.4)',

              // Orchestra's mystical color palette
              blue: '#0077ED', // Primary brand blue
              cyan: '#89DDFF', // Ethereal cyan
              magenta: '#C792EA', // Mystical purple
              pink: 'rgba(255, 255, 255, 0.8)', // White mystical
              orange: '#F78C6C', // Warm amber
              yellow: '#FFCB6B', // Golden yellow
              green: '#C3E88D', // Vital green
              teal: 'rgba(26, 188, 156, 0.8)',
              red: 'rgba(239, 68, 68, 0.8)',
              red1: 'rgba(239, 68, 68, 0.9)',

              // Orchestra header colors with mystical glows
              h1_color: 'rgba(255, 255, 255, 0.95)', // Pure white with blue glow
              h2_color: 'rgba(147, 51, 234, 0.9)', // Purple mystical
              h3_color: 'rgba(137, 221, 255, 0.85)', // Cyan ethereal
              h4_color: 'rgba(255, 203, 107, 0.8)', // Amber warm
              h5_color: 'rgba(195, 232, 141, 0.8)', // Green vitality
              h6_color: 'rgba(247, 140, 108, 0.8)' // Rose whisper
          }
        : {
              // Orchestra Light Theme (for future use)
              bg: 'rgba(242, 242, 247, 0.95)',
              bg_dark: 'rgba(230, 230, 235, 0.95)',
              bg_highlight: 'rgba(220, 220, 225, 0.5)',
              bg_highlight_dark: 'rgba(210, 210, 215, 0.5)',
              fg: 'rgba(58, 58, 78, 0.9)',
              fg_dark: 'rgba(88, 88, 108, 0.85)',
              comment: 'rgba(120, 120, 140, 0.7)',
              blue: '#0077ED',
              cyan: '#0099AA',
              magenta: '#9333EA',
              pink: '#C83264',
              orange: '#D97706',
              yellow: '#CA8A04',
              green: '#059669',
              teal: '#0D9488',
              red: '#DC2626',
              red1: '#B91C1C',
              h1_color: 'rgba(58, 58, 78, 0.95)',
              h2_color: 'rgba(58, 58, 78, 0.9)',
              h3_color: 'rgba(58, 58, 78, 0.85)',
              h4_color: 'rgba(58, 58, 78, 0.7)',
              h5_color: 'rgba(58, 58, 78, 0.65)',
              h6_color: 'rgba(58, 58, 78, 0.6)'
          };

    // Create the Orchestra theme extension
    const tokyoNightTheme = EditorView.theme({
        '&': {
            backgroundColor: 'transparent',
            color: colors.fg,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif'
        },
        '.cm-content': {
            caretColor: colors.blue,
            fontSize: '16px',
            lineHeight: '1.7',
            padding: '1.5em',
            fontWeight: '400',
            /* Orchestra's smooth rendering */
            '-webkit-font-smoothing': 'antialiased',
            '-moz-osx-font-smoothing': 'grayscale',
            'text-rendering': 'optimizeLegibility'
        },
        '.cm-cursor': {
            borderLeftColor: colors.blue,
            borderLeftWidth: '2px',
            height: '1.2em !important',
            fontSize: '16px !important',
            marginLeft: '-1px'
        },
        '.cm-activeLine': {
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
        },
        '.cm-selectionMatch': {
            backgroundColor: 'rgba(255, 235, 59, 0.3)',
            border: '1px solid rgba(255, 235, 59, 0.5)',
            borderRadius: '2px'
        },
        '.cm-selectionBackground': {
            backgroundColor: 'rgba(0, 119, 237, 0.3) !important'
        },
        '.cm-gutters': {
            display: 'none' // Hide gutters for clean Orchestra look
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'transparent'
        },
        '.cm-lineNumbers': {
            color: colors.comment
        },
        '.cm-foldPlaceholder': {
            backgroundColor: colors.bg_highlight,
            color: colors.fg,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            padding: '0 0.5em',
            margin: '0 0.2em'
        },

        // Orchestra Markdown Headers - Mystical Typography
        '.cm-header': {
            fontWeight: '500',
            lineHeight: '1.4',
            position: 'relative'
        },
        '.cm-header-1': {
            fontSize: '20px !important',
            fontWeight: '300',
            letterSpacing: '-0.02em',
            color: colors.h1_color,
            /* Ethereal blue glow - majestic */
            textShadow: '0 0 30px rgba(0, 119, 237, 0.15)',
            borderBottom: '1px solid rgba(0, 119, 237, 0.1)',
            paddingBottom: '0.3em',
            marginBottom: '0.3em'
        },
        '.cm-header-2': {
            fontSize: '18px !important',
            fontWeight: '400',
            letterSpacing: '-0.01em',
            color: 'rgba(255, 255, 255, 0.95) !important',  // White mystical - Chat style
            /* Purple mystical hint */
            textShadow: '0 0 25px rgba(147, 51, 234, 0.12)'
        },
        '.cm-header-3': {
            fontSize: '16px !important',
            fontWeight: '500',
            color: '#89DDFF !important',  // Cyan ethereal - Orchestra brand
            /* Soft cyan accent - ethereal */
            textShadow: '0 0 20px rgba(137, 221, 255, 0.1)'
        },
        '.cm-header-4': {
            fontSize: '15px !important',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#FFCB6B !important',  // Warm amber - Orchestra brand
            /* Warm amber glow */
            textShadow: '0 0 15px rgba(255, 203, 107, 0.08)'
        },
        '.cm-header-5': {
            fontSize: '14px !important',
            fontWeight: '600',
            letterSpacing: '0.02em',
            color: '#C3E88D !important',  // Vital green - Orchestra brand
            /* Soft green vitality */
            textShadow: '0 0 12px rgba(195, 232, 141, 0.06)'
        },
        '.cm-header-6': {
            fontSize: '13px !important',
            fontWeight: '500',
            fontStyle: 'italic',
            color: '#F78C6C !important',  // Rose whisper - Orchestra brand
            /* Gentle rose whisper */
            textShadow: '0 0 10px rgba(247, 140, 108, 0.05)'
        },

        // Header dividers removed for a cleaner look

        // Orchestra Text Formatting
        '.cm-formatting': {
            color: colors.comment,
            opacity: '0.7'
        },
        '.cm-formatting-list': {
            color: 'rgba(255, 255, 255, 0.5)',
            opacity: '0.9'
        },

        // Bold text - Orchestra style
        '.cm-strong': {
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.95)'
        },

        // Italic text - Orchestra style
        '.cm-emphasis': {
            fontStyle: 'italic',
            color: 'rgba(255, 255, 255, 0.9)'
        },

        // Strikethrough text
        '.cm-strikethrough': {
            color: colors.comment,
            textDecoration: 'line-through',
            opacity: '0.9'
        },

        // Inline code - Orchestra style
        '.cm-inline-code': {
            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
            fontSize: '0.875em',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            padding: '0.2em 0.4em',
            margin: '0 0.1em',
            color: 'rgba(255, 255, 255, 0.9)',
            whiteSpace: 'nowrap'
        },

        // Orchestra Links - Portals to Knowledge
        '.cm-url': {
            color: colors.blue,
            textDecoration: 'none',
            position: 'relative',
            background: `linear-gradient(to right, ${colors.blue}, ${colors.blue}) no-repeat bottom`,
            backgroundSize: '100% 1px',
            backgroundPosition: '0 100%',
            paddingBottom: '2px',
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
        },
        '.cm-url:hover': {
            color: '#0071E3',
            textShadow: '0 0 20px rgba(0, 119, 237, 0.3)',
            backgroundSize: '100% 2px'
        },

        // Wiki links - Orchestra style
        '.cm-wiki-link': {
            color: colors.blue,
            textDecoration: 'none',
            background: `linear-gradient(to right, ${colors.blue}, ${colors.blue}) no-repeat bottom`,
            backgroundSize: '100% 1px',
            backgroundPosition: '0 100%',
            paddingBottom: '2px',
            borderRadius: '2px',
            padding: '0 2px',
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
        },
        '.cm-wiki-link:hover': {
            backgroundColor: 'rgba(0, 119, 237, 0.1)',
            color: '#0071E3',
            textShadow: '0 0 20px rgba(0, 119, 237, 0.3)',
            backgroundSize: '100% 2px'
        },
        '.cm-wiki-link-broken': {
            color: colors.red,
            textDecorationStyle: 'dashed',
            backgroundImage: `linear-gradient(to right, ${colors.red}, ${colors.red})`
        },
        '.cm-wiki-link-broken:hover': {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: colors.red1
        },

        // Lists
        '.cm-list': {
            color: colors.fg
        },
        // Styling for List Item Bullets (Depth Aware)
        // Base for all list item lines identified by the plugin
        '[class*="cm-list-depth-"]': {
            position: 'relative'
        },

        // Depth 0 (Top Level)
        '.cm-line.cm-list-depth-0:has(span.cm-formatting-list)': {
            paddingLeft: '25px'
        },
        '.cm-list-depth-0:not(.cm-activeLine):has(span.cm-formatting-list)::before': {
            content: '"\\2022"',
            color: colors.fg,
            position: 'absolute',
            left: '5px',
            top: '0'
        },

        // Depth 1
        '.cm-line.cm-list-depth-1:has(span.cm-formatting-list)': {
            paddingLeft: '45px'
        },
        '.cm-list-depth-1:not(.cm-activeLine):has(span.cm-formatting-list)::before': {
            content: '"\\2022"',
            color: colors.fg,
            position: 'absolute',
            left: '25px'
        },

        // Depth 2
        '.cm-line.cm-list-depth-2:has(span.cm-formatting-list)': {
            paddingLeft: '65px'
        },
        '.cm-list-depth-2:not(.cm-activeLine):has(span.cm-formatting-list)::before': {
            content: '"\\2022"',
            color: colors.fg,
            position: 'absolute',
            left: '45px'
        },

        // Depth 3
        '.cm-line.cm-list-depth-3:has(span.cm-formatting-list)': {
            paddingLeft: '85px'
        },
        '.cm-list-depth-3:not(.cm-activeLine):has(span.cm-formatting-list)::before': {
            content: '"\\2022"',
            color: colors.fg,
            position: 'absolute',
            left: '65px'
        },

        // Task lists
        '.cm-list.cm-task': {
            color: colors.fg
        },
        '.cm-list.cm-task.cm-checked': {
            color: colors.comment,
            textDecoration: 'line-through',
            opacity: '0.8'
        },

        // Orchestra Quotes - Wisdom Preserved
        '.cm-quote': {
            color: 'rgba(255, 255, 255, 0.8)',
            fontStyle: 'italic',
            borderLeft: '3px solid rgba(147, 51, 234, 0.3)',
            background: 'linear-gradient(to right, rgba(147, 51, 234, 0.05), transparent)',
            paddingLeft: '1.5em',
            marginLeft: '-1em',
            padding: '1em 1.5em',
            position: 'relative'
        },

        // Orchestra Code Blocks - Sacred Syntax
        '.cm-code-block-start, .cm-code-block-content, .cm-code-block-end': {
            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '1.5em',
            margin: '1em 0',
            position: 'relative',
            /* Subtle inner glow */
            boxShadow: `
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2),
        0 0 40px rgba(0, 0, 0, 0.2) inset
      `,
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: '1.6'
        },

        // Callouts
        '.cm-callout': {
            position: 'relative',
            borderLeft: `4px solid ${colors.magenta}`,
            backgroundColor: `color-mix(in srgb, ${colors.magenta} ${isDark ? '10%' : '15%'}, ${colors.bg})`, // Adjusted mix for light
            borderRadius: '0 4px 4px 0',
            padding: '0 8px',
            marginLeft: '0'
        },
        '.cm-callout-title': {
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
        },
        '.cm-callout-content': {
            paddingTop: '2px',
            paddingBottom: '2px'
        }
    });

    // Create Orchestra syntax highlighting style - Ethereal Code
    const tokyoNightHighlightStyle = HighlightStyle.define([
        { tag: tags.comment, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' },
        { tag: tags.string, color: '#C3E88D' }, // Vital green
        { tag: tags.number, color: '#F78C6C' }, // Warm amber
        { tag: tags.keyword, color: '#C792EA', fontWeight: '500' }, // Mystical purple
        { tag: tags.operator, color: '#89DDFF' }, // Ethereal cyan
        { tag: tags.definition(tags.variableName), color: '#82AAFF' }, // Functions blue
        { tag: tags.function(tags.variableName), color: '#82AAFF' }, // Functions blue
        { tag: tags.className, color: '#FFCB6B' }, // Golden yellow
        { tag: tags.typeName, color: '#FFCB6B' }, // Golden yellow
        { tag: tags.tagName, color: '#F07178' }, // Rose
        { tag: tags.attributeName, color: '#C792EA' }, // Mystical purple
        { tag: tags.propertyName, color: '#82AAFF' }, // Functions blue
        
        // 🎨 Orchestra Markdown Header Colors - HighlightStyle Override
        // These take precedence over EditorView.theme() for syntax highlighting colors
        { tag: tags.heading1, color: colors.h1_color, fontWeight: 'bold' }, // Pure white with blue glow
        { tag: tags.heading2, color: colors.h2_color, fontWeight: 'bold' }, // Purple mystical
        { tag: tags.heading3, color: colors.h3_color, fontWeight: 'bold' }, // Cyan ethereal
        { tag: tags.heading4, color: colors.h4_color, fontWeight: 'bold' }, // Warm amber
        { tag: tags.heading5, color: colors.h5_color, fontWeight: 'bold' }, // Vital green
        { tag: tags.heading6, color: colors.h6_color, fontWeight: 'bold' }, // Rose whisper
        { tag: tags.heading, fontWeight: 'bold' }, // Fallback for any unspecified headers
        
        { tag: tags.link, color: colors.blue }, // Orchestra brand blue
        { tag: tags.emphasis, fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.9)' },
        { tag: tags.strong, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.95)' }
    ]);

    return [tokyoNightTheme, syntaxHighlighting(tokyoNightHighlightStyle)];
}
