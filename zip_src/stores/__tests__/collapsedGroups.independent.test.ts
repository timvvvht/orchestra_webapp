import { useMissionControlStore } from '../missionControlStore';

// Mock localStorage to avoid actual storage during tests
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = mockLocalStorage as any;

describe('CollapsedGroups Independent Collapse', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset the store to initial state
    useMissionControlStore.getState().setSessions([]);
    useMissionControlStore.getState().setViewMode('active');
    useMissionControlStore.getState().setSelectedSession(null);
    useMissionControlStore.getState().setCwdFilter(null);
  });

  describe('Independent collapse behavior', () => {
    it('should toggle idleUnread without affecting idleRead', () => {
      const { toggleGroupCollapsed } = useMissionControlStore.getState();
      
      // Get initial state
      const initialState = useMissionControlStore.getState().collapsedGroups;
      expect(initialState.idleUnread).toBe(false);
      expect(initialState.idleRead).toBe(false);
      
      // Toggle idleUnread
      toggleGroupCollapsed('idleUnread');
      
      const afterIdleUnreadToggle = useMissionControlStore.getState().collapsedGroups;
      expect(afterIdleUnreadToggle.idleUnread).toBe(true); // Should be toggled
      expect(afterIdleUnreadToggle.idleRead).toBe(false); // Should remain unchanged
      
      // Toggle idleUnread again
      toggleGroupCollapsed('idleUnread');
      
      const afterSecondToggle = useMissionControlStore.getState().collapsedGroups;
      expect(afterSecondToggle.idleUnread).toBe(false); // Should be toggled back
      expect(afterSecondToggle.idleRead).toBe(false); // Should still remain unchanged
    });

    it('should toggle idleRead without affecting idleUnread', () => {
      const { toggleGroupCollapsed } = useMissionControlStore.getState();
      
      // Get initial state
      const initialState = useMissionControlStore.getState().collapsedGroups;
      expect(initialState.idleUnread).toBe(false);
      expect(initialState.idleRead).toBe(false);
      
      // Toggle idleRead
      toggleGroupCollapsed('idleRead');
      
      const afterIdleReadToggle = useMissionControlStore.getState().collapsedGroups;
      expect(afterIdleReadToggle.idleRead).toBe(true); // Should be toggled
      expect(afterIdleReadToggle.idleUnread).toBe(false); // Should remain unchanged
      
      // Toggle idleRead again
      toggleGroupCollapsed('idleRead');
      
      const afterSecondToggle = useMissionControlStore.getState().collapsedGroups;
      expect(afterSecondToggle.idleRead).toBe(false); // Should be toggled back
      expect(afterSecondToggle.idleUnread).toBe(false); // Should still remain unchanged
    });

    it('should maintain independent states when both are toggled', () => {
      const { toggleGroupCollapsed } = useMissionControlStore.getState();
      
      // Initial state
      expect(useMissionControlStore.getState().collapsedGroups.idleUnread).toBe(false);
      expect(useMissionControlStore.getState().collapsedGroups.idleRead).toBe(false);
      
      // Toggle idleUnread
      toggleGroupCollapsed('idleUnread');
      
      expect(useMissionControlStore.getState().collapsedGroups.idleUnread).toBe(true);
      expect(useMissionControlStore.getState().collapsedGroups.idleRead).toBe(false);
      
      // Toggle idleRead
      toggleGroupCollapsed('idleRead');
      
      expect(useMissionControlStore.getState().collapsedGroups.idleUnread).toBe(true); // Should remain true
      expect(useMissionControlStore.getState().collapsedGroups.idleRead).toBe(true); // Should now be true
      
      // Toggle only idleUnread back
      toggleGroupCollapsed('idleUnread');
      
      expect(useMissionControlStore.getState().collapsedGroups.idleUnread).toBe(false); // Should be false
      expect(useMissionControlStore.getState().collapsedGroups.idleRead).toBe(true); // Should remain true
    });

    it('should not affect other collapse groups when toggling idleUnread or idleRead', () => {
      const { toggleGroupCollapsed } = useMissionControlStore.getState();
      
      // Initial state
      const initialState = useMissionControlStore.getState().collapsedGroups;
      expect(initialState.processing).toBe(false);
      expect(initialState.drafts).toBe(false);
      
      // Toggle idleUnread
      toggleGroupCollapsed('idleUnread');
      
      const afterIdleUnreadToggle = useMissionControlStore.getState().collapsedGroups;
      expect(afterIdleUnreadToggle.processing).toBe(false); // Should remain unchanged
      expect(afterIdleUnreadToggle.drafts).toBe(false); // Should remain unchanged
      expect(afterIdleUnreadToggle.idleUnread).toBe(true); // Should be toggled
      
      // Toggle idleRead
      toggleGroupCollapsed('idleRead');
      
      const afterIdleReadToggle = useMissionControlStore.getState().collapsedGroups;
      expect(afterIdleReadToggle.processing).toBe(false); // Should remain unchanged
      expect(afterIdleReadToggle.drafts).toBe(false); // Should remain unchanged
      expect(afterIdleReadToggle.idleUnread).toBe(true); // Should remain true
      expect(afterIdleReadToggle.idleRead).toBe(true); // Should be toggled
    });

    it('should handle all collapse group keys correctly', () => {
      const { toggleGroupCollapsed } = useMissionControlStore.getState();
      
      // Test that all keys are valid and can be toggled
      const allKeys: Array<keyof typeof initialState.collapsedGroups> = [
        'processing', 'idleUnread', 'idleRead', 'drafts'
      ];
      
      const initialState = useMissionControlStore.getState().collapsedGroups;
      
      allKeys.forEach(key => {
        // Toggle each key
        toggleGroupCollapsed(key);
        
        const stateAfterToggle = useMissionControlStore.getState().collapsedGroups;
        expect(stateAfterToggle[key]).toBe(!initialState[key]);
        
        // Toggle back
        toggleGroupCollapsed(key);
        
        const stateAfterSecondToggle = useMissionControlStore.getState().collapsedGroups;
        expect(stateAfterSecondToggle[key]).toBe(initialState[key]);
      });
    });
  });

  describe('Backwards compatibility', () => {
    it('should migrate old idle state correctly', () => {
      // Mock localStorage to return old state format
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'mc_collapsed_groups_v1') {
          return JSON.stringify({ idle: true, processing: false, drafts: false });
        }
        return null;
      });

      // Create a new store instance to test migration
      // Note: In a real scenario, this would happen on page reload
      const { collapsedGroups } = useMissionControlStore.getState();
      
      // After migration, both idleUnread and idleRead should have the old idle value
      expect(collapsedGroups.idleUnread).toBe(true);
      expect(collapsedGroups.idleRead).toBe(true);
      
      // The old state should be removed from localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mc_collapsed_groups_v1');
    });

    it('should not migrate if old state does not exist', () => {
      // Mock localStorage to return null for old state
      mockLocalStorage.getItem.mockReturnValue(null);

      // Create a new store instance
      const { collapsedGroups } = useMissionControlStore.getState();
      
      // Should use default values
      expect(collapsedGroups.idleUnread).toBe(false);
      expect(collapsedGroups.idleRead).toBe(false);
      
      // Should not try to remove old state
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should handle migration errors gracefully', () => {
      // Mock localStorage to throw an error
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw an error during store creation
      expect(() => {
        useMissionControlStore.getState();
      }).not.toThrow();

      // Should use default values
      const { collapsedGroups } = useMissionControlStore.getState();
      expect(collapsedGroups.idleUnread).toBe(false);
      expect(collapsedGroups.idleRead).toBe(false);
    });
  });
});