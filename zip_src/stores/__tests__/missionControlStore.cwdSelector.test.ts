import { useMissionControlStore } from '@/stores/missionControlStore';

// Mock the store for testing
const mockStore = useMissionControlStore.getState();

describe('getSelectedAgentCwd', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMissionControlStore.setState({
      sessions: [],
      selectedSession: null,
    });
  });

  it('should return null when no session is selected', () => {
    const cwd = useMissionControlStore.getState().getSelectedAgentCwd();
    expect(cwd).toBeNull();
  });

  it('should return null when selected session does not exist', () => {
    useMissionControlStore.setState({
      sessions: [
        { id: 'session1', agent_cwd: '/path/to/session1' } as any,
      ],
      selectedSession: 'nonexistent',
    });

    const cwd = useMissionControlStore.getState().getSelectedAgentCwd();
    expect(cwd).toBeNull();
  });

  it('should return agent_cwd when session is selected and exists', () => {
    const expectedCwd = '/Users/tim/Code/orchestra/.orchestra/worktrees/abc';
    useMissionControlStore.setState({
      sessions: [
        { id: 'session1', agent_cwd: '/path/to/session1' } as any,
        { id: 'session2', agent_cwd: expectedCwd } as any,
      ],
      selectedSession: 'session2',
    });

    const cwd = useMissionControlStore.getState().getSelectedAgentCwd();
    expect(cwd).toBe(expectedCwd);
  });

  it('should return null when selected session has null agent_cwd', () => {
    useMissionControlStore.setState({
      sessions: [
        { id: 'session1', agent_cwd: null } as any,
      ],
      selectedSession: 'session1',
    });

    const cwd = useMissionControlStore.getState().getSelectedAgentCwd();
    expect(cwd).toBeNull();
  });

  it('should return null when selected session has undefined agent_cwd', () => {
    useMissionControlStore.setState({
      sessions: [
        { id: 'session1', agent_cwd: undefined } as any,
      ],
      selectedSession: 'session1',
    });

    const cwd = useMissionControlStore.getState().getSelectedAgentCwd();
    expect(cwd).toBeNull();
  });
});