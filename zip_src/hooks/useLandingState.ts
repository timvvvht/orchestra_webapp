import { useState, useEffect } from 'react';
import { ProjectContext, LandingState } from '@/types/landingTypes';
import { 
  recentProjectsManager, 
  lastModeManager, 
  lastProjectManager 
} from '@/utils/projectStorage';

export function useLandingState() {
  const [state, setState] = useState<LandingState>({
    mode: 'prelude',
    projectContext: null,
    recentProjects: []
  });

  // Load initial state from localStorage
  useEffect(() => {
    const recentProjects = recentProjectsManager.get();

    // Always start with prelude - let users choose their workflow
    setState({
      mode: 'prelude',
      projectContext: null,
      recentProjects
    });
  }, []);

  const selectChatMode = () => {
    setState(prev => ({ ...prev, mode: 'chat', projectContext: null }));
    lastModeManager.set('chat');
    lastProjectManager.set(null);
  };

  const selectProjectMode = (project: ProjectContext) => {
    setState(prev => ({ 
      ...prev, 
      mode: 'project', 
      projectContext: project 
    }));
    
    // Update storage
    lastModeManager.set('project');
    lastProjectManager.set(project);
    recentProjectsManager.add(project);
    
    // Update recent projects in state
    setState(prev => ({
      ...prev,
      recentProjects: recentProjectsManager.get()
    }));
  };

  const returnToPrelude = () => {
    setState(prev => ({ ...prev, mode: 'prelude' }));
  };

  const removeRecentProject = (path: string) => {
    recentProjectsManager.remove(path);
    setState(prev => ({
      ...prev,
      recentProjects: recentProjectsManager.get()
    }));
  };

  return {
    state,
    selectChatMode,
    selectProjectMode,
    returnToPrelude,
    removeRecentProject
  };
}