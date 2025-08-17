import React, { useMemo, useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { cn } from '@/lib/utils';

interface PlanPaneProps {
  sessionId: string;
}

// Phenomenal syntax theme - inspired by the best of Sublime Text, VS Code, and Xcode
// Carefully crafted for optimal readability and visual hierarchy
const phenomenalSyntaxTheme = {
    'code[class*="language-"]': {
        color: '#d4d4d8', // Base text - zinc-300
        background: 'transparent',
        fontFamily: 'SF Mono, Monaco, Consolas, "Courier New", monospace',
        fontSize: '0.8125rem', // 13px
        lineHeight: '1.6',
        direction: 'ltr',
        textAlign: 'left',
        whiteSpace: 'pre-wrap', // Allow wrapping
        wordSpacing: 'normal',
        wordBreak: 'break-word', // Break long words
        wordWrap: 'break-word', // Wrap long words
        overflowWrap: 'anywhere', // Most aggressive wrapping
        tabSize: 4,
        hyphens: 'auto', // Enable hyphenation
        letterSpacing: '0.025em', // Slight spacing for clarity
        
        // Enhanced containment
        maxWidth: '100%',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        contain: 'layout style',
    },
    
    // Comments - muted but readable
    'comment': { 
        color: '#6b7280', // gray-500
        fontStyle: 'italic',
    },
    'prolog': { color: '#6b7280' },
    'doctype': { color: '#6b7280' },
    'cdata': { color: '#6b7280' },
    
    // Strings - warm green, easy on eyes
    'string': { 
        color: '#86efac', // green-300
    },
    'attr-value': { color: '#86efac' },
    'char': { color: '#86efac' },
    'regex': { color: '#86efac' },
    
    // Numbers and constants - distinct amber
    'number': { color: '#fcd34d' }, // amber-300
    'boolean': { color: '#fcd34d' },
    'builtin': { color: '#fcd34d' },
    'constant': { color: '#fcd34d' },
    'symbol': { color: '#fcd34d' },
    
    // Keywords - royal purple
    'keyword': { 
        color: '#c084fc', // purple-400
        fontWeight: '500',
    },
    'atrule': { color: '#c084fc' },
    'rule': { color: '#c084fc' },
    'important': { 
        color: '#c084fc',
        fontWeight: '600',
    },
    
    // Functions and methods - sky blue
    'function': { 
        color: '#7dd3fc', // sky-300
    },
    'method': { color: '#7dd3fc' },
    'macro': { color: '#7dd3fc' },
    
    // Classes and types - coral
    'class-name': { 
        color: '#fca5a5', // red-300
        fontWeight: '500',
    },
    'type': { color: '#fca5a5' },
    'interface': { color: '#fca5a5' },
    'namespace': { color: '#fca5a5' },
    
    // Properties and attributes - teal
    'property': { color: '#5eead4' }, // teal-300
    'attr-name': { color: '#5eead4' },
    'variable': { color: '#5eead4' },
    'parameter': { 
        color: '#5eead4',
        fontStyle: 'italic',
    },
    
    // Tags and selectors - pink
    'tag': { color: '#f9a8d4' }, // pink-300
    'selector': { color: '#f9a8d4' },
    
    // Operators and punctuation - subtle
    'operator': { 
        color: '#a1a1aa', // zinc-400
        fontWeight: '400',
    },
    'punctuation': { color: '#71717a' }, // zinc-500
    'delimiter': { color: '#71717a' },
    
    // Special elements
    'entity': { 
        color: '#fbbf24', // amber-400
        cursor: 'help',
    },
    'url': { 
        color: '#60a5fa', // blue-400
        textDecoration: 'underline',
    },
    
    // Insertions and deletions (for diffs)
    'inserted': { 
        color: '#86efac',
        backgroundColor: 'rgba(134, 239, 172, 0.1)',
    },
    'deleted': { 
        color: '#fca5a5',
        backgroundColor: 'rgba(252, 165, 165, 0.1)',
        textDecoration: 'line-through',
    },
    
    // Bold and italic
    'bold': { fontWeight: '600' },
    'italic': { fontStyle: 'italic' },
    
    // Language-specific improvements
    // JavaScript/TypeScript
    'script': { color: '#d4d4d8' },
    'template-string': { color: '#86efac' },
    'template-punctuation': { color: '#5eead4' },
    
    // CSS
    'selector.class': { color: '#fcd34d' },
    'selector.id': { color: '#f9a8d4' },
    'property-name': { color: '#5eead4' },
    'unit': { color: '#fcd34d' },
    
    // HTML/JSX
    'tag.punctuation': { color: '#71717a' },
    'tag.script': { color: '#7dd3fc' },
    'tag.style': { color: '#7dd3fc' },
    
    // JSON
    'json.property': { color: '#5eead4' },
    
    // Markdown
    'markdown.heading': { 
        color: '#7dd3fc',
        fontWeight: '600',
    },
    'markdown.bold': { fontWeight: '600' },
    'markdown.italic': { fontStyle: 'italic' },
    'markdown.code': { 
        color: '#86efac',
        backgroundColor: 'rgba(134, 239, 172, 0.1)',
        // Enhanced wrapping rules for markdown code
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        wordWrap: 'break-word',
        maxWidth: '100%',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        contain: 'layout style',
    },
};

const PlanPane: React.FC<PlanPaneProps> = ({ sessionId }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const plan = useMissionControlStore(state => state.plans[sessionId]);

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Renderers designed for mental clarity and emotional calm - exact copy from TextPartDisplay
  const markdownComponents = useMemo(() => ({
    // Paragraphs - generous breathing room
    p: ({ children }: any) => (
      <p className="my-4 leading-[1.75] tracking-[-0.011em]">
        {children}
      </p>
    ),
    
    // Headers - clear hierarchy without shouting
    h1: ({ children }: any) => (
      <h1 className="mt-8 mb-4 text-[1.5rem] font-semibold tracking-[-0.021em] text-white">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="mt-6 mb-3 text-[1.25rem] font-semibold tracking-[-0.019em] text-white/95">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="mt-5 mb-2 text-[1.125rem] font-medium tracking-[-0.017em] text-white/90">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="mt-4 mb-2 text-[1rem] font-medium tracking-[-0.014em] text-white/85">
        {children}
      </h4>
    ),
    h5: ({ children }: any) => (
      <h5 className="mt-3 mb-1 text-[0.875rem] font-medium tracking-[-0.011em] text-white/80">
        {children}
      </h5>
    ),
    h6: ({ children }: any) => (
      <h6 className="mt-2 mb-1 text-[0.875rem] tracking-[-0.011em] text-white/75">
        {children}
      </h6>
    ),
    
    // Links - trustworthy, not shouty, with universal link handling
    a: ({ href, children, ...props }: any) => (
      <a 
        href={href}
        className={cn(
          "underline decoration-[0.5px] underline-offset-[3px] transition-colors duration-200",
          "text-blue-400/90 hover:text-blue-400 decoration-blue-400/30 hover:decoration-blue-400/50"
        )}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    
    // Code - clean and functional
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      // If no language class and inline is not explicitly false, treat as inline code
      if (!className || inline === true) {
        return (
          <code 
            className={cn(
              // Sizing and spacing
              "px-[0.375rem] py-[0.0625rem]", // Minimal vertical padding
              "mx-[0.125rem]", // Tiny margins to prevent crowding
              
              // Typography
              "font-mono text-[0.85em] leading-none",
              "tracking-[-0.01em]", // Slightly tighter tracking
              
              // Colors - subtle but distinct
              "text-emerald-300/90", // Soft green that's easy on eyes
              "bg-emerald-400/[0.08]", // Very subtle background
              
              // Border and shape
              "rounded-[0.1875rem]", // Slightly rounded, not too round
              "border border-emerald-400/[0.15]", // Barely visible border
              
              // Subtle effects
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]", // Tiny inner highlight
              
              // Ensure it doesn't break layout
              "inline-block align-baseline",
              "break-words overflow-wrap-anywhere max-w-full"
            )}
            {...props}
          >
            {children}
          </code>
        );
      }
      
      // Code blocks - with phenomenal syntax highlighting
      const codeString = String(children).replace(/\n$/, '');
      const codeId = `code-${Math.random().toString(36).substring(2, 11)}`;
      
      return (
        <div className="relative my-6 group w-full max-w-full min-w-0 overflow-hidden">
          {/* Code block container with phenomenal styling and enhanced containment */}
          <div className="relative rounded-lg overflow-hidden border border-white/[0.06] bg-zinc-900/50 backdrop-blur-sm w-full max-w-full min-w-0 contain-layout contain-style">
            {/* Subtle top highlight for depth */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            
            {/* Language label - elegant floating badge */}
            {language && (
              <div className="absolute top-3 left-3 z-10">
                <div className="px-2.5 py-1 text-[0.6875rem] font-medium tracking-[0.05em] text-white/60 bg-black/50 backdrop-blur-sm rounded-md border border-white/[0.08]">
                  {language}
                </div>
              </div>
            )}
            
            {/* Copy button - refined glass morphism */}
            <button
              onClick={() => handleCopy(codeString, codeId)}
              className={cn(
                "absolute top-3 right-3 z-10 p-2 rounded-md",
                "bg-white/[0.04] backdrop-blur-sm",
                "border border-white/[0.08]",
                "opacity-0 group-hover:opacity-100",
                "hover:bg-white/[0.08] hover:border-white/[0.12]",
                "transition-all duration-200",
                "transform hover:scale-105 active:scale-95",
                copiedId === codeId && "opacity-100 bg-green-500/20 border-green-500/30"
              )}
              aria-label="Copy code"
            >
              {copiedId === codeId ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/60 hover:text-white/80" />
              )}
            </button>
            
            <SyntaxHighlighter
              style={phenomenalSyntaxTheme}
              language={language || 'text'}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: language ? '3rem 1.5rem 1.5rem' : '1.5rem', // Extra top padding when language label present
                background: 'transparent',
                fontSize: '0.8125rem',
                lineHeight: '1.7', // Slightly more generous line height
                
                // CRITICAL: Force strict containment - no overflow allowed
                overflow: 'hidden', // Prevent any overflow
                overflowX: 'hidden', // No horizontal scroll
                overflowY: 'visible', // Allow vertical expansion
                
                // CRITICAL: Strict width constraints with box-sizing
                width: '100%',
                maxWidth: '100%',
                minWidth: 0, // Allow shrinking below content width
                boxSizing: 'border-box', // Include padding in width calculation
                
                // Aggressive word breaking for all content
                wordBreak: 'break-word',
                overflowWrap: 'anywhere', // Most aggressive wrapping
                whiteSpace: 'pre-wrap',
                hyphens: 'auto',
                
                // CSS containment for performance and layout stability
                contain: 'layout style',
                
                // Extra safeguards for specific languages
                ...(language === 'markdown' && {
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
                  textWrap: 'wrap',
                }),
                
                // Special handling for languages with long identifiers
                ...(['javascript', 'typescript', 'python', 'java', 'csharp'].includes(language) && {
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }),
                
                // Custom scrollbar styling (keeping for potential future use)
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'SF Mono, Monaco, Consolas, "Courier New", monospace',
                  fontVariantLigatures: 'none', // Disable ligatures for clarity
                  
                  // CRITICAL: Enhanced containment for code elements
                  maxWidth: '100%',
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  
                  // CRITICAL: Most aggressive word breaking
                  wordBreak: 'break-all', // Break anywhere, even mid-word
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  
                  // CRITICAL: No overflow allowed
                  overflow: 'hidden',
                  overflowX: 'hidden',
                  textOverflow: 'clip',
                  
                  // Extra wrapping safeguards for markdown code elements
                  ...(language === 'markdown' && {
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap',
                    textWrap: 'wrap',
                  }),
                }
              }}
              wrapLines={true}
              wrapLongLines={true}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    },
    
    // Lists - clean, scannable
    ul: ({ children }: any) => (
      <ul className="my-4 ml-6 space-y-2">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="my-4 ml-6 space-y-2">
        {children}
      </ol>
    ),
    li: ({ children, ordered, checked, index, ...props }: any) => {
      // Only render checkboxes for actual task list items (checked is boolean, not null/undefined)
      if (typeof checked === 'boolean') {
        return (
          <li className="flex items-start gap-2 -ml-6 list-none">
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className={cn(
                "mt-[0.375rem] w-3.5 h-3.5 rounded-[0.1875rem]",
                "bg-white/[0.04] border border-white/20",
                "checked:bg-blue-500 checked:border-blue-500",
                "transition-colors duration-200",
                "cursor-default"
              )}
            />
            <span className={cn(
              "flex-1",
              checked && "text-white/50 line-through"
            )}>
              {children}
            </span>
          </li>
        );
      }
      
      // Regular list items - clean and simple
      if (ordered) {
        return (
          <li className="text-white/80">
            {children}
          </li>
        );
      }
      
      // Unordered list items with custom bullets
      return (
        <li className="text-white/80 list-none relative">
          <span className="absolute -left-5 text-white/40">•</span>
          {children}
        </li>
      );
    },
    
    // Blockquotes - wisdom, not decoration
    blockquote: ({ children }: any) => (
      <blockquote className="my-6 pl-4 border-l-2 border-white/20 text-white/70 italic">
        {children}
      </blockquote>
    ),
    
    // Horizontal rules - breathing space
    hr: () => (
      <hr className="my-8 border-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    ),
    
    // Tables - enhanced data clarity with better overflow handling
    table: ({ children }: any) => (
      <div className="my-6 w-full max-w-full overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-full text-sm">
            {children}
          </table>
        </div>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-white/[0.03] border-b border-white/[0.08]">
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="divide-y divide-white/[0.04]">
        {children}
      </tbody>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-white/[0.02] transition-colors duration-150">
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-3 text-left font-medium text-white/70 text-xs uppercase tracking-wider whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-3 text-white/80 break-words hyphens-auto max-w-xs min-w-0 overflow-hidden overflow-wrap-anywhere">
        {children}
      </td>
    ),
    
    // Strong & emphasis - subtle emphasis
    strong: ({ children }: any) => (
      <strong className="font-semibold text-white">
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-white/90">
        {children}
      </em>
    ),
    
    // Images - content-focused
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt}
        className="my-6 rounded-lg max-w-full h-auto"
        loading="lazy"
        {...props}
      />
    ),
    
    // Pre element wrapper for code blocks
    pre: ({ children, ...props }: any) => {
      // ReactMarkdown wraps code blocks in <pre><code>...</code></pre>
      // We handle the code block in the code renderer, so just pass through
      return <>{children}</>;
    },
  }), [copiedId]);

  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mystical empty state */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
            <FileText className="relative w-16 h-16 mx-auto text-white/20" />
          </div>
          <p className="text-lg font-light text-white/40 mb-2">No Plan Available</p>
          <p className="text-sm text-white/30">This session awaits its blueprint.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/[0.02] to-transparent pointer-events-none" />
      
      {/* Markdown content with custom scroll - full height */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
          <div className="p-6 flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "markdown-content", // Custom class for potential future styling
                  "text-[1.134375rem] leading-[1.6] tracking-[-0.011em]", // 18.15px (16.5px + 10%) optimized for reading
                  "text-white/80", // Softer than pure white, easier on eyes
                  "selection:bg-blue-500/20 selection:text-white", // Thoughtful selection state
                  
                  // Typography optimizations
                  "font-sans antialiased",
                  
                  // Optimal readability width - 45-75 characters per line
                  "max-w-prose mx-auto w-full", // Tailwind's prose width (~65ch) centered
                  
                  // Enhanced text wrapping and overflow handling - LESS AGGRESSIVE
                  "break-words hyphens-auto min-w-0",
                  "overflow-hidden overflow-wrap-anywhere",
                  
                  // CSS containment for layout stability - REMOVED contain-size
                  "contain-layout contain-style",
                  
                  // Markdown content spacing
                  "[&>*:first-child]:mt-0", // No top margin on first element
                  "[&>*:last-child]:mb-0", // No bottom margin on last element
                  
                  // Enhanced nested element containment - LESS AGGRESSIVE
                  "[&_*]:max-w-full [&_*]:min-w-0",
                  "[&_pre]:overflow-hidden [&_code]:break-words",
                  "[&_table]:w-full [&_td]:break-words",
                )}
              >
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={markdownComponents}
                >
                  {plan.markdown}
                </ReactMarkdown>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanPane;