
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChatMessage } from './types';
import { cn } from '@/lib/utils';

interface MessageDrawerProps {
  message: ChatMessage;
}

const MessageDrawer: React.FC<MessageDrawerProps> = ({ message }) => {
  return (
    <div 
      className="ml-12 rounded-lg surface-2 p-4 text-14 animate-scale-in"
      role="region" 
      aria-label="Message details"
    >
      <div className="mt-0 h-px w-full bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-30 mb-3" />
      
      <Tabs defaultValue="reasoning">
        <TabsList className="bg-neutral-100/50 dark:bg-neutral-800/50 mb-3">
          <TabsTrigger value="reasoning" className="text-14">Reasoning</TabsTrigger>
          <TabsTrigger value="toolcalls" className="text-14">Tool Calls</TabsTrigger>
          <TabsTrigger value="rawtokens" className="text-14">Raw Tokens</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reasoning" className="mt-0">
          <div className="space-y-3 text-14 text-neutral-600 dark:text-neutral-400">
            {message.reasoning && message.reasoning.length > 0 ? (
              <ol className="list-decimal list-inside space-y-2 pl-4">
                {message.reasoning.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : (
              <p>No reasoning steps available for this message.</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="toolcalls" className="mt-0">
          <div className="space-y-3 text-14 text-neutral-600 dark:text-neutral-400">
            {message.toolCall ? (
              <div>
                <div className="rounded-md bg-neutral-100/70 dark:bg-neutral-800/70 p-3 border border-neutral-200/60 dark:border-neutral-700/60">
                  <p className="mb-2 font-mono text-brand-600 dark:text-brand-400 font-medium">{message.toolCall.name}</p>
                  <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-14 leading-relaxed font-mono">{message.toolCall.arguments}</pre>
                </div>
                
                {message.toolResult && (
                  <div className="mt-4">
                    <p className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">Result:</p>
                    <pre className="rounded-md bg-neutral-100/70 dark:bg-neutral-800/70 p-3 border border-neutral-200/60 dark:border-neutral-700/60 max-h-48 overflow-y-auto text-14 font-mono">{message.toolResult.content}</pre>
                  </div>
                )}
              </div>
            ) : (
              <p>No tool calls in this message</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="rawtokens" className="mt-0">
          <div className="rounded-md bg-neutral-100/70 dark:bg-neutral-800/70 p-3 border border-neutral-200/60 dark:border-neutral-700/60 font-mono text-14 text-neutral-600 dark:text-neutral-400 overflow-x-auto">
            <p>Raw token stream will appear here when available</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MessageDrawer;
