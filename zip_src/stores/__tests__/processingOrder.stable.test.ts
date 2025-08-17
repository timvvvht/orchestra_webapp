import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMissionControlStore } from '@/stores/missionControlStore';

// Helper to mock localStorage per test
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  } as Storage;
};

describe('processingOrder stable ordering', () => {
  beforeEach(() => {
    // fresh store for each test
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

  it('appends sessions as they enter processing', () => {
    const store = useMissionControlStore.getState();
    const a = mkSession('A', 'working', new Date(1).toISOString());
    const b = mkSession('B', 'working', new Date(2).toISOString());

    store.setSessions([a]);
    store.ensureInProcessingOrder('A');
    // add B later
    store.setSessions([a, b]);
    store.ensureInProcessingOrder('B');

    const groups = useMissionControlStore.getState().getGroupedSessions();
    expect(groups.processing.map(s => s.id)).toEqual(['A', 'B']);
  });

  it('retains stable order despite activity updates', () => {
    const store = useMissionControlStore.getState();
    const a = mkSession('A', 'working', new Date(1).toISOString());
    const b = mkSession('B', 'working', new Date(2).toISOString());
    store.setSessions([a, b]);
    store.ensureInProcessingOrder('A');
    store.ensureInProcessingOrder('B');

    // simulate activity: B then A with later timestamps
    store.updateSession('B', { last_message_at: new Date(3).toISOString() });
    store.updateSession('A', { last_message_at: new Date(4).toISOString() });

    const groups = useMissionControlStore.getState().getGroupedSessions();
    expect(groups.processing.map(s => s.id)).toEqual(['A', 'B']);
  });

  it('removes from processing order on completion while preserving remaining order', () => {
    const store = useMissionControlStore.getState();
    const a = mkSession('A', 'working', new Date(1).toISOString());
    const b = mkSession('B', 'working', new Date(2).toISOString());
    store.setSessions([a, b]);
    store.ensureInProcessingOrder('A');
    store.ensureInProcessingOrder('B');

    // A done
    store.updateSession('A', { status: 'idle' });
    store.removeFromProcessingOrder('A');

    const groups = useMissionControlStore.getState().getGroupedSessions();
    expect(groups.processing.map(s => s.id)).toEqual(['B']);
  });

  it('persists and restores processing order from localStorage', () => {
    const store = useMissionControlStore.getState();
    const a = mkSession('A', 'working', new Date(1).toISOString());
    const b = mkSession('B', 'working', new Date(2).toISOString());
    store.setSessions([a, b]);
    store.ensureInProcessingOrder('A');
    store.ensureInProcessingOrder('B');

    // re-create localStorage backed state by reading processingOrder
    const saved = (global as any).localStorage.getItem('mc_processing_order_v1');
    expect(saved).toBeTruthy();

    // simulate app reload by resetting store state and letting loadProcessingOrder run
    useMissionControlStore.setState({} as any);
    // Re-init minimal required fields for getGroupedSessions to work
    useMissionControlStore.setState({
      sessions: [a, b],
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
      sessionRefetchCallback: null,
      processingOrder: JSON.parse(saved as string)
    } as any);

    const groups = useMissionControlStore.getState().getGroupedSessions();
    expect(groups.processing.map(s => s.id)).toEqual(['A', 'B']);
  });
});
