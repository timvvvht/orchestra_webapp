import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgentCard from '../AgentCard';
import { MissionControlAgent } from '@/stores/missionControlStore';

// Mock dependencies
vi.mock('@/stores/missionControlStore', () => ({
  useMissionControlStore: () => ({
    selectedSession: 'test-session-1', // This session is selected
    setSelectedSession: vi.fn(),
    plans: {},
    planProgress: {},
    markSessionRead: vi.fn(),
    isSessionUnread: () => false,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('AgentCard Final Preview in Split Mode', () => {
  const mockFinalAgent: MissionControlAgent = {
    id: 'test-session-1', // Matches selectedSession in mock
    mission_title: 'Completed Session',
    status: 'idle',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    agent_config_name: 'general',
    model_id: 'claude-3',
    latest_message_id: 'msg-final',
    latest_message_role: 'assistant',
    latest_message_content: 'All done. Here are the implementation details for the authentication system...',
    latest_message_timestamp: new Date().toISOString(),
    agent_cwd: '/test/path',
    base_dir: '/test',
    archived_at: null,
  };

  it('renders unified minimalistic pill for selected idle assistant message in split mode', () => {
    render(
      <AgentCard
        agent={mockFinalAgent}
        group="idle"
        showArchived={false}
        isInSplitScreen={true} // Split mode and selected
      />
    );

    // Should show the assistant preview text (truncated by getAssistantPreview)
    const previewText = screen.getByText('All done');
    expect(previewText).toBeTruthy();

    // Find the minimalistic pill container (same as all other pills now)
    const previewContainer = previewText.closest('div[class*="bg-white/[0.04]"]');
    expect(previewContainer).toBeTruthy();
    expect(previewContainer?.className).toContain('bg-white/[0.04]');
    expect(previewContainer?.className).toContain('backdrop-blur-md');
    expect(previewContainer?.className).toContain('border-white/10');

    // Should NOT have gradient overlay (unified minimalistic style)
    const gradientOverlay = previewContainer?.querySelector('div[class*="bg-gradient-to-r"]');
    expect(gradientOverlay).toBeFalsy();
  });

  it('renders unified minimalistic pill for finalized session in split mode', () => {
    const finalizedAgent = {
      ...mockFinalAgent,
      isFinalized: true,
      latest_message_content: 'Session completed successfully. The worktree has been merged.',
    };

    render(
      <AgentCard
        agent={finalizedAgent}
        group="idle"
        showArchived={false}
        isInSplitScreen={true}
      />
    );

    const previewText = screen.getByText(/Session completed successfully/);
    expect(previewText).toBeTruthy();

    const previewContainer = previewText.closest('div[class*="bg-white/[0.04]"]');
    expect(previewContainer).toBeTruthy();
    expect(previewContainer?.className).toContain('bg-white/[0.04]');
    expect(previewContainer?.className).toContain('backdrop-blur-md');
    expect(previewContainer?.className).toContain('border-white/10');

    // No gradient overlay (unified minimalistic style)
    const gradientOverlay = previewContainer?.querySelector('div[class*="bg-gradient-to-r"]');
    expect(gradientOverlay).toBeFalsy();
  });

  it('renders unified minimalistic pill for session_end in split mode', () => {
    const sessionEndAgent = {
      ...mockFinalAgent,
      latest_message_role: 'session_end',
      latest_message_content: 'Task completed successfully.',
    };

    render(
      <AgentCard
        agent={sessionEndAgent}
        group="idle"
        showArchived={false}
        isInSplitScreen={true}
      />
    );

    const previewText = screen.getByText(/Task completed successfully/);
    expect(previewText).toBeTruthy();

    const previewContainer = previewText.closest('div[class*="bg-white/[0.04]"]');
    expect(previewContainer).toBeTruthy();
    expect(previewContainer?.className).toContain('bg-white/[0.04]');
    expect(previewContainer?.className).toContain('backdrop-blur-md');
    expect(previewContainer?.className).toContain('border-white/10');

    // No gradient overlay (unified minimalistic style)
    const gradientOverlay = previewContainer?.querySelector('div[class*="bg-gradient-to-r"]');
    expect(gradientOverlay).toBeFalsy();
  });

  it('renders unified minimalistic pill for non-split mode final assistant', () => {
    render(
      <AgentCard
        agent={mockFinalAgent}
        group="idle"
        showArchived={false}
        isInSplitScreen={false} // Not in split mode
      />
    );

    // Should use the unified minimalistic style regardless of mode
    const previewText = screen.getByText('All done');
    expect(previewText).toBeTruthy();

    // Should have the same minimalistic pill container as all other pills
    const pillContainer = previewText.closest('div[class*="bg-white/[0.04]"]');
    expect(pillContainer).toBeTruthy();
    expect(pillContainer?.className).toContain('bg-white/[0.04]');
    expect(pillContainer?.className).toContain('backdrop-blur-md');
    expect(pillContainer?.className).toContain('border-white/10');

    // Should NOT have gradient overlay (unified minimalistic style)
    const gradientOverlay = pillContainer?.querySelector('div[class*="bg-gradient-to-r"]');
    expect(gradientOverlay).toBeFalsy();
  });
});