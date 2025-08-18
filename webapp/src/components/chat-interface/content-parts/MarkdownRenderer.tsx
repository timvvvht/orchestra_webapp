import React, { useState } from 'react';
import { cn } from 'cn-utility';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: 'default' | 'think-block';
}

// Phenomenal syntax theme - optimized for think blocks
const phenomenalSyntaxTheme = {
  'code[class*="language-"]': {
    color: '#d4d4d8', // Base text - zinc-300
    background: 'transparent',
    fontFamily: 'SF Mono, Monaco, Consolas, "Courier New", monospace',
    fontSize: '0.8125rem', // 13px
    lineHeight: '1.6',
    direction: 'ltr',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    wordSpacing: 'normal',
    wordBreak: 'break-word',
    wordWrap: 'break-word',
    overflowWrap: 'anywhere',
    tabSize: 4,
    hyphens: 'auto',
    letterSpacing: '0.025em',
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
  
  // Keywords - vibrant purple
  'keyword': { 
    color: '#a855f7', // purple-500
    fontWeight: '500',
  },
  'operator': { color: '#a855f7' },
  'boolean': { color: '#a855f7' },
  'null': { color: '#a855f7' },
  'undefined': { color: '#a855f7' },
  
  // Strings - warm green
  'string': { 
    color: '#22c55e', // green-500
  },
  'char': { color: '#22c55e' },
  'regex': { color: '#22c55e' },
  
  // Numbers - bright blue
  'number': { 
    color: '#3b82f6', // blue-500
  },
  
  // Functions - bright cyan
  'function': { 
    color: '#06b6d4', // cyan-500
    fontWeight: '500',
  },
  'function-name': { color: '#06b6d4' },
  'method': { color: '#06b6d4' },
  
  // Classes and types - orange
  'class-name': { 
    color: '#f97316', // orange-500
    fontWeight: '500',
  },
  'type': { color: '#f97316' },
  'interface': { color: '#f97316' },
  
  // Variables - soft yellow
  'variable': { 
    color: '#eab308', // yellow-500
  },
  'property': { color: '#eab308' },
  'property-access': { color: '#eab308' },
  
  // Punctuation - muted
  'punctuation': { 
    color: '#9ca3af', // gray-400
  },
  'bracket': { color: '#9ca3af' },
  'brace': { color: '#9ca3af' },
  
  // Tags (HTML/XML) - pink
  'tag': { 
    color: '#ec4899', // pink-500
  },
  'tag .token.punctuation': { color: '#ec4899' },
  'attr-name': { color: '#ec4899' },
  'attr-value': { color: '#22c55e' },
  
  // Special tokens
  'important': { 
    color: '#ef4444', // red-500
    fontWeight: 'bold',
  },
  'bold': { fontWeight: 'bold' },
  'italic': { fontStyle: 'italic' },
  'entity': { cursor: 'help' },
  'url': { color: '#06b6d4' },
  
  // Language-specific
  'selector': { color: '#ec4899' },
  'atrule': { color: '#a855f7' },
  'rule': { color: '#a855f7' },
  'pseudo-class': { color: '#a855f7' },
  'pseudo-element': { color: '#a855f7' },
  
  'unit': { color: '#3b82f6' },
  'hexcode': { color: '#22c55e' },
  
  // Diff highlighting
  'inserted': { 
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  'deleted': { 
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className,
  variant = 'default'
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const renderers = {
    // Headings - clean hierarchy
    h1: ({ children }: any) => (
      <h1 className={cn(
        "text-xl font-semibold mb-4 mt-6 first:mt-0",
        variant === 'think-block' ? "text-purple-200" : "text-white"
      )}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className={cn(
        "text-lg font-semibold mb-3 mt-5 first:mt-0",
        variant === 'think-block' ? "text-purple-200" : "text-white"
      )}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className={cn(
        "text-base font-semibold mb-2 mt-4 first:mt-0",
        variant === 'think-block' ? "text-purple-200" : "text-white"
      )}>
        {children}
      </h3>
    ),

    // Paragraphs - comfortable spacing
    p: ({ children }: any) => (
      <p className={cn(
        "mb-4 last:mb-0 leading-relaxed",
        variant === 'think-block' ? "text-purple-200/80" : "text-white/80"
      )}>
        {children}
      </p>
    ),

    // Code blocks - sophisticated with copy functionality
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');
      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

      if (!inline && language) {
        return (
          <div className={cn(
            "relative group my-4 rounded-lg overflow-hidden",
            "bg-black/20 border",
            variant === 'think-block' 
              ? "border-purple-500/20" 
              : "border-white/[0.08]"
          )}>
            {/* Header with language and copy button */}
            <div className={cn(
              "flex items-center justify-between px-4 py-2 text-xs",
              "border-b",
              variant === 'think-block'
                ? "bg-purple-500/[0.08] border-purple-500/20 text-purple-300"
                : "bg-white/[0.02] border-white/[0.08] text-white/60"
            )}>
              <span className="font-medium">{language}</span>
              <button
                onClick={() => copyToClipboard(codeString, codeId)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
                  variant === 'think-block'
                    ? "hover:bg-purple-500/20 text-purple-300 hover:text-purple-200"
                    : "hover:bg-white/10 text-white/60 hover:text-white/80"
                )}
              >
                {copiedCode === codeId ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Code content */}
            <div className="overflow-x-auto">
              <SyntaxHighlighter
                style={phenomenalSyntaxTheme}
                language={language}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.8125rem',
                  lineHeight: '1.6',
                  maxWidth: '100%',
                  width: '100%',
                  minWidth: 0,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
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
      }

      // Inline code
      return (
        <code
          className={cn(
            "px-1.5 py-0.5 rounded text-sm font-mono",
            variant === 'think-block'
              ? "bg-purple-500/20 text-purple-200 border border-purple-500/30"
              : "bg-white/10 text-white/90 border border-white/20"
          )}
          {...props}
        >
          {children}
        </code>
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
    li: ({ children, checked, ...props }: any) => {
      // Task list items
      if (typeof checked === 'boolean') {
        return (
          <li className="flex items-start gap-2 -ml-6 list-none">
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className={cn(
                "mt-[0.375rem] w-3.5 h-3.5 rounded-[0.1875rem]",
                "transition-colors duration-200 cursor-default",
                variant === 'think-block'
                  ? "bg-purple-500/[0.08] border border-purple-500/30 checked:bg-purple-500 checked:border-purple-500"
                  : "bg-white/[0.04] border border-white/20 checked:bg-blue-500 checked:border-blue-500"
              )}
            />
            <span className={cn(
              "flex-1",
              checked && "line-through opacity-60"
            )}>
              {children}
            </span>
          </li>
        );
      }

      // Regular list items
      return (
        <li className={cn(
          "list-none relative",
          variant === 'think-block' ? "text-purple-200/80" : "text-white/80"
        )}>
          <span className={cn(
            "absolute -left-5",
            variant === 'think-block' ? "text-purple-400/60" : "text-white/40"
          )}>
            •
          </span>
          {children}
        </li>
      );
    },

    // Blockquotes - elegant styling
    blockquote: ({ children }: any) => (
      <blockquote className={cn(
        "my-4 pl-4 border-l-2 italic",
        variant === 'think-block'
          ? "border-purple-500/40 text-purple-200/70"
          : "border-white/20 text-white/70"
      )}>
        {children}
      </blockquote>
    ),

    // Tables - clean and readable
    table: ({ children }: any) => (
      <div className="my-4 overflow-x-auto">
        <table className={cn(
          "w-full border-collapse",
          variant === 'think-block'
            ? "border border-purple-500/20"
            : "border border-white/20"
        )}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className={cn(
        "px-3 py-2 text-left font-semibold border-b",
        variant === 'think-block'
          ? "bg-purple-500/[0.08] border-purple-500/20 text-purple-200"
          : "bg-white/[0.02] border-white/20 text-white/90"
      )}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className={cn(
        "px-3 py-2 border-b",
        variant === 'think-block'
          ? "border-purple-500/20 text-purple-200/80"
          : "border-white/20 text-white/80"
      )}>
        {children}
      </td>
    ),

    // Links - subtle but accessible
    a: ({ children, href, ...props }: any) => (
      <a
        href={href}
        className={cn(
          "underline transition-colors",
          variant === 'think-block'
            ? "text-purple-300 hover:text-purple-200"
            : "text-blue-400 hover:text-blue-300"
        )}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),

    // Horizontal rules
    hr: () => (
      <hr className={cn(
        "my-6 border-0 h-px",
        variant === 'think-block'
          ? "bg-purple-500/20"
          : "bg-white/20"
      )} />
    ),

    // Pre tags - just pass through to code handler
    pre: ({ children }: any) => {
      return <>{children}</>;
    },
  };

  return (
    <div className={cn(
      "markdown-content",
      "text-sm leading-relaxed tracking-[-0.011em]",
      "break-words hyphens-auto w-full max-w-full min-w-0",
      "overflow-hidden overflow-wrap-anywhere",
      "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      "[&_*]:max-w-full [&_*]:min-w-0",
      "[&_pre]:overflow-hidden [&_code]:break-words",
      "[&_table]:w-full [&_td]:break-words",
      className
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={renderers}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;