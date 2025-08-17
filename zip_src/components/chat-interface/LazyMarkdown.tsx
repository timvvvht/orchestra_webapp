import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { messageContentCache } from '@/utils/messageContentCache';

interface LazyMarkdownProps {
  content: string;
  messageId?: string;
  messageTimestamp?: number;
  className?: string;
}

/**
 * LazyMarkdown - Renders markdown content with lazy loading and caching
 * Only processes markdown when the component is visible in the viewport
 */
const LazyMarkdown: React.FC<LazyMarkdownProps> = ({
  content,
  messageId,
  messageTimestamp,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [processedContent, setProcessedContent] = useState<React.ReactNode | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only need to process once
        }
      },
      { 
        rootMargin: '100px', // Start processing 100px before visible
        threshold: 0.01 
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  // Process markdown when visible
  useEffect(() => {
    if (!isVisible || processingRef.current || processedContent) return;

    processingRef.current = true;

    // Check cache first
    if (messageId && messageTimestamp) {
      const cached = messageContentCache.get(messageId, messageTimestamp);
      if (cached) {
        setProcessedContent(
          <div className={className}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom link renderer for @file: links
                a: ({ node, href, children, ...props }) => {
                  // Check if this is a @file: link
                  if (href && href.startsWith('@file:')) {
                    const filePath = href.substring(6); // Remove '@file:' prefix
                    const fileName = filePath.split('/').pop() || filePath;
                    
                    return (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        title={filePath}
                        onClick={() => {
                          // Optional: Add click handler to open file or copy path
                          navigator.clipboard?.writeText(filePath);
                        }}
                        {...props}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        {children || fileName}
                      </span>
                    );
                  }
                  
                  // Regular link
                  return <a href={href} {...props}>{children}</a>;
                }
              }}
            >
              {cached.markdown}
            </ReactMarkdown>
          </div>
        );
        processingRef.current = false;
        return;
      }
    }

    // Process in next idle callback to avoid blocking
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const processed = (
          <div className={className}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Optimize code blocks
                code: ({ node, inline, className, children, ...props }) => {
                  if (inline) {
                    return <code className={className} {...props}>{children}</code>;
                  }
                  
                  // For code blocks, defer syntax highlighting
                  return (
                    <pre className={className}>
                      <code {...props}>{children}</code>
                    </pre>
                  );
                },
                // Custom link renderer for @file: links
                a: ({ node, href, children, ...props }) => {
                  // Check if this is a @file: link
                  if (href && href.startsWith('@file:')) {
                    const filePath = href.substring(6); // Remove '@file:' prefix
                    const fileName = filePath.split('/').pop() || filePath;
                    
                    return (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        title={filePath}
                        onClick={() => {
                          // Optional: Add click handler to open file or copy path
                          navigator.clipboard?.writeText(filePath);
                        }}
                        {...props}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        {children || fileName}
                      </span>
                    );
                  }
                  
                  // Regular link
                  return <a href={href} {...props}>{children}</a>;
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        );
        
        setProcessedContent(processed);
        
        // Cache the result
        if (messageId && messageTimestamp) {
          messageContentCache.set(messageId, messageTimestamp, {
            markdown: content,
            codeBlocks: []
          });
        }
        
        processingRef.current = false;
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        const processed = (
          <div className={className}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom link renderer for @file: links
                a: ({ node, href, children, ...props }) => {
                  // Check if this is a @file: link
                  if (href && href.startsWith('@file:')) {
                    const filePath = href.substring(6); // Remove '@file:' prefix
                    const fileName = filePath.split('/').pop() || filePath;
                    
                    return (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        title={filePath}
                        onClick={() => {
                          // Optional: Add click handler to open file or copy path
                          navigator.clipboard?.writeText(filePath);
                        }}
                        {...props}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        {children || fileName}
                      </span>
                    );
                  }
                  
                  // Regular link
                  return <a href={href} {...props}>{children}</a>;
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        );
        
        setProcessedContent(processed);
        processingRef.current = false;
      }, 0);
    }
  }, [isVisible, content, messageId, messageTimestamp, className, processedContent]);

  // Show placeholder while loading
  if (!processedContent) {
    return (
      <div ref={ref} className={className}>
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    );
  }

  return <div ref={ref}>{processedContent}</div>;
};

export default React.memo(LazyMarkdown);