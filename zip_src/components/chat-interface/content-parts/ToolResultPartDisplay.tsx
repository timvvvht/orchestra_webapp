import React from 'react';
import { ToolResultPart } from '@/components/chat/types';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ToolResultPartDisplayProps {
    part: ToolResultPart;
}

const ToolResultPartDisplay: React.FC<ToolResultPartDisplayProps> = ({ part }) => {
    const isError = part.is_error;
    
    return (
        <div className={cn(
            "rounded-md border overflow-hidden",
            isError 
                ? "border-red-300 bg-red-50 dark:border-red-800/50 dark:bg-red-900/10" 
                : "border-green-300 bg-green-50 dark:border-green-800/50 dark:bg-green-900/10"
        )}>
            <div className={cn(
                "flex items-center gap-2 p-2 border-b",
                isError 
                    ? "border-red-300 bg-red-100/50 dark:border-red-800/50 dark:bg-red-900/20" 
                    : "border-green-300 bg-green-100/50 dark:border-green-800/50 dark:bg-green-900/20"
            )}>
                {isError ? (
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                ) : (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                )}
                
                <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded border",
                    isError 
                        ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/50" 
                        : "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800/50"
                )}>
                    Tool Result
                </span>
                
                {isError && <span className="text-sm font-medium text-red-600 dark:text-red-400">Error</span>}
                
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    For call ID: {part.tool_use_id.substring(0, 8)}...
                </span>
            </div>
            
            <div className="p-2">
                <pre className={cn(
                    "text-xs font-mono whitespace-pre-wrap break-all",
                    "max-h-40 overflow-y-auto p-2 rounded border",
                    "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent",
                    isError
                        ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30"
                        : "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30"
                )}>
                    {typeof part.content === 'string' ? part.content : JSON.stringify(part.content, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default ToolResultPartDisplay;