import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, GitFork, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';
import { useNavigate } from 'react-router-dom';
import type { ConversationAncestry } from '@/types/chatTypes';

interface ForkNavigationProps {
  sessionId: string;
  className?: string;
}

/**
 * ForkNavigation - Shows breadcrumb navigation for forked conversations
 * 
 * Features:
 * - Displays ancestry chain from root to current session
 * - Clickable breadcrumbs for navigation
 * - Visual indicators for fork relationships
 * - Responsive design that collapses on smaller screens
 */
export function ForkNavigation({ sessionId, className = '' }: ForkNavigationProps) {
  const navigate = useNavigate();
  const { getForkAncestry, chats } = useChatStore();
  const [ancestry, setAncestry] = useState<ConversationAncestry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSession = chats[sessionId];
  const isForkedSession = currentSession?.parentSessionId;

  // Load ancestry when component mounts or sessionId changes
  useEffect(() => {
    if (!isForkedSession) {
      setAncestry([]);
      return;
    }

    const loadAncestry = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const ancestryData = await getForkAncestry(sessionId);
        setAncestry(ancestryData);
      } catch (err) {
        console.error('[ForkNavigation] Error loading ancestry:', err);
        setError('Failed to load conversation ancestry');
      } finally {
        setIsLoading(false);
      }
    };

    loadAncestry();
  }, [sessionId, isForkedSession, getForkAncestry]);

  // Don't render if this is not a forked session
  if (!isForkedSession) {
    return null;
  }

  const handleNavigateToSession = (ancestorId: string) => {
    navigate(`/workbench/${ancestorId}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'border-b border-border/50 bg-background/50 backdrop-blur-sm',
          className
        )}
      >
        <div className="px-4 py-2">
          {isLoading ? (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span>Loading conversation path...</span>
            </div>
          ) : error ? (
            <div className="flex items-center space-x-2 text-sm text-destructive">
              <GitFork className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-sm">
              <GitFork className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground mr-2">Forked from:</span>
              
              {/* Breadcrumb navigation */}
              <nav className="flex items-center space-x-1 overflow-x-auto">
                {ancestry.map((ancestor, index) => {
                  const isLast = index === ancestry.length - 1;
                  const isRoot = ancestor.depthLevel === 0;
                  
                  return (
                    <React.Fragment key={ancestor.id}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleNavigateToSession(ancestor.id)}
                        className={cn(
                          'flex items-center space-x-1 px-2 py-1 rounded-md transition-colors',
                          'hover:bg-primary/10 hover:text-primary',
                          'focus:outline-none focus:ring-2 focus:ring-primary/20',
                          isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}
                        title={ancestor.displayTitle || ancestor.name}
                      >
                        {isRoot && <Home className="w-3 h-3" />}
                        <span className="truncate max-w-[120px]">
                          {ancestor.displayTitle || ancestor.name}
                        </span>
                      </motion.button>
                      
                      {!isLast && (
                        <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
                
                {/* Current session indicator */}
                <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                <div className="flex items-center space-x-1 px-2 py-1 bg-primary/10 text-primary rounded-md">
                  <span className="truncate max-w-[120px] font-medium">
                    {currentSession?.displayTitle || currentSession?.name || 'Current'}
                  </span>
                </div>
              </nav>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ForkNavigation;