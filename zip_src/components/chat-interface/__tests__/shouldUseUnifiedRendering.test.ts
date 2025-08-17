import { shouldUseUnifiedRendering } from '../UnrefinedModeTimelineRenderer';

const base = { id: '1', sessionId: 's', createdAt: 0, role: 'assistant' } as any;

test('classic tool_use triggers unified rendering', () => {
    const msg = { ...base, content: [{ type: 'tool_use', id: 't', name: 'think', input: {} }] };
    expect(shouldUseUnifiedRendering(msg)).toBe(true);
});

test('legacy tool_use_id triggers unified rendering', () => {
    const msg = { ...base, content: [{ tool_use_id: 't', type: 'text', text: 'ignored' }] };
    expect(shouldUseUnifiedRendering(msg)).toBe(true);
});

test('plain text stays false', () => {
    const msg = { ...base, content: [{ type: 'text', text: 'hello' }] };
    expect(shouldUseUnifiedRendering(msg)).toBe(false);
});
