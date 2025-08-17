import { describe, it, expect } from 'vitest';
import { HttpLspClient } from '../httpLspClient';

describe('HttpLspClient Timeout Configuration', () => {
    it('should default to 120000ms timeout', () => {
        const client = new HttpLspClient();
        expect(client.getTimeoutMs()).toBe(120000);
    });

    it('should allow setting custom timeout', () => {
        const client = new HttpLspClient();
        client.setTimeoutMs(5000);
        expect(client.getTimeoutMs()).toBe(5000);
    });

    it('should allow setting timeout multiple times', () => {
        const client = new HttpLspClient();
        
        client.setTimeoutMs(1000);
        expect(client.getTimeoutMs()).toBe(1000);
        
        client.setTimeoutMs(30000);
        expect(client.getTimeoutMs()).toBe(30000);
        
        client.setTimeoutMs(120000);
        expect(client.getTimeoutMs()).toBe(120000);
    });
});