import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AgentListPanel from '@/components/mission-control-v2/AgentListPanel';
import { useMissionControlStore } from '@/stores/missionControlStore';

const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  } as Storage;
};

const mkSession = (id: string, status: string, t: string) => ({
  id,
  mission_title: id,
  status,
  last_message_at: t,
  created_at: t,
  agent_config_name: null,
  model_id: null,
  latest_message_id: null,
  latest_message_role: null,
  latest_message_content: null,
  latest_message_timestamp: t,
  agent_cwd: null,
  base_dir: null,
  archived_at: null
});

describe('AgentListPanel processing order stays stable', () => {
  beforeEach(() => {
    (global as any).localStorage = createMockLocalStorage();
    useMissionControlStore.setState({
      sessions: [],
      processingOrder: [],
      readMap: {},
      plans: {},
      planProgress: {},
      gitStatus: {},
      gitStatusErrors: {},
      viewMode: 'active',
      selectedSession: null,
      cwdFilter: null,
      collapsedGroups: { processing: false, idleUnread: false, idleRead: false, drafts: false },
      showNewDraftModal: false,
      planRefetchCallback: null,
      sessionRefetchCallback: null
    } as any);
  });

  it('renders processing list in stable append order', async () => {
    const store = useMissionControlStore.getState();
    const a = mkSession('A', 'working', new Date(1).toISOString());
    const b = mkSession('B', 'working', new Date(2).toISOString());
    store.setSessions([a]);
    store.ensureInProcessingOrder('A');
    store.setSessions([a, b]);
    store.ensureInProcessingOrder('B');

    render(<AgentListPanel />);

    // Find all cards by data attribute order
    const panel = await screen.findByTestId('agent-list-panel');
    const cards = panel.querySelectorAll('[data-session-id]');
    const ids = Array.from(cards).map(el => el.getAttribute('data-session-id'));
    // Expect A before B somewhere within the list (processing section first)
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'));

    // Simulate activity that could change timestamps
    store.updateSession('B', { last_message_at: new Date(3).toISOString() });
    store.updateSession('A', { last_message_at: new Date(4).toISOString() });

    // Re-render and ensure order is still stable
    render(<AgentListPanel />);
    const panel2 = await screen.findByTestId('agent-list-panel');
    const cards2 = panel2.querySelectorAll('[data-session-id]');
    const ids2 = Array.from(cards2).map(el => el.getAttribute('data-session-id'));
    expect(ids2.indexOf('A')).toBeLessThan(ids2.indexOf('B'));
  });
});
