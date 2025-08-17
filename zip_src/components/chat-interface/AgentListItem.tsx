import React, { useState, useMemo } from 'react';
import { SessionMeta } from '@/types/chatTypes';
import { useChatUI } from '@/context/ChatUIContext';
import { cn } from '@/lib/utils';
import { MoreVertical, Trash2, GripVertical, MessageSquare, GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,  
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';

interface AgentListItemProps {
  session: SessionMeta;
  selected: boolean;
  collapsed: boolean;
  editMode: boolean;
  onClick: () => void;
}

// Generate a vibrant gradient based on agent ID
const generateGradientStyle = (id: string) => {
  // Use the agent ID to seed the gradient colors
  // This ensures the same agent always gets the same gradient
  const hash = id.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Generate vibrant colors for the gradient
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40 + (hash % 180)) % 360; // Offset for complementary feel
  
  // High saturation and lightness for vibrant look
  const saturation = 80 + (hash % 20); // 80-100%
  const lightness1 = 55 + (hash % 15); // 55-70%
  const lightness2 = 60 + ((hash >> 4) % 15); // 60-75%
  
  // Random angle for the gradient
  const angle = (hash % 360);
  
  return {
    background: `linear-gradient(${angle}deg, hsl(${hue1}, ${saturation}%, ${lightness1}%), hsl(${hue2}, ${saturation}%, ${lightness2}%))`
  };
};

// Format time ago helper
const formatTimeAgo = (timestamp: number): string => {
  // Handle invalid timestamps gracefully
  if (isNaN(timestamp) || timestamp === 0) {
    return 'Unknown date';
  }
  
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const AgentListItem = React.forwardRef<HTMLDivElement, AgentListItemProps>(({
  session,
  selected,
  collapsed,
  editMode,
  onClick,
}, ref) => {
  const chatUI = useChatUI();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Memoize the gradient style to avoid recalculation on re-renders
  const gradientStyle = useMemo(() => generateGradientStyle(session.id), [session.id]);

  const handleDeleteInitiate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
    setIsDropdownOpen(false); // Close dropdown when dialog opens
  };

  const confirmDelete = async () => {
    if (chatUI.isLoading) return;
    
    try {
      console.log(`Attempting to delete session: ${session.id} - ${session.name}`);
      await chatUI.deleteSession(session.id);
      console.log(`Session deleted successfully: ${session.id}`);
      toast.success('Chat deleted');
    } catch (error) {
      console.error(`Failed to delete session ${session.id}:`, error);
      toast.error('Failed to delete chat');
    }
    setIsDeleteDialogOpen(false);
  };



  return (
    <>
      <motion.div
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl cursor-pointer transition-all duration-200",
          "hover:bg-white/10",
          selected && "bg-white/10 shadow-lg shadow-[#007AFF]/20",
          collapsed ? "p-0 h-12 w-12 justify-center" : "py-3 px-4",
          editMode && "py-2"
        )}
        onClick={onClick}
      >
        {editMode && !collapsed && (
          <GripVertical className="h-4 w-4 text-white/30 cursor-grab shrink-0" />
        )}
        
        {!collapsed && (
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Top row: Avatar + Title/Timestamp */}
            <div className="flex items-start gap-3">
              {/* Avatar with Apple-style gradient */}
              <div className="relative shrink-0 h-10 w-10">
                <div className="absolute inset-0 rounded-xl opacity-30 blur-md" style={gradientStyle} />
                <div
                  aria-label={`${session.name}'s avatar`}
                  className="relative rounded-xl h-full w-full flex items-center justify-center shadow-md"
                  style={gradientStyle}
                >
                  {session.parent_session_id && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute -top-1 -left-1 bg-background/70 backdrop-blur-sm p-0.5 rounded-full">
                            <GitFork className="h-2.5 w-2.5 text-blue-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="bg-accent text-accent-foreground text-xs">
                          <p>Forked Conversation</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <MessageSquare className="h-5 w-5 text-white/80" />
                </div>
              </div>
              
              {/* Title and timestamp */}
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-medium text-sm truncate",
                  selected ? "text-white" : "text-white/90"
                )}>
                  {session.display_title || session.name}
                </h3>
                <p className={cn(
                  "text-xs mt-0.5",
                  selected ? "text-white/70" : "text-white/50"
                )}>
                  {formatTimeAgo(session.lastUpdated)}
                </p>
              </div>
            </div>
            
            {/* Full width status/message area - placeholder for future use */}
            {/* This section can be expanded when status/latest message functionality is added */}
            
            {/* Full width plan area - placeholder for future use */}
            {/* This section can be expanded when plan functionality is added */}
          </div>
        )}
        
        {collapsed && (
          /* Avatar with Apple-style gradient for collapsed state */
          <div className="relative shrink-0 h-7 w-7">
            <div className="absolute inset-0 rounded-xl opacity-30 blur-md" style={gradientStyle} />
            <div
              aria-label={`${session.name}'s avatar`}
              className="relative rounded-xl h-full w-full flex items-center justify-center shadow-md"
              style={gradientStyle}
            >
              <MessageSquare className="h-4 w-4 text-white/80" />
            </div>
          </div>
        )}

        {/* 3-dot menu - Appears on hover (if not collapsed/editMode) or if dropdown is open */}
        {!collapsed && !editMode && (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
                  isDropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  // DropdownMenuTrigger will handle open/close
                }}
                aria-label={`Options for session ${session.name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side="bottom" 
              align="end"
              onClick={(e) => e.stopPropagation()} // Prevent item click from closing immediately due to parent onClick
            >
              <DropdownMenuItem
                onClick={handleDeleteInitiate}
                className="text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!bg-destructive/10 focus:!text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Session
              </DropdownMenuItem>
              {/* Add other items here e.g. Rename Session */}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>

      {/* Alert Dialog for Delete Confirmation (now triggered from DropdownMenuItem) */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the chat session
              "{session.name}" and all of its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

AgentListItem.displayName = 'AgentListItem';

export default AgentListItem;