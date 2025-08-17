
import React from 'react';
import { cn } from '@/lib/utils';
import type { Agent } from '@/data/mockWhatsappData';
import CachedResourceImage from '@/components/CachedResourceImage';

interface ChatListItemProps {
  agent: Agent;
  selected?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

const ChatListItem = ({
  agent,
  selected,
  onClick,
  collapsed = false
}: ChatListItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full py-2.5 px-3 flex items-center gap-3 transition-all duration-200 rounded-xl",
        selected 
          ? "bg-surface-1 shadow-sm" 
          : "hover:bg-surface-1/70",
        collapsed ? "justify-center" : "text-left"
      )}
    >
      <div className={cn(
        "relative rounded-full flex items-center justify-center shrink-0 overflow-hidden",
        collapsed ? "w-10 h-10" : "w-11 h-11",
        selected 
          ? "ring-2 ring-border shadow-sm" 
          : "ring-1 ring-border/50"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-brand-100 opacity-30" />
        {agent.avatarType === 'resource' ? (
          <CachedResourceImage 
            path={agent.avatar} 
            alt={agent.name} 
            className="absolute inset-0 w-full h-full object-cover"
            showPlaceholder={true}
            onError={(error) => console.error(`ChatListItem: Failed to load avatar for ${agent.name}:`, error)}
          />
        ) : (
          <span className="relative text-xl">{agent.avatar}</span>
        )}
        
        {!collapsed && agent.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground font-medium flex items-center justify-center">
            {agent.unreadCount}
          </span>
        )}
      </div>
      
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-foreground truncate">{agent.name}</p>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {new Date(agent.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className={cn(
              "text-xs truncate",
              agent.unreadCount > 0 
                ? "text-foreground font-medium" 
                : "text-muted-foreground"
            )}>
              {agent.lastMessage}
            </p>
            {collapsed && agent.unreadCount > 0 && (
              <span className="ml-2 w-2 h-2 rounded-full bg-primary" />
            )}
          </div>
        </div>
      )}
    </button>
  );
};

export default ChatListItem;
