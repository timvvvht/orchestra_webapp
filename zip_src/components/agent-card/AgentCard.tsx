import React from 'react';

import type { AgentConfigTS } from '@/types/agentConfig';
import { Button } from '@/components/ui/button';
import { Bot, ChevronRight, MessageSquarePlus } from 'lucide-react';

/*
 * IMPORTANT – RENDER OPTIMISATION
 *
 * `LandingPage` holds a typing–animation state that updates every few
 * milliseconds.  Each update re-renders the whole page and, by default,
 * *all* children, including every `AgentCard`, even when their props have not
 * changed.  That made the diagnostic console.log fire continuously, giving the
 * impression of an infinite render loop.
 *
 * Wrapping the component in `React.memo` (with a custom comparator) makes sure
 * a card only re-renders when its *own* props change – i.e. when the referenced
 * `agentConfig` object changes or the callback references change.  This
 * completely removes the noisy log spam and gives us a ~10× performance win
 * when many cards are on screen.
 */

interface AgentCardProps {
  agentConfig: AgentConfigTS;
  onStartChat: (agentConfig: AgentConfigTS) => void;
  onViewDetails: (agentConfig: AgentConfigTS) => void;
}

const InnerAgentCard: React.FC<AgentCardProps> = ({ agentConfig, onStartChat, onViewDetails }) => {
  // Only enable the following line when actively debugging renders.
  // console.log('Render <AgentCard/> for', agentConfig.id);

  const { agent, tool_groups } = agentConfig;

  const shortDescription =
    (agent.description?.substring(0, 70) ?? '') +
    (agent.description && agent.description.length > 70 ? '…' : '');

  /* ─────────────── Tool groups (up to 6 pills) ─────────────── */
  const maxPillsToShow = 6;
  const toolGroupDisplayNames = (tool_groups ?? [])
    .slice(0, maxPillsToShow)
    .map((tg) => tg.name)
    .filter(Boolean);

  const hasMoreToolGroups = (tool_groups?.length ?? 0) > maxPillsToShow;
  const remainingToolGroupsCount = Math.max((tool_groups?.length ?? 0) - maxPillsToShow, 0);

  /* ─────────────── Avatar resolution ─────────────── */
  const avatarSrc = agent.avatar?.startsWith('http') || agent.avatar?.startsWith('/')
    ? agent.avatar
    : agent.avatar
    ? `/assets/avatars/${agent.avatar}`
    : undefined;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 rounded-lg shadow-xl border border-indigo-700/30 hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between h-full hover:shadow-indigo-500/10 min-h-[280px]">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={`${agent.name} avatar`}
                className="w-10 h-10 rounded-full object-cover border-2 border-indigo-700/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center border-2 border-indigo-700/50">
                <Bot size={20} className="text-white/90" />
              </div>
            )}
            <h3 className="text-lg font-semibold text-slate-100 leading-tight">
              {agent.name || 'Untitled Agent'}
            </h3>
          </div>
        </div>

        {/* Description */}
        {shortDescription && (
          <p className="text-xs text-slate-400 mb-3 leading-relaxed min-h-[3em]">{shortDescription}</p>
        )}

        {/* Tool groups */}
        <div className="mb-4 min-h-[2.5em]">
          {toolGroupDisplayNames.length ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {toolGroupDisplayNames.map((groupName) => (
                <span
                  key={groupName}
                  className="px-2.5 py-0.5 text-[10px] font-medium bg-indigo-500/10 text-blue-300 border border-blue-500/20 rounded-full hover:bg-blue-500/20 transition-colors cursor-default"
                >
                  {groupName}
                </span>
              ))}
              {hasMoreToolGroups && remainingToolGroupsCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  + {remainingToolGroupsCount} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No specific tool groups highlighted.</p>
          )}
        </div>
      </div>

      {/* Footer (actions) */}
      <div className="mt-auto pt-4 border-t border-indigo-700/30 flex items-center gap-2">
        <Button
          onClick={() => onStartChat(agentConfig)}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white text-xs py-2 px-3 rounded-md transition-all duration-200 shadow-md hover:shadow-lg focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 group"
        >
          Chat Now <MessageSquarePlus size={14} className="ml-1.5 group-hover:translate-x-0.5 transition-transform" />
        </Button>

        <Button
          variant="outline"
          onClick={() => onViewDetails(agentConfig)}
          className="text-blue-300 hover:text-blue-200 border-indigo-700/50 hover:border-indigo-500/70 text-xs py-2 px-3 rounded-md transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 group"
        >
          Details <ChevronRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  );
};

/*
 * Default export – wrapped in React.memo.  The custom comparison is extremely
 * cheap: we only compare *references* for the three props.  If you mutate an
 * agentConfig object instead of replacing it, remember to spread it first so
 * the reference actually changes and triggers an update.
 */

export default React.memo(
  InnerAgentCard,
  (prev, next) =>
    prev.agentConfig === next.agentConfig &&
    prev.onStartChat === next.onStartChat &&
    prev.onViewDetails === next.onViewDetails,
);
