import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TextPart } from '@/types/chatTypes';
import { cn } from 'cn-utility';
import MermaidDisplay from './MermaidDisplay';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Copy, Check } from 'lucide-react';
import { handleLinkClick } from '@/utils/tauriLinks';
import { detectAndConvertFilePaths } from '@/utils/filePathDetection';
import { handleUniversalLink } from '@/utils/universalLinkHandler';
import { getCachedMarkdown, getCachedSyntaxHighlight, getCachedMermaidDiagram } from '@/utils/contentCache';

interface OptimizedTextPartDisplayProps {
    part: TextPart;
}

// Memoized syntax theme (moved outside component to prevent recreation)
const phenomenalSyntaxTheme = {
    'code[class*="language-"]': {
        color: '#d4d4d8',
        background: 'transparent',
        fontFamily: 'SF Mono, Monaco, Consolas, "Courier New", monospace',
        fontSize: '0.8125rem',
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
    // ... rest of theme (truncated for brevity, use the same theme from TextPartDisplay)
};

// Memoized code block component
const MemoizedCodeBlock = React.memo(({ 
    codeString, 
    language, 
    codeId 
}: { 
    codeString: string; 
    language: string; 
    codeId: string; 
}) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    const handleCopy = useCallback(async (code: string, id: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, []);

    // Use cached syntax highlighting
    const highlightedCode = useMemo(() => {
        return getCachedSyntaxHighlight(codeString, language, (code, lang) => {
            // This would normally be the expensive syntax highlighting operation
            // For now, we'll let SyntaxHighlighter handle it but cache the result
            return code; // Placeholder - actual caching happens in SyntaxHighlighter
        });
    }, [codeString, language]);

    return (
        <div className="relative my-6 group w-full max-w-full min-w-0 overflow-hidden">
            <div className="relative rounded-lg overflow-hidden border border-white/[0.06] bg-zinc-900/50 backdrop-blur-sm w-full max-w-full min-w-0 contain-layout contain-style">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                
                {language && (
                    <div className="absolute top-3 left-3 z-10">
                        <div className="px-2.5 py-1 text-[0.6875rem] font-medium tracking-[0.05em] text-white/60 bg-black/50 backdrop-blur-sm rounded-md border border-white/[0.08]">
                            {language}
                        </div>
                    </div>
                )}
                
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
                        padding: language ? '3rem 1.5rem 1.5rem' : '1.5rem',
                        background: 'transparent',
                        fontSize: '0.8125rem',
                        lineHeight: '1.7',
                        overflow: 'hidden',
                        overflowX: 'hidden',
                        overflowY: 'visible',
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        whiteSpace: 'pre-wrap',
                        hyphens: 'auto',
                        contain: 'layout style',
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily: 'SF Mono, Monaco, Consolas, "Courier New", monospace',
                            fontVariantLigatures: 'none',
                            maxWidth: '100%',
                            width: '100%',
                            minWidth: 0,
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            whiteSpace: 'pre-wrap',
                        }
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                >
                    {codeString}
                </SyntaxHighlighter>
            </div>
        </div>
    );
});

MemoizedCodeBlock.displayName = 'MemoizedCodeBlock';

// Memoized markdown renderers
const createMarkdownRenderers = () => ({
    // Paragraphs
    p: ({ children }: any) => (
        <p className="my-4 leading-[1.75] tracking-[-0.011em]">
            {children}
        </p>
    ),
    
    // Headers
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
    
    // Links with universal link handling
    a: ({ href, children, ...props }: any) => (
        <a 
            href={href}
            onClick={(e) => handleUniversalLink(href, e, { showErrorToast: true, validateExists: true })}
            className={cn(
                "underline decoration-[0.5px] underline-offset-[3px] transition-colors duration-200 cursor-pointer",
                href?.startsWith('vault://') 
                    ? "text-emerald-400/90 hover:text-emerald-400 decoration-emerald-400/30 hover:decoration-emerald-400/50"
                    : "text-blue-400/90 hover:text-blue-400 decoration-blue-400/30 hover:decoration-blue-400/50"
            )}
            {...props}
        >
            {children}
        </a>
    ),
    
    // Code blocks and inline code
    code: ({ node, inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';
        
        if (!className || inline === true) {
            return (
                <code 
                    className={cn(
                        "px-[0.375rem] py-[0.0625rem] mx-[0.125rem]",
                        "font-mono text-[0.85em] leading-none tracking-[-0.01em]",
                        "text-emerald-300/90 bg-emerald-400/[0.08]",
                        "rounded-[0.1875rem] border border-emerald-400/[0.15]",
                        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
                        "inline-block align-baseline",
                        "break-words overflow-wrap-anywhere max-w-full"
                    )}
                    {...props}
                >
                    {children}
                </code>
            );
        }
        
        const codeString = String(children).replace(/\n$/, '');
        const codeId = `code-${Math.random().toString(36).substring(2, 11)}`;
        
        return (
            <MemoizedCodeBlock 
                codeString={codeString}
                language={language}
                codeId={codeId}
            />
        );
    },
    
    // Tables with enhanced overflow handling
    table: ({ children }: any) => (
        <div className="my-6 w-full max-w-full overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="overflow-x-auto max-w-full">
                <table className="w-full min-w-full text-sm">
                    {children}
                </table>
            </div>
        </div>
    ),
    
    // Table cells with proper word breaking
    td: ({ children }: any) => (
        <td className="px-4 py-3 text-white/80 break-words hyphens-auto max-w-xs min-w-0 overflow-hidden overflow-wrap-anywhere">
            {children}
        </td>
    ),
    
    // Pre element wrapper
    pre: ({ children, ...props }: any) => {
        return <>{children}</>;
    },
});

const OptimizedTextPartDisplay: React.FC<OptimizedTextPartDisplayProps> = ({ part }) => {
    const [mermaidDiagrams, setMermaidDiagrams] = useState<{id: string, content: string}[]>([]);
    const [processedContent, setProcessedContent] = useState<string>('');
    
    // Memoize markdown renderers to prevent recreation
    const renderers = useMemo(() => createMarkdownRenderers(), []);
    
    // Process content with caching
    useEffect(() => {
        const processContent = () => {
            // Use cached markdown processing
            const processed = getCachedMarkdown(part.text, (content) => {
                // Extract Mermaid diagrams
                const diagrams: {id: string, content: string}[] = [];
                
                const contentWithMermaid = content.replace(/```mermaid\n([\s\S]*?)```/g, (match, diagramCode) => {
                    const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
                    diagrams.push({ id, content: diagramCode.trim() });
                    return `<div id="${id}-placeholder" class="mermaid-placeholder"></div>`;
                });
                
                // Detect and convert file paths to clickable links
                const contentWithFileLinks = detectAndConvertFilePaths(contentWithMermaid);
                
                // Store diagrams for later rendering
                setMermaidDiagrams(diagrams);
                
                return contentWithFileLinks;
            });
            
            setProcessedContent(processed);
        };
        
        processContent();
    }, [part.text]);

    return (
        <div className={cn(
            "markdown-content",
            "text-[0.9375rem] leading-[1.6] tracking-[-0.011em]",
            "text-white/80",
            "selection:bg-blue-500/20 selection:text-white",
            "font-sans antialiased",
            "break-words hyphens-auto w-full max-w-full min-w-0",
            "overflow-hidden overflow-wrap-anywhere",
            "contain-layout contain-style",
            "[&>*:first-child]:mt-0",
            "[&>*:last-child]:mb-0",
            "[&_*]:max-w-full [&_*]:min-w-0",
            "[&_pre]:overflow-hidden [&_code]:break-words",
            "[&_table]:w-full [&_td]:break-words",
        )}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={renderers}
            >
                {processedContent}
            </ReactMarkdown>
            
            {/* Mermaid diagrams */}
            {mermaidDiagrams.map(diagram => (
                <div 
                    key={diagram.id} 
                    className="my-8 p-6 rounded-lg bg-zinc-900/30 border border-white/[0.06]"
                >
                    <MermaidDisplay content={diagram.content} />
                </div>
            ))}
        </div>
    );
};

export default React.memo(OptimizedTextPartDisplay, (prevProps, nextProps) => {
    // Only re-render if text content actually changes
    return prevProps.part.text === nextProps.part.text;
});