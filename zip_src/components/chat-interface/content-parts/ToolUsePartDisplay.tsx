import React from 'react';
import { ToolUsePart } from '@/components/chat/types';
import { cn } from '@/lib/utils';
import { Code } from 'lucide-react';

interface ToolUsePartDisplayProps {
    part: ToolUsePart;
}

const ToolUsePartDisplay: React.FC<ToolUsePartDisplayProps> = ({ part }) => {
    return (
        <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <Code className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/50">
                    Tool Call
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{part.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    ID: {part.id.substring(0, 8)}...
                </span>
            </div>
            <div className="p-2">
                <pre className={cn(
                    "text-xs font-mono whitespace-pre-wrap break-all",
                    "max-h-40 overflow-y-auto p-2 rounded",
                    "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700",
                    "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                )}>
                    {typeof part.input === 'string' ? part.input : JSON.stringify(part.input, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default ToolUsePartDisplay;