import React from 'react';
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AgentCardProps {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'idle' | 'thinking' | 'tool' | 'error';
  activityPct: number;
  cost?: number;
  compact?: boolean;
  onClick?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  name, 
  role, 
  avatar, 
  status, 
  activityPct = 0,
  cost = 0,
  compact = false,
  onClick
}) => {
  const statusColor = {
    idle: 'bg-green-500',
    thinking: 'bg-yellow-400',
    tool: 'bg-blue-400',
    error: 'bg-red-500'
  }[status];

  const statusText = {
    idle: 'Idle',
    thinking: 'Thinking',
    tool: 'Using tool',
    error: 'Error'
  }[status];

  const isImageUrl = avatar.startsWith('http') || avatar.startsWith('/');
  const initial = name.charAt(0).toUpperCase();

  // Compact mode: shrink width, single row, no roles/status text
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-muted/30 focus:outline-none min-w-0"
              onClick={onClick}
              aria-label={`Agent ${name} (${statusText})`}
              style={{minWidth: 0}}
            >
              <div className="relative w-6 h-6 mr-1">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                  {isImageUrl ? (
                    <img 
                      src={avatar} 
                      alt={`${name} avatar`} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>
                <span className={`absolute -bottom-0.5 left-1/2 w-2 h-0.5 rounded ${statusColor}`} style={{transform: 'translateX(-50%)'}} />
              </div>
              <span className="text-xs max-w-[62px] truncate">{name}</span>
              {/* Show cost as badge if relevant */}
              {cost > 0 && (
                <span className="ml-1 text-[10px] text-green-500 font-mono">${cost.toFixed(2)}</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-sm">{name} ({role})</p>
            <p className="text-xs text-muted-foreground">{statusText}</p>
            {cost > 0 && (
              <p className="text-xs text-green-500">Cost today: ${cost.toFixed(2)}</p>
            )}
            <p className="text-xs italic mt-1">Click to open</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Normal (dashboard) version
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="w-20 h-24 rounded-lg bg-muted/60 hover:bg-muted transition-all duration-200 group flex flex-col items-center justify-start p-2 hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={onClick}
            aria-label={`Agent ${name}, ${role}, ${statusText}`}
          >
            {/* Heat ring + avatar */}
            <div className="relative">
              <svg width={44} height={44} className="absolute top-0 left-0 rotate-[-90deg] transition-all duration-300">
                <circle
                  cx={22} cy={22} r={20}
                  stroke="var(--muted)" 
                  strokeWidth={3} 
                  fill="none"
                  className="opacity-50"
                />
                {activityPct > 0 && (
                  <circle
                    cx={22} cy={22} r={20}
                    stroke="var(--green-500)"
                    strokeWidth={3} 
                    fill="none"
                    strokeDasharray={`${125.6 * activityPct/100} 125.6`}
                    strokeLinecap="round"
                    className="transition-[stroke-dasharray] duration-300"
                  />
                )}
              </svg>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                {isImageUrl ? (
                  <img 
                    src={avatar} 
                    alt={`${name} avatar`} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
            </div>

            {/* Role chip + status */}
            <div className="flex items-center mt-2 gap-1.5">
              <span className="px-2 py-0.5 bg-background rounded text-[10px] font-medium">
                {role}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
            </div>

            {/* Name */}
            <span className="text-[11px] text-muted-foreground truncate max-w-full mt-1">
              {name}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">{name} ({role})</p>
          <p className="text-xs text-muted-foreground">{statusText}</p>
          {cost > 0 && (
            <p className="text-xs text-green-500">Cost today: ${cost.toFixed(2)}</p>
          )}
          <p className="text-xs italic mt-1">Click to open</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AgentCard;