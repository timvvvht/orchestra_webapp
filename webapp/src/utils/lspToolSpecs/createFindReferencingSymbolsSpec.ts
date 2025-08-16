import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createFindReferencingSymbolsSpec(): ToolSpec {
    return {
        name: 'find_referencing_symbols',
        description:
            'Find all symbols that reference a given symbol. Useful for understanding symbol usage and dependencies.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {
                name_path: {
                    type: 'string',
                    description: 'The name path of the symbol to find references for (e.g., "class/method")'
                },
                relative_path: {
                    type: 'string',
                    description: 'The relative path to the file containing the symbol for which to find references'
                },
                include_kinds: {
                    type: 'array',
                    items: {
                        type: 'integer'
                    },
                    description: 'Optional list of LSP symbol kind integers to include in results'
                },
                exclude_kinds: {
                    type: 'array',
                    items: {
                        type: 'integer'
                    },
                    description: 'Optional list of LSP symbol kind integers to exclude from results'
                },
                max_answer_chars: {
                    type: 'integer',
                    description: 'Maximum number of characters for the JSON result',
                    default: 200000,
                    minimum: 1
                }
            },
            required: ['name_path', 'relative_path']
        }
    };
}