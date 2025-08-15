export interface ProjectContext {
  path: string;
  name: string;
  lastAccessed: number;
}

export interface LandingState {
  mode: "prelude" | "chat" | "project";
  projectContext: ProjectContext | null;
  recentProjects: ProjectContext[];
}

export interface StoredRecentProjects {
  projects: ProjectContext[];
}

export const STORAGE_KEYS = {
  RECENT_PROJECTS: "orchestra_recent_projects",
  LAST_MODE: "orchestra_last_mode",
  LAST_PROJECT: "orchestra_last_project",
} as const;
