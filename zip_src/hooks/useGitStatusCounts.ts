import { useEffect, useState } from 'react';
import { fetchRepoStatus, classifyGitStatuses, GitStatusCounts } from '@/utils/gitHelpers';
import { useMissionControlStore } from '@/stores/missionControlStore';

export function useGitStatusCounts(cwd?: string, intervalMs = 5000) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>();
    const store = useMissionControlStore();

    useEffect(() => {
        if (!cwd) return;

        let mounted = true;
        let intervalId: NodeJS.Timeout;

        async function fetchAndClassify() {
            try {
                setLoading(true);
                const entries = await fetchRepoStatus(cwd);
                console.log(`[GitStatus] Fetched status for ${cwd}:`, entries);
                const counts = classifyGitStatuses(entries);

                if (mounted) {
                    store.setGitStatus(cwd, counts);
                    store.setGitStatusError(cwd, undefined);
                    setError(undefined);
                }
            } catch (err) {
                if (mounted) {
                    const errorMsg = String(err);
                    console.error('[Git Status] Operation failed:', errorMsg);
                    store.setGitStatusError(cwd, errorMsg);
                    setError(errorMsg);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        // Initial fetch
        fetchAndClassify();

        // Set up polling interval
        intervalId = setInterval(fetchAndClassify, intervalMs);

        // Cleanup function
        return () => {
            mounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [cwd, intervalMs, store]);

    // Get current counts from store
    const counts = cwd ? store.gitStatus[cwd] : undefined;
    const dirty = counts ? Object.values(counts).some(n => n > 0) : false;

    return {
        ...counts,
        dirty,
        loading,
        error
    } as const;
}
