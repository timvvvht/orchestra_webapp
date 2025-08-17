
import React from 'react';
import { ToolCall, ToolUsePart } from './types';
import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolChipProps {
  call: ToolCall | ToolUsePart;
  variant?: 'default' | 'compact';
}

const ToolChip: React.FC<ToolChipProps> = ({ call, variant = 'default' }) => {
  const chipClasses = cn(
    'inline-flex items-center gap-1.5 rounded-full',
    variant === 'default' ? 'px-2.5 py-1 text-14' : 'px-2 py-0.5 text-12',
    'bg-neutral-100/80 dark:bg-neutral-800/80',
    'text-neutral-800 dark:text-neutral-200',
    'border border-neutral-200/60 dark:border-neutral-700/60',
    'transition-colors duration-150'
  );
  
  // Extract the tool name based on the type of call object
  const toolName = call.name;
  
  return (
    <div 
      className={chipClasses}
      aria-label={`Tool call: ${toolName}`}
    >
      <Wrench className={variant === 'default' ? 'w-3.5 h-3.5' : 'w-3 h-3'} strokeWidth={2} />
      {toolName}
    </div>
  );
};

export default ToolChip;
