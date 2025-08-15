import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createFindReferencingCodeSnippetsSpec(): ToolSpec {
    return {
        name: 'find_referencing_code_snippets',
        description:
            'Find code snippets that reference or use a given symbol. Helps understand usage patterns and examples.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {
                symbol_name: {
                    type: 'string',
                    description: 'The name of the symbol to find referencing snippets for'
                },
                context_lines: {
                    type: 'integer',
                    description: 'Number of context lines to include around each snippet',
                    default: 3,
                    minimum: 0
                },
                max_results: {
                    type: 'integer',
                    description: 'Maximum number of snippets to return',
                    default: 10,
                    minimum: 1
                }
            },
            required: ['symbol_name']
        }
    };
}