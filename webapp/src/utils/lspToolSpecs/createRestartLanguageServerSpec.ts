import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createRestartLanguageServerSpec(): ToolSpec {
    return {
        name: 'restart_language_server',
        description:
            'Restart the language server for fresh indexing and analysis. Useful when language server state becomes inconsistent.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    };
}