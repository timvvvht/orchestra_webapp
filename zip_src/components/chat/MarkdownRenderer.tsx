
import React from 'react';

interface MarkdownRendererProps {
  markdown: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown }) => {
  const formattedText = markdown
    .replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 dark:text-blue-400 underline">$1</a>'
    )
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-xs font-mono">$1</code>');

  return (
    <div 
      className="whitespace-pre-wrap leading-relaxed"
      dangerouslySetInnerHTML={{ __html: formattedText }}
    />
  );
};

export default MarkdownRenderer;
