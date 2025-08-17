import { useQuery } from '@tanstack/react-query';
import { isTauri } from '@/utils/runtime';

let invoke: any;
if (isTauri()) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  invoke = (window as any).__TAURI__?.core?.invoke;
}

export const useGitDiffFile = (projectRoot: string, filePath: string, enabled = true) =>
    useQuery({
        queryKey: ['git-diff-file', projectRoot, filePath],
        queryFn: async () => {
            if (!isTauri()) {
                throw new Error('Git operations require desktop app');
            }
            const result = await invoke<string>('git_diff_file', { projectRoot, filePath });
            return result;
        },
        enabled: enabled && !!projectRoot && !!filePath,
        refetchOnWindowFocus: false,
        staleTime: 5000 // Consider data stale after 5 seconds
    });
