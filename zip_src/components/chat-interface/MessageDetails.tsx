import React from 'react';
import { ChatMessage, ToolUsePart, ToolResultPart } from '@/components/chat/types';
import { Card } from '@/components/ui/card';
import { Terminal, Brain, ArrowRight } from 'lucide-react';

interface MessageDetailsProps {
  message: ChatMessage;
}

const MessageDetails: React.FC<MessageDetailsProps> = ({ message }) => {
  // Extract tool-related parts from the content array for new format messages
  const toolUseParts: ToolUsePart[] = Array.isArray(message.content)
    ? message.content.filter(part => part.type === 'tool_use') as ToolUsePart[]
    : [];
    
  const toolResultParts: ToolResultPart[] = Array.isArray(message.content)
    ? message.content.filter(part => part.type === 'tool_result') as ToolResultPart[]
    : [];
  return (
    <Card className="mt-2 mb-3 p-3 text-13 bg-[#F5F5F7] border border-neutral-200 rounded-xl">
      {message.reasoning && message.reasoning.length > 0 && (
        <div className="mb-3">
          <h4 className="font-medium mb-2 text-neutral-800 flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-[#0B84FE]" />
            Reasoning
          </h4>
          <div className="space-y-1.5 text-neutral-600 pl-5">
            {message.reasoning.map((step, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-[#0B84FE] font-medium shrink-0">{index + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render tool calls - first check new format, then fall back to legacy format */}
      {toolUseParts.length > 0 ? (
        // Render tool calls from new format
        toolUseParts.map((toolUsePart, index) => (
          <div key={`tool-use-${index}`}>
            <h4 className="font-medium mb-2 text-neutral-800 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-[#0B84FE]" />
              Tool Call
            </h4>
            <div className="bg-white p-3 rounded-lg font-mono text-12 overflow-x-auto border border-neutral-200">
              <div className="text-neutral-500 mb-1">// Tool ID: {toolUsePart.id}</div>
              <div>
                <span className="text-purple-600">function</span>
                <span className="text-[#0B84FE]"> {toolUsePart.name}</span>
                <span>(</span>
                <span className="text-neutral-800">
                  {typeof toolUsePart.input === 'string' 
                    ? toolUsePart.input 
                    : JSON.stringify(toolUsePart.input, null, 2)}
                </span>
                <span>)</span>
              </div>
            </div>
          </div>
        ))
      ) : message.toolCall ? (
        // Fall back to legacy format
        <div>
          <h4 className="font-medium mb-2 text-neutral-800 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-[#0B84FE]" />
            Tool Call (Legacy)
          </h4>
          <div className="bg-white p-3 rounded-lg font-mono text-12 overflow-x-auto border border-neutral-200">
            <div className="text-neutral-500 mb-1">// Tool ID: {message.toolCall.id}</div>
            <div>
              <span className="text-purple-600">function</span>
              <span className="text-[#0B84FE]"> {message.toolCall.name}</span>
              <span>(</span>
              <span className="text-neutral-800">
                {message.toolCall.arguments}
              </span>
              <span>)</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Render tool results - first check new format, then fall back to legacy format */}
      {toolResultParts.length > 0 ? (
        // Render tool results from new format
        toolResultParts.map((toolResultPart, index) => (
          <div key={`tool-result-${index}`} className="mt-3">
            <h4 className="font-medium mb-2 text-neutral-800 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-[#0B84FE]" />
              Tool Result {toolResultPart.is_error && <span className="text-red-500 ml-1">(Error)</span>}
            </h4>
            <div className={`bg-white p-3 rounded-lg font-mono text-12 overflow-x-auto border ${toolResultPart.is_error ? 'border-red-200 bg-red-50/30' : 'border-neutral-200'}`}>
              <div className="text-neutral-500 mb-1">// For tool call ID: {toolResultPart.tool_use_id}</div>
              <pre className="whitespace-pre-wrap">{toolResultPart.content}</pre>
            </div>
          </div>
        ))
      ) : message.toolResult ? (
        // Fall back to legacy format
        <div className="mt-3">
          <h4 className="font-medium mb-2 text-neutral-800 flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-[#0B84FE]" />
            Tool Result (Legacy)
          </h4>
          <div className="bg-white p-3 rounded-lg font-mono text-12 overflow-x-auto border border-neutral-200">
            <pre className="whitespace-pre-wrap">{message.toolResult.content}</pre>
          </div>
        </div>
      ) : null}
    </Card>
  );
};

export default MessageDetails;