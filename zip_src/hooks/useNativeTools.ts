import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface NativeTool {
    name: string;
    description?: string;
    version?: string;
}

export interface ToolExecutionResult {
    success: boolean;
    data?: unknown;
    error?: string;
    executionTime?: number;
}

export function useNativeTools() {
    const [tools, setTools] = useState<NativeTool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const list = await invoke<string[]>('list_native_tools');
                setTools(list.map(name => ({ name })));
            } catch (e) {
                setError(e as Error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const executeTool = async (toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResult> => {
        try {
            const startTime = Date.now();
            const result = await invoke(`tool_${toolName}`, { input });
            const executionTime = Date.now() - startTime;

            return {
                success: true,
                data: result,
                executionTime
            };
        } catch (e) {
            return {
                success: false,
                error: (e as Error).message
            };
        }
    };

    return { tools, loading, error, executeTool };
}
