import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createGetSymbolsOverviewSpec(): ToolSpec {
    return {
        name: 'get_symbols_overview',
        description:
            'Get an overview of the top-level symbols defined in a given file or directory.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {
                relative_path: {
                    type: 'string',
                    description: 'The relative path to the file or directory to get the overview of'
                },
                max_answer_chars: {
                    type: 'integer',
                    description: 'Maximum number of characters for the JSON result. If exceeded, no content is returned.',
                    default: 200000,
                    minimum: 1
                }
            },
            required: ['relative_path']
        }
    };
}