import { useQuery } from '@tanstack/react-query';
import { GitFileStatus } from '../types/gitTypes';
import { isTauri } from '@/utils/runtime';

let invoke: any;
if (isTauri()) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  invoke = (window as any).__TAURI__?.core?.invoke;
}

export const useGitStatus = (projectRoot: string, enabled = true) =>
    useQuery({
        queryKey: ['git-status', projectRoot],
        queryFn: async () => {
            if (!isTauri()) {
                throw new Error('Git operations require desktop app');
            }
            const result = await invoke<GitFileStatus[]>('git_status', { projectRoot });
            return result;
        },
        enabled: enabled && !!projectRoot,
        refetchOnWindowFocus: false,
        staleTime: 1000 // Consider data stale after 1 second
    });
