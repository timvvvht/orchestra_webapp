import React, { useMemo } from 'react';
import MCSection from '../sections/MCSection';
import AgentCard from '../cards/AgentCard';
import DraftCard from '../cards/DraftCard';

interface AgentListPanelProps {
  agents: any[];
  drafts: any[];
  selectedSession: string | null;
  onAgentSelect: (agentId: string) => void;
  onAgentArchive: (agentId: string) => void;
  onAgentUnarchive?: (agentId: string) => void;
  onDraftSend: (draft: any) => void;
  onDraftDelete?: (draftId: string) => void;
  viewMode: 'active' | 'archived';
}

/**
 * Left panel component that displays agents and drafts organized by status.
 * Handles grouping, filtering, and rendering of agent/draft cards within sections.
 * 
 * @param agents - List of agents to display
 * @param drafts - List of drafts to display
 * @param selectedSession - Currently selected session ID
 * @param onAgentSelect - Callback when agent is selected
 * @param onAgentArchive - Callback when agent is archived
 * @param onAgentUnarchive - Callback when agent is unarchived
 * @param onDraftSend - Callback when draft is sent
 * @param onDraftDelete - Callback when draft is deleted
 * @param viewMode - Current view mode ('active' or 'archived')
 */
const AgentListPanel: React.FC<AgentListPanelProps> = ({
  agents,
  drafts,
  selectedSession,
  onAgentSelect,
  onAgentArchive,
  onAgentUnarchive,
  onDraftSend,
  onDraftDelete,
  viewMode,
}) => {
  // Group agents by status
  const groupedAgents = useMemo(() => {
    const groups: Record<string, any[]> = {
      working: [],
      idle: [],
      error: [],
    };

    agents.forEach(agent => {
      const status = agent.status || 'idle';
      if (status === 'processing' || status === 'creating') {
        groups.working.push(agent);
      } else if (status === 'error') {
        groups.error.push(agent);
      } else {
        groups.idle.push(agent);
      }
    });

    return groups;
  }, [agents]);

  const renderAgentSection = (title: string, agents: any[], isCollapsed = false) => {
    if (agents.length === 0) return null;

    return (
      <MCSection
        title={`${title} (${agents.length})`}
        isCollapsed={isCollapsed}
      >
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedSession === agent.id}
            onClick={() => onAgentSelect(agent.id)}
            onArchive={() => onAgentArchive(agent.id)}
            onUnarchive={onAgentUnarchive ? () => onAgentUnarchive(agent.id) : undefined}
            viewMode={viewMode}
          />
        ))}
      </MCSection>
    );
  };

  return (
    <div className="agent-list-panel">
      {/* Drafts Section */}
      {drafts.length > 0 && (
        <MCSection title={`Drafts (${drafts.length})`}>
          {drafts.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onSend={() => onDraftSend(draft)}
              onDelete={onDraftDelete ? () => onDraftDelete(draft.id) : undefined}
            />
          ))}
        </MCSection>
      )}

      {/* Agent Sections */}
      {viewMode === 'active' ? (
        <>
          {renderAgentSection('Working', groupedAgents.working)}
          {renderAgentSection('Ready', groupedAgents.idle)}
          {renderAgentSection('Error', groupedAgents.error)}
        </>
      ) : (
        <>
          {renderAgentSection('Archived', agents)}
        </>
      )}

      {/* Empty State */}
      {agents.length === 0 && drafts.length === 0 && (
        <div className="empty-state">
          <p>No {viewMode} agents or drafts</p>
        </div>
      )}
    </div>
  );
};

export default AgentListPanel;