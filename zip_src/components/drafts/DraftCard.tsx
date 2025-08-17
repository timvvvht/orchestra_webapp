import React from 'react';
import { DraftIssue } from '@/stores/draftStore';

interface DraftCardProps {
  draft: DraftIssue;
  onSend: () => void;
  onDelete: () => void;
}

const DraftCardComponent: React.FC<DraftCardProps> = ({ draft, onSend, onDelete }) => {
  const formatTimeAgo = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="group relative cursor-pointer transition-all duration-200">
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:bg-white/[0.05] hover:border-white/20 hover:shadow-[0_8px_32px_rgba(255,255,255,0.03)] p-4">
        <div className="flex items-start gap-3">
          {/* Badge */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-300 text-sm">📝</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Draft</span>
              <span className="text-xs text-white/30">{formatTimeAgo(draft.createdAt)}</span>
            </div>
            <p className="text-sm text-white/80 line-clamp-2 break-words mb-2">{draft.content}</p>
            <p className="text-xs text-white/40 break-all">{draft.codePath}</p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onDelete} className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-md">Delete</button>
          <button onClick={onSend} className="px-3 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-md">Send</button>
        </div>
      </div>
    </div>
  );
};

// Memoize DraftCard to prevent unnecessary re-renders when parent updates
// but draft data hasn't changed
const DraftCard = React.memo(DraftCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.draft.id === nextProps.draft.id &&
    prevProps.draft.content === nextProps.draft.content &&
    prevProps.draft.createdAt === nextProps.draft.createdAt &&
    prevProps.draft.codePath === nextProps.draft.codePath &&
    prevProps.onSend === nextProps.onSend &&
    prevProps.onDelete === nextProps.onDelete
  );
});

export default DraftCard;
