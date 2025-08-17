import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronUp } from 'lucide-react';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  totalLoaded: number;
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onLoadMore,
  isLoading,
  hasMore,
  totalLoaded
}) => {
  if (!hasMore) {
    return (
      <div className="flex justify-center py-2 text-sm text-muted-foreground">
        All messages loaded ({totalLoaded} total)
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onLoadMore}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
        {isLoading ? 'Loading...' : `Load more messages`}
      </Button>
    </div>
  );
};