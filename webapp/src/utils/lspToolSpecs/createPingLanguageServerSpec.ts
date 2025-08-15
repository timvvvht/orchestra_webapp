import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createPingLanguageServerSpec(): ToolSpec {
    return {
        name: 'ping_language_server',
        description:
            'Ping the language server to check if it is responsive. This is an alias for restart_language_server that performs the same function of ensuring the language server is active and responsive.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    };
}