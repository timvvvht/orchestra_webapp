import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgentCard from '../AgentCard';
import { MissionControlAgent } from '@/stores/missionControlStore';

// Mock dependencies
vi.mock('@/stores/missionControlStore', () => ({
  useMissionControlStore: () => ({
    selectedSession: null,
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

describe('AgentCard Pill Styles', () => {
  const mockAgent: MissionControlAgent = {
    id: 'test-session-1',
    mission_title: 'Test Session',
    status: 'processing',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    agent_config_name: 'general',
    model_id: 'claude-3',
    latest_message_id: 'msg-1',
    latest_message_role: 'tool_call',
    latest_message_content: 'search_files',
    latest_message_timestamp: new Date().toISOString(),
    agent_cwd: '/test/path',
    base_dir: '/test',
    archived_at: null,
  };

  it('renders minimalistic neutral pill with glass base', () => {
    render(
      <AgentCard
        agent={mockAgent}
        group="processing"
        showArchived={false}
        isInSplitScreen={false}
      />
    );

    // Find the activity text to locate the pill
    const activityText = screen.getByText('Exploring codebase…');
    const pillContainer = activityText.closest('div[class*="bg-white/[0.04]"]');
    
    expect(pillContainer).toBeTruthy();
    expect(pillContainer?.className).toContain('bg-white/[0.04]');
    expect(pillContainer?.className).toContain('backdrop-blur-md');
    expect(pillContainer?.className).toContain('rounded-lg');
    expect(pillContainer?.className).toContain('border-white/10');

    // Should NOT have gradient overlay (unified minimalistic style)
    const gradientOverlay = pillContainer?.querySelector('div[class*="bg-gradient-to-r"]');
    expect(gradientOverlay).toBeFalsy();
  });

  it('uses rounded-lg instead of rounded-full for reduced curvature', () => {
    render(
      <AgentCard
        agent={mockAgent}
        group="processing"
        showArchived={false}
        isInSplitScreen={false}
      />
    );

    const activityText = screen.getByText('Exploring codebase…');
    const pillContainer = activityText.closest('div[class*="rounded-lg"]');
    
    expect(pillContainer).toBeTruthy();
    expect(pillContainer?.className).toContain('rounded-lg');
    expect(pillContainer?.className).not.toContain('rounded-full');
  });

  it('renders unified minimalistic pill for processing card in split mode', () => {
    render(
      <AgentCard
        agent={mockAgent}
        group="processing"
        showArchived={false}
        isInSplitScreen={true} // Split mode but not selected
      />
    );

    const activityText = screen.getByText('Exploring codebase…');
    const pillContainer = activityText.closest('div[class*="bg-white/[0.04]"]');
    
    expect(pillContainer).toBeTruthy();
    expect(pillContainer?.className).toContain('bg-white/[0.04]');
    expect(pillContainer?.className).toContain('backdrop-blur-md');
    expect(pillContainer?.className).toContain('border-white/10');

    // Should NOT have gradient overlay (unified minimalistic style)
    const gradientOverlay = pillContainer?.querySelector('div[class*="bg-gradient-to-r"]');
    expect(gradientOverlay).toBeFalsy();
  });
});