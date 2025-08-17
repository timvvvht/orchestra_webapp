import React from 'react';
import { LandingPagePrelude } from './LandingPagePrelude';
import { LandingPageInfinite } from './LandingPageInfinite';
import { useLandingState } from '@/hooks/useLandingState';
import { ProjectContext } from '@/types/landingTypes';
import { useAuth } from '@/auth/AuthContext';

export function LandingPageOrchestrator() {
  const { 
    state, 
    selectChatMode, 
    selectProjectMode, 
    returnToPrelude,
    removeRecentProject 
  } = useLandingState();

  // ---- AUTH ----
  const { isAuthenticated, setShowModal } = useAuth();

  const handleModeSelect = (mode: 'chat' | 'project', projectPath?: string) => {

    // GUARD: force Google login if user is not authed
    if (!isAuthenticated) {
      setShowModal(true);          // opens AuthModal
      return;                      // stop further navigation
    }
    if (mode === 'chat') {
      selectChatMode();
    } else if (mode === 'project' && projectPath) {
      const projectName = projectPath.split('/').pop() || 'Untitled Project';
      const project: ProjectContext = {
        path: projectPath,
        name: projectName,
        lastAccessed: Date.now()
      };
      selectProjectMode(project);
    }
  };

  // Show prelude
  if (state.mode === 'prelude') {
    return (
      <LandingPagePrelude
        onModeSelect={handleModeSelect}
        recentProjects={state.recentProjects}
        onRemoveRecent={removeRecentProject}
      />
    );
  }

  // Show main interface
  return (
    <LandingPageInfinite
      projectContext={state.projectContext || undefined}
      onProjectChange={returnToPrelude}
    />
  );
}

export default LandingPageOrchestrator;