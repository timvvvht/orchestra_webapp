import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlansBySession } from '../planService';
import { PlanRow } from '@/types/planTypes';

// Mock the supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('planService', () => {
  const mockSupabase = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup the chain of mocked methods
    mockSupabase.order.mockReturnValue({ data: [], error: null });
    mockSupabase.eq.mockReturnValue({ order: mockSupabase.order });
    mockSupabase.select.mockReturnValue({ eq: mockSupabase.eq });
    mockSupabase.from.mockReturnValue({ select: mockSupabase.select });
    
    // Mock the imported supabase client
    const { supabase } = require('../supabaseClient');
    supabase.from = mockSupabase.from;
  });

  describe('getPlansBySession', () => {
    it('should call supabase with correct parameters', async () => {
      const sessionId = 'test-session-123';
      
      await getPlansBySession(sessionId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('plans');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('session_id', sessionId);
      expect(mockSupabase.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('should return empty array when no plans found', async () => {
      mockSupabase.order.mockReturnValue({ data: [], error: null });
      
      const result = await getPlansBySession('test-session-123');
      
      expect(result).toEqual([]);
    });

    it('should return plans data when found', async () => {
      const mockPlans: PlanRow[] = [
        {
          id: 'plan-1',
          title: 'Test Plan',
          status: 'draft',
          markdown: '# Test Plan\nThis is a test.',
          current_version: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          session_id: 'test-session-123'
        }
      ];
      
      mockSupabase.order.mockReturnValue({ data: mockPlans, error: null });
      
      const result = await getPlansBySession('test-session-123');
      
      expect(result).toEqual(mockPlans);
    });

    it('should throw error when supabase returns error', async () => {
      const mockError = { message: 'Database connection failed' };
      mockSupabase.order.mockReturnValue({ data: null, error: mockError });
      
      await expect(getPlansBySession('test-session-123')).rejects.toThrow(
        'Failed to fetch plans for session test-session-123: Database connection failed'
      );
    });

    it('should handle null data gracefully', async () => {
      mockSupabase.order.mockReturnValue({ data: null, error: null });
      
      const result = await getPlansBySession('test-session-123');
      
      expect(result).toEqual([]);
    });
  });
});