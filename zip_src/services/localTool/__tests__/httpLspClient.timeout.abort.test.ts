import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpLspClient, setBaseUrl } from '../httpLspClient';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('HttpLspClient Timeout Abort', () => {
    let client: HttpLspClient;

    beforeEach(() => {
        client = new HttpLspClient();
        setBaseUrl('http://localhost:8123');
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should use AbortController with timeout', async () => {
        // Set a short timeout for testing
        client.setTimeoutMs(100);

        // Mock fetch to check that AbortSignal is passed
        mockFetch.mockImplementation((url, options) => {
            // Verify AbortSignal is present
            expect(options.signal).toBeInstanceOf(AbortSignal);
            
            // Return a successful response quickly
            return Promise.resolve({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({
                    status: 'success',
                    result: { data: { name: 'test_symbol' } }
                })
            });
        });

        const result = await client.callTool('find_symbol', {
            project_root: '/test/project',
            name_path: 'test_symbol'
        });

        expect(result).toEqual({ data: { name: 'test_symbol' } });
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:8123/execute_job',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_root: '/test/project',
                    tool_name: 'find_symbol',
                    tool_kwargs: { name_path: 'test_symbol' }
                }),
                signal: expect.any(AbortSignal)
            })
        );
    });

    it('should complete successfully when request finishes before timeout', async () => {
        // Set a reasonable timeout
        client.setTimeoutMs(1000);

        // Mock successful response
        const mockResponse = {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({
                status: 'success',
                result: { data: { name: 'test_symbol' } }
            })
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await client.callTool('find_symbol', {
            project_root: '/test/project',
            name_path: 'test_symbol'
        });

        expect(result).toEqual({ data: { name: 'test_symbol' } });
        expect(mockFetch).toHaveBeenCalledOnce();
    });
});