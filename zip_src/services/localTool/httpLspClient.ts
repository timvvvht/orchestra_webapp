// Using the built-in global fetch available in modern Node.js runtimes

export interface ToolInfo {
    name: string;
    description: string;
    parameters: any;
}

let baseUrl = '' as string;

export function setBaseUrl(url: string): void {
    console.log('[LTO][LSP] Setting base URL:', url);
    if (!/^https?:\/\//.test(url)) {
        console.error('[LTO][LSP] Invalid base URL format:', url);
        throw new Error('Invalid base URL');
    }
    baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    console.log('[LTO][LSP] Base URL set to:', baseUrl);
}

export function getBaseUrl(): string {
    console.log('[LTO][LSP] Getting base URL:', baseUrl);
    return baseUrl;
}

export class HttpLspClient {
    private getHeaders: Record<string, string> = { 'Accept': 'application/json' };
    private postHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    private timeout: number = 120000; // 120 second timeout

    constructor() {
        console.log('[LTO][LSP] HttpLspClient constructor called');
        // Initialize with empty baseUrl - will be set by ensureLspServer
    }

    setTimeoutMs(ms: number): void {
        this.timeout = ms;
    }

    getTimeoutMs(): number {
        return this.timeout;
    }

    async listTools(): Promise<ToolInfo[]> {
        console.log('[LTO][LSP] listTools called, baseUrl:', baseUrl);
        
        const maxRetries = 4;
        const delays = [250, 500, 1000, 2000]; // ms
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            try {
                console.log('[LTO][LSP] Fetching tools from:', `${baseUrl}/tools`, `(attempt ${attempt + 1}/${maxRetries + 1})`);
                const r = await fetch(`${baseUrl}/tools`, {
                    method: 'GET',
                    headers: this.getHeaders,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                console.log('[LTO][LSP] Tools response status:', r.status, `(attempt ${attempt + 1})`);

                // Retry on 502/503 errors
                if (r.status === 502 || r.status === 503) {
                    throw new Error(`Retryable error: ${r.status}`);
                }

                if (!r.ok) {
                    console.error('[LTO][LSP] List tools failed with status:', r.status);
                    throw new Error(`List failed ${r.status}`);
                }

                let json: any;
                try {
                    json = await r.json();
                } catch (parseError) {
                    console.warn('[LTO][LSP] JSON parse error, retrying...', parseError);
                    throw new Error('Invalid JSON response');
                }

                console.log('[LTO][LSP] Tools response received:', json);

                // Parse response: if array return it, if object with tools return tools, else throw
                if (Array.isArray(json)) {
                    console.log('[LTO][LSP] Tools response is array, returning', json.length, 'tools');
                    return json;
                } else if (json.tools && Array.isArray(json.tools)) {
                    console.log('[LTO][LSP] Tools response has tools property, returning', json.tools.length, 'tools');
                    return json.tools;
                } else {
                    console.error('[LTO][LSP] Invalid tools response format:', json);
                    throw new Error('Invalid tools response format');
                }
            } catch (error: any) {
                clearTimeout(timeoutId);

                if (error.name === 'AbortError') {
                    console.error('[LTO][LSP] List tools request timeout after', this.timeout, 'ms');
                    throw new Error('Request timeout');
                }

                console.error('[LTO][LSP] List tools attempt', attempt + 1, 'error:', error);

                // Check if this is a retryable error
                const isRetryable = error instanceof TypeError || // Network errors
                                  error.message?.includes('502') ||
                                  error.message?.includes('503') ||
                                  error.message?.includes('Invalid JSON') ||
                                  error.message?.includes('Invalid tools response format');

                // If this is the last attempt or not retryable, throw final error
                if (attempt === maxRetries || !isRetryable) {
                    console.error('[LTO][LSP] List tools failed permanently after', attempt + 1, 'attempts');
                    throw new Error('Load failed');
                }

                // Wait before retrying
                console.warn(`[LTO][LSP] Retrying listTools in ${delays[attempt]}ms...`);
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
            }
        }

        // Should never reach here, but just in case
        throw new Error('Load failed');
    }

    async callTool<T = any>(name: string, args: Record<string, any>): Promise<T> {
        console.log('[LTO][LSP] callTool called:', { name, args });

        // Extract project_root from args; the rest becomes tool_kwargs
        const { project_root, ...tool_kwargs } = args;

        if (!project_root) {
            console.error('[LTO][LSP] Missing project_root in args:', args);
            throw new Error('project_root is required for LSP tool calls');
        }

        const body = {
            project_root,
            tool_name: name,
            tool_kwargs
        };

        console.log('[LTO][LSP] Request body prepared:', body);

        // Implement retry logic for 502/503 errors
        const maxRetries = 4;
        const retryDelays = [500, 1000, 2000, 4000]; // ms

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            console.log('[LTO][LSP] Tool call attempt', attempt + 1, 'of', maxRetries + 1);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            try {
                console.log('[LTO][LSP] Sending request to:', `${baseUrl}/execute_job`);
                const r = await fetch(`${baseUrl}/execute_job`, {
                    method: 'POST',
                    headers: this.postHeaders,
                    body: JSON.stringify(body),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                console.log('[LTO][LSP] Tool response status:', r.status, 'for attempt', attempt + 1);

                // Handle 400 errors with detail parsing
                if (r.status === 400) {
                    const errorJson = await r.json();
                    console.error('[LTO][LSP] Tool 400 error details:', errorJson);
                    if (errorJson.detail) {
                        throw new Error(errorJson.detail);
                    }
                    throw new Error(`Tool ${name} failed with status 400`);
                }

                // Retry on 502/503 errors
                if ((r.status === 502 || r.status === 503) && attempt < maxRetries) {
                    console.warn(`[LTO][LSP] Tool ${name} failed with status ${r.status}, retrying in ${retryDelays[attempt]}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
                    continue;
                }

                if (!r.ok) {
                    console.error('[LTO][LSP] Tool call failed with status:', r.status);
                    throw new Error(`Tool ${name} failed ${r.status}`);
                }

                const response = (await r.json()) as any;
                console.log('[LTO][LSP] Tool call successful, response:', response);
                return response.result as T;
            } catch (error) {
                clearTimeout(timeoutId);

                if (error.name === 'AbortError') {
                    console.error('[LTO][LSP] Tool call request timeout after', this.timeout, 'ms');
                    throw new Error('Request timeout');
                }

                console.error('[LTO][LSP] Tool call attempt', attempt + 1, 'error:', error);

                // If this is the last attempt or not a retryable error, throw
                if (attempt === maxRetries || !(error.message?.includes('502') || error.message?.includes('503'))) {
                    console.error('[LTO][LSP] Tool call failed permanently after', attempt + 1, 'attempts');
                    throw error;
                }

                // Retry on network errors for 502/503
                console.warn(`[LTO][LSP] Tool ${name} network error, retrying in ${retryDelays[attempt]}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            }
        }

        console.error('[LTO][LSP] Tool call failed after all attempts');
        throw new Error(`Tool ${name} failed after ${maxRetries + 1} attempts`);
    }
}

export const lspClient = new HttpLspClient();
