import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitFork, Calendar, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ForkInfo } from '@/types/chatTypes';

interface ForksListProps {
  sessionId: string;
  className?: string;
  onCreateFork?: () => void;
}

/**
 * ForksList - Shows all forks of a conversation
 * 
 * Features:
 * - Lists all direct forks of the current conversation
 * - Shows fork creation dates and display titles
 * - Clickable navigation to fork sessions
 * - Option to create new forks
 * - Empty state when no forks exist
 */
export function ForksList({ sessionId, className = '', onCreateFork }: ForksListProps) {
  const navigate = useNavigate();
  const { getConversationForks } = useChatStore();
  const [forks, setForks] = useState<ForkInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load forks when component mounts or sessionId changes
  useEffect(() => {
    const loadForks = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const forksData = await getConversationForks(sessionId);
        setForks(forksData);
      } catch (err) {
        console.error('[ForksList] Error loading forks:', err);
        setError('Failed to load conversation forks');
      } finally {
        setIsLoading(false);
      }
    };

    loadForks();
  }, [sessionId, getConversationForks]);

  const handleNavigateToFork = (forkId: string) => {
    navigate(`/workbench/${forkId}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <GitFork className="w-5 h-5 text-primary" />
            <span>Conversation Forks</span>
            {forks.length > 0 && (
              <span className="text-sm text-muted-foreground">({forks.length})</span>
            )}
          </div>
          {onCreateFork && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateFork}
              className="flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>New Fork</span>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span>Loading forks...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-destructive">
            <span>{error}</span>
          </div>
        ) : forks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GitFork className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No forks yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Create alternative conversation paths by forking from any message in this conversation.
            </p>
            {onCreateFork && (
              <Button
                variant="outline"
                onClick={onCreateFork}
                className="flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Fork</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {forks.map((fork, index) => (
                <motion.div
                  key={fork.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-between p-4 h-auto',
                      'hover:bg-primary/5 hover:border-primary/20',
                      'border border-border/50 rounded-lg',
                      'transition-all duration-200'
                    )}
                    onClick={() => handleNavigateToFork(fork.id)}
                  >
                    <div className="flex flex-col items-start space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 w-full">
                        <GitFork className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-medium truncate">
                          {fork.name}
                        </span>
                      </div>
                      
                      {fork.displayTitle && (
                        <p className="text-sm text-muted-foreground text-left truncate w-full">
                          {fork.displayTitle}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Created {formatDate(fork.createdAt)}</span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ForksList;