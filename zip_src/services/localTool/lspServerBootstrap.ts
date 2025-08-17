import { invoke } from '@tauri-apps/api/core';
import { setBaseUrl } from './httpLspClient';

/** Response payload from tauri::command("lsp_start_server") */
interface LspStartResponse {
    port: number;
}

/**
 * Ensures the LSP server is running and returns the port it's running on.
 * Tolerant of already-running servers and retries up to 3 times if needed.
 */
export async function ensureLspServer(): Promise<number> {
    const maxRetries = 3;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[LTO][LSP] Attempt ${attempt} to start LSP server...`);

            // Try to start the server via Tauri command
            const { port } = await invoke<LspStartResponse>('lsp_start_server');
            if (typeof port !== 'number' || Number.isNaN(port)) {
                throw new Error('Invalid port returned by lsp_start_server');
            }

            console.log(`[LTO][LSP] LSP server started successfully on port ${port}`);

            // Always set the base URL (works for both new and already-running servers)
            setBaseUrl(`http://127.0.0.1:${port}`);

            console.log(`[LTO][LSP] LSP client base URL set to: http://127.0.0.1:${port}`);

            // Store the port in localStorage for persistence
            localStorage.setItem('lspServerPort', String(port));

            return port;
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            console.error(`[LTO][LSP] Attempt ${attempt} failed:`, lastError);

            // Before retrying, check if server is already running on fixed port 8123
            try {
                console.log(`[LTO][LSP] Checking if LSP server is already running...`);
                const healthResponse = await fetch('http://127.0.0.1:8123/health');
                if (healthResponse.ok) {
                    console.log(`[LTO][LSP] Found already-running LSP server on port 8123`);

                    // Set the base URL for the already-running server
                    setBaseUrl('http://127.0.0.1:8123');

                    // Store the port in localStorage
                    localStorage.setItem('lspServerPort', '8123');

                    return 8123;
                }
            } catch (healthError) {
                console.log(`[LTO][LSP] Health check failed, server not already running`);
            }

            // If this is not the last attempt, wait before retrying
            if (attempt < maxRetries) {
                const delay = 1000 * attempt; // Exponential backoff: 1s, 2s, 3s
                console.log(`[LTO][LSP] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // If we get here, all retries failed
    const errorMessage = `[LTO][LSP] Failed to start LSP server after ${maxRetries} attempts. Last error: ${lastError}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
}

export function getStoredLspPort(): number | null {
    const raw = localStorage.getItem('lspServerPort');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
}
