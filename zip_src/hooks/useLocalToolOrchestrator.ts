// Simple accessor hook for the app-level orchestrator
// NOTE: The orchestrator is created once in App.tsx via bootstrapOrchestrator()
declare global {
  interface Window { __orch?: import('../services/localTool/LocalToolOrchestrator').LocalToolOrchestrator }
}

export function useOrchestrator() {
    const orch = window.__orch;
    if (!orch) {
        throw new Error('LocalToolOrchestrator not initialized - ensure App.tsx calls bootstrapOrchestrator()');
    }

    const executeToolCall = async (toolName: string, args: any) => {
        try {
            const result = await orch.executeToolDirect(toolName, args);
            return {
                success: result.success,
                data: result.data,
                error: result.error,
                executionTime: result.executionTime || 0
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Unknown error',
                executionTime: 0
            };
        }
    };

    const isNativeTool = (toolName: string): boolean => {
        return orch.isNativeTool(toolName);
    };

    const getNativeTools = (): string[] => {
        return Array.from(orch.getNativeTools() || []);
    };

    const getAllTools = () => {
        return { 
            native: Array.from(orch.getNativeTools() || []), 
            python: [] 
        };
    };

    const getToolSource = (toolName: string) => {
        return orch.isNativeTool(toolName) ? 'rust' : 'python';
    };

    return {
        orchestrator: orch,
        loading: false,
        error: null,
        executeToolCall,
        isNativeTool,
        getNativeTools,
        getAllTools,
        getToolSource
    };
}
