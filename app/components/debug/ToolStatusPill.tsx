import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  XCircle, 
  Loader2
} from 'lucide-react';

export interface ToolStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
}

interface ToolStatusPillProps {
  tool: ToolStatus;
  className?: string;
}

export function ToolStatusPill({ tool, className }: ToolStatusPillProps) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (tool.status !== 'running') return;
    
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - tool.startTime) / 1000));
    }, 100);
    
    return () => window.clearInterval(interval);
  }, [tool.status, tool.startTime]);
  
  const duration = tool.endTime 
    ? Math.floor((tool.endTime - tool.startTime) / 1000)
    : elapsed;
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  const config = {
    running: {
      icon: Loader2,
      bgColor: 'bg-gradient-to-r from-blue-500/10 to-purple-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-300',
      iconColor: 'text-blue-400',
      pulse: true
    },
    completed: {
      icon: CheckCircle,
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      textColor: 'text-green-300',
      iconColor: 'text-green-400',
      pulse: false
    },
    failed: {
      icon: XCircle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      textColor: 'text-red-300',
      iconColor: 'text-red-400',
      pulse: false
    }
  }[tool.status];
  
  const Icon = config.icon;
  
  return (
    <div className={cn("relative inline-flex", className)}>
      {/* Pulse effect for running tools */}
      {config.pulse && (
        <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
      )}
      
      <div className={cn(
        "relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "border transition-all duration-300",
        config.bgColor,
        config.borderColor,
        config.textColor
      )}>
        <Icon className={cn(
          "w-3.5 h-3.5",
          config.iconColor,
          tool.status === 'running' && "animate-spin"
        )} />
        
        <span className="text-xs font-medium">
          {tool.name}
        </span>
        
        {/* Duration */}
        <span className="text-[10px] opacity-60 font-mono">
          {formatDuration(duration)}
        </span>
        
        {/* Status indicator dot */}
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          tool.status === 'running' && "bg-blue-400 animate-pulse",
          tool.status === 'completed' && "bg-green-400",
          tool.status === 'failed' && "bg-red-400"
        )} />
      </div>
    </div>
  );
}