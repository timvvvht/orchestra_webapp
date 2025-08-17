import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMissionControlStore } from '../missionControlStore';
import { Plan } from '@/types/plans';

// Mock supabase
vi.mock('@/auth/SupabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock plan progress analyzer
vi.mock('@/utils/planProgress', () => ({
  analyzePlanProgressDetailed: vi.fn((markdown: string) => ({
    total: 3,
    checked: 1,
    unchecked: 2,
    percent: 33.33,
    bar: '███░░░░░░░',
    status: 'in_progress',
    items: []
  }))
}));

describe('missionControlStore.refetchSinglePlan', () => {
  const mockPlanA: Plan = {
    id: 'plan-a',
    session_id: 'session-a',
    title: 'Plan A',
    status: 'active',
    markdown: '# Plan A\n- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3',
    version: 1,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
  };

  const mockPlanB: Plan = {
    id: 'plan-b',
    session_id: 'session-b',
    title: 'Plan B',
    status: 'active',
    markdown: '# Plan B\n- [ ] Task A\n- [ ] Task B',
    version: 1,
    created_at: '2024-01-01T11:00:00Z',
    updated_at: '2024-01-01T11:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset store state
    useMissionControlStore.setState({
      plans: {
        'session-a': mockPlanA,
        'session-b': mockPlanB
      },
      planProgress: {
        'session-a': { total: 3, checked: 1, unchecked: 2, percent: 33.33, bar: '███░░░░░░░', status: 'in_progress', items: [] },
        'session-b': { total: 2, checked: 0, unchecked: 2, percent: 0, bar: '░░░░░░░░░░', status: 'not_started', items: [] }
      }
    });
  });

  it('should update only the targeted session plan and progress', async () => {
    // Mock successful supabase response for session-a
    const updatedPlanA = {
      ...mockPlanA,
      markdown: '# Plan A Updated\n- [x] Task 1\n- [x] Task 2\n- [ ] Task 3',
      version: 2
    };

    const { supabase } = await import('@/auth/SupabaseClient');
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: updatedPlanA,
      error: null
    });
    const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useMissionControlStore());

    // Call refetchSinglePlan for session-a
    await act(async () => {
      await result.current.refetchSinglePlan('session-a');
    });

    // Verify supabase was called correctly
    expect(supabase.from).toHaveBeenCalledWith('plans');
    expect(mockSelect).toHaveBeenCalledWith('id, session_id, title, status, markdown, current_version, created_at, updated_at');
    expect(mockEq).toHaveBeenCalledWith('session_id', 'session-a');
    expect(mockMaybeSingle).toHaveBeenCalled();

    // Verify only session-a was updated
    const state = result.current;
    expect(state.plans['session-a']).toEqual(updatedPlanA);
    expect(state.plans['session-b']).toEqual(mockPlanB); // Unchanged

    // Verify progress was recalculated for session-a
    expect(state.planProgress['session-a']).toEqual({
      total: 3,
      checked: 1,
      unchecked: 2,
      percent: 33.33,
      bar: '███░░░░░░░',
      status: 'in_progress',
      items: []
    });

    // Verify session-b progress unchanged
    expect(state.planProgress['session-b']).toEqual({
      total: 2,
      checked: 0,
      unchecked: 2,
      percent: 0,
      bar: '░░░░░░░░░░',
      status: 'not_started',
      items: []
    });
  });

  it('should handle supabase errors gracefully', async () => {
    // Mock supabase error
    const { supabase } = await import('@/auth/SupabaseClient');
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        }))
      }))
    });

    const { result } = renderHook(() => useMissionControlStore());
    const initialState = { ...result.current };

    // Call refetchSinglePlan
    await act(async () => {
      await result.current.refetchSinglePlan('session-a');
    });

    // Verify state unchanged on error
    expect(result.current.plans).toEqual(initialState.plans);
    expect(result.current.planProgress).toEqual(initialState.planProgress);
  });

  it('should handle missing plan gracefully', async () => {
    // Mock no plan found
    const { supabase } = await import('@/auth/SupabaseClient');
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }))
      }))
    });

    const { result } = renderHook(() => useMissionControlStore());
    const initialState = { ...result.current };

    // Call refetchSinglePlan
    await act(async () => {
      await result.current.refetchSinglePlan('nonexistent-session');
    });

    // Verify state unchanged when no plan found
    expect(result.current.plans).toEqual(initialState.plans);
    expect(result.current.planProgress).toEqual(initialState.planProgress);
  });

  it('should handle empty sessionId gracefully', async () => {
    const { result } = renderHook(() => useMissionControlStore());
    const initialState = { ...result.current };

    // Call refetchSinglePlan with empty sessionId
    await act(async () => {
      await result.current.refetchSinglePlan('');
    });

    // Verify supabase was not called
    const { supabase } = await import('@/auth/SupabaseClient');
    expect(supabase.from).not.toHaveBeenCalled();

    // Verify state unchanged
    expect(result.current.plans).toEqual(initialState.plans);
    expect(result.current.planProgress).toEqual(initialState.planProgress);
  });

  it('should handle exceptions gracefully', async () => {
    // Mock supabase exception
    const { supabase } = await import('@/auth/SupabaseClient');
    (supabase.from as any).mockImplementation(() => {
      throw new Error('Network error');
    });

    const { result } = renderHook(() => useMissionControlStore());
    const initialState = { ...result.current };

    // Call refetchSinglePlan
    await act(async () => {
      await result.current.refetchSinglePlan('session-a');
    });

    // Verify state unchanged on exception
    expect(result.current.plans).toEqual(initialState.plans);
    expect(result.current.planProgress).toEqual(initialState.planProgress);
  });
});