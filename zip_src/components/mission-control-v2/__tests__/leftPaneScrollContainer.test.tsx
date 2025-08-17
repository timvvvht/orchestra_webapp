import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useDraftStore } from '@/stores/draftStore';
import { useMissionControlArchive } from '@/hooks/useMissionControlArchive';
import { useAuth } from '@/auth/AuthContext';
import LayoutSplit from '../LayoutSplit';

// Mock all dependencies
vi.mock('@/stores/missionControlStore');
vi.mock('@/stores/draftStore');
vi.mock('@/hooks/useMissionControlArchive');
vi.mock('@/auth/AuthContext');
vi.mock('@/utils/environment', () => ({
  isTauri: () => false
}));
vi.mock('@/utils/projectStorage', () => ({
  recentProjectsManager: {}
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn()
  }
}));

const mockUseMissionControlStore = useMissionControlStore as ReturnType<typeof vi.fn>;
const mockUseDraftStore = useDraftStore as ReturnType<typeof vi.fn>;
const mockUseMissionControlArchive = useMissionControlArchive as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('Left Pane Scroll Container', () => {
  beforeEach(() => {
    mockUseMissionControlStore.mockReturnValue({
      selectedSession: null,
      viewMode: 'active',
      setViewMode: vi.fn(),
      getGroupedSessions: () => ({ processing: [], idle: [] }),
      collapsedGroups: {},
      isSessionUnread: () => false,
      setShowNewDraftModal: vi.fn(),
      setInitialDraftCodePath: vi.fn(),
      sessions: [], // Add sessions array for CwdFilterDropdown
      cwdFilter: null,
      setCwdFilter: vi.fn(),
    });

    mockUseDraftStore.mockReturnValue({
      getDraftsArray: () => []
    });

    mockUseMissionControlArchive.mockReturnValue({
      archiveSession: vi.fn(),
      unarchiveSession: vi.fn()
    });

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      setShowModal: vi.fn()
    });
  });

  it('left wrapper is the scroll container', () => {
    render(<div style={{ height: '600px' }}><LayoutSplit /></div>);
    const left = screen.getByTestId('mc-left-wrapper');
    expect(left).toBeInTheDocument();
    // Tailwind class presence — JSDOM cannot compute CSSOM styles
    expect(left.className).toMatch(/overflow-y-auto/);
    expect(left.className).toMatch(/h-full/);
  });
});