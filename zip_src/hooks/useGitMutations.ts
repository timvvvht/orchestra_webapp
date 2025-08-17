import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StageResult } from '../types/gitTypes';
import { isTauri } from '@/utils/runtime';

let invoke: any;
if (isTauri()) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  invoke = (window as any).__TAURI__?.core?.invoke;
}

export const useGitStage = () => {
    const queryClient = useQueryClient();

    return useMutation<StageResult, Error, { projectRoot: string; files: string[] }>({
        mutationFn: async ({ projectRoot, files }: { projectRoot: string; files: string[] }): Promise<StageResult> => {
            if (!isTauri()) {
                throw new Error('Git operations require desktop app');
            }
            await invoke('git_stage', { projectRoot, files });
            return { files };
        },
        onSuccess: (data, { projectRoot }) => {
            if (!data?.files?.length) return;
            // Invalidate git status to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['git-status', projectRoot] });
            toast.success(`Staged ${data.files.length} file(s)`);
        },
        onError: error => {
            toast.error('Failed to stage files', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
};

export const useGitCommit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ projectRoot, message }: { projectRoot: string; message: string }) => {
            if (!isTauri()) {
                throw new Error('Git operations require desktop app');
            }
            const commitHash = await invoke<string>('git_commit', { projectRoot, message });
            return commitHash;
        },
        onSuccess: (commitHash, { projectRoot }) => {
            // Invalidate git status to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['git-status', projectRoot] });
            toast.success('Changes committed successfully', {
                description: `Commit: ${commitHash.slice(0, 8)}`
            });
        },
        onError: error => {
            toast.error('Failed to commit changes', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
};

export const useGitStash = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ projectRoot }: { projectRoot: string }) => {
            if (!isTauri()) {
                throw new Error('Git operations require desktop app');
            }
            await invoke('git_stash_push', { projectRoot });
        },
        onSuccess: (_, { projectRoot }) => {
            // Invalidate git status to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['git-status', projectRoot] });
            toast.success('Changes stashed successfully');
        },
        onError: error => {
            toast.error('Failed to stash changes', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
};

export const useGitDiscard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ projectRoot, files }: { projectRoot: string; files: string[] }) => {
            if (!isTauri()) {
                throw new Error('Git operations require desktop app');
            }
            await invoke('git_discard', { projectRoot, files });
        },
        onSuccess: (_, { projectRoot, files }) => {
            // Invalidate git status to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['git-status', projectRoot] });
            toast.success(`Discarded changes in ${files.length} file(s)`);
        },
        onError: error => {
            toast.error('Failed to discard changes', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
};
