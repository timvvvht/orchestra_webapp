/// <reference types="vite/client" />

// Extend the Window interface to include Tauri specific properties
interface Window {
    __TAURI__?: {
        // Define invoke signature (adjust types as needed for your app)
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
        // Add other Tauri APIs you use, e.g., event listening
        event: {
            listen: <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
            emit: (event: string, payload?: unknown) => Promise<void>;
        };
        // Add other namespaces like path, fs, os, etc., if used
        fs: any; // Example: Use more specific types if available
        path: any; // Example
        os: any; // Example
    };
}
