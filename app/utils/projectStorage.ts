import { ProjectContext, STORAGE_KEYS, StoredRecentProjects } from '@/types/landingTypes';

export const recentProjectsManager = {
  get: (): ProjectContext[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_PROJECTS);
      if (!stored) return [];
      
      const parsed: StoredRecentProjects = JSON.parse(stored);
      return parsed.projects || [];
    } catch (error) {
      console.error('Failed to load recent projects:', error);
      return [];
    }
  },

  add: (project: ProjectContext): void => {
    try {
      const current = recentProjectsManager.get();
      
      // Remove if already exists (to update position)
      const filtered = current.filter(p => p.path !== project.path);
      
      // Add to beginning
      const updated = [project, ...filtered].slice(0, 5); // Keep only 5
      
      localStorage.setItem(
        STORAGE_KEYS.RECENT_PROJECTS,
        JSON.stringify({ projects: updated })
      );
    } catch (error) {
      console.error('Failed to save recent project:', error);
    }
  },

  remove: (path: string): void => {
    try {
      const current = recentProjectsManager.get();
      const filtered = current.filter(p => p.path !== path);
      
      localStorage.setItem(
        STORAGE_KEYS.RECENT_PROJECTS,
        JSON.stringify({ projects: filtered })
      );
    } catch (error) {
      console.error('Failed to remove recent project:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.RECENT_PROJECTS);
    } catch (error) {
      console.error('Failed to clear recent projects:', error);
    }
  }
};

export const lastModeManager = {
  get: (): 'chat' | 'project' | null => {
    try {
      const mode = localStorage.getItem(STORAGE_KEYS.LAST_MODE);
      return mode as 'chat' | 'project' | null;
    } catch {
      return null;
    }
  },

  set: (mode: 'chat' | 'project'): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_MODE, mode);
    } catch (error) {
      console.error('Failed to save last mode:', error);
    }
  }
};

export const lastProjectManager = {
  get: (): ProjectContext | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_PROJECT);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  set: (project: ProjectContext | null): void => {
    try {
      if (project) {
        localStorage.setItem(STORAGE_KEYS.LAST_PROJECT, JSON.stringify(project));
      } else {
        localStorage.removeItem(STORAGE_KEYS.LAST_PROJECT);
      }
    } catch (error) {
      console.error('Failed to save last project:', error);
    }
  }
};