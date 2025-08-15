import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Brain, ChevronDown, Sparkles } from 'lucide-react';

interface ThinkBlockProps {
  content: string;
  timestamp: number;
  id: string;
  defaultExpanded?: boolean;
}

export function ThinkBlockDisplay({ content, timestamp, id: _id, defaultExpanded = false }: ThinkBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  // Parse the content to identify structured thinking patterns
  const lines = content.split('\n').filter(line => line.trim());
  
  return (
    <div className="relative group">
      {/* Subtle glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 
                      rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      
      <div className="relative">
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3",
            "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
            "border border-blue-500/20 rounded-xl",
            "hover:from-blue-500/15 hover:to-purple-500/15",
            "transition-all duration-200",
            expanded && "rounded-b-none"
          )}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="relative">
              <Brain className="w-5 h-5 text-blue-400" />
              <Sparkles className="w-3 h-3 text-purple-400 absolute -top-1 -right-1" />
            </div>
            <span className="text-xs text-blue-400/60">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <ChevronDown className={cn(
            "w-4 h-4 text-blue-400 transition-transform duration-200",
            !expanded && "-rotate-90"
          )} />
        </button>
        
        {expanded && (
          <div className="px-4 py-4 bg-gradient-to-b from-blue-500/5 to-transparent 
                        border-x border-b border-blue-500/20 rounded-b-xl">
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const isNumbered = /^\d+\./.test(line.trim());
                const isBullet = /^[-•*]/.test(line.trim());
                const isIndented = line.startsWith('  ') || line.startsWith('\t');
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "text-sm leading-relaxed",
                      isNumbered && "flex gap-3",
                      isBullet && "flex gap-3 ml-4",
                      isIndented && "ml-8",
                      !isNumbered && !isBullet && !isIndented && "text-blue-100/80"
                    )}
                  >
                    {isNumbered && (
                      <>
                        <span className="text-blue-400 font-mono flex-shrink-0">
                          {line.match(/^\d+/)?.[0]}.
                        </span>
                        <span className="text-blue-100/90">
                          {line.replace(/^\d+\.\s*/, '')}
                        </span>
                      </>
                    )}
                    {isBullet && (
                      <>
                        <span className="text-purple-400 flex-shrink-0">•</span>
                        <span className="text-blue-100/90">
                          {line.replace(/^[-•*]\s*/, '')}
                        </span>
                      </>
                    )}
                    {!isNumbered && !isBullet && (
                      <span className={cn(
                        "block",
                        line.includes(':') && "font-medium text-blue-200"
                      )}>
                        {line}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}