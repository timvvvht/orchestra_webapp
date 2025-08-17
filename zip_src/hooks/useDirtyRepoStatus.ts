import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';

export const useDirtyRepoStatus = (projectRoot: string, enabled = false) =>
  useQuery({
    queryKey: ['dirtyRepo', projectRoot],
    queryFn: () => invoke<boolean>('check_repo_dirty', { projectRoot: projectRoot }),
    enabled
  });