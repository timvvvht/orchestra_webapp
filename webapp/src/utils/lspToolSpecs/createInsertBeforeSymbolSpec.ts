import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createInsertBeforeSymbolSpec(): ToolSpec {
    return {
        name: 'insert_before_symbol',
        description:
            'Insert code content before a specified symbol. Useful for adding imports, comments, or other code elements.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {
                name_path: {
                    type: 'string',
                    description: 'The name path of the symbol to insert before (e.g., "class/method")'
                },
                relative_path: {
                    type: 'string',
                    description: 'The relative path to the file containing the symbol'
                },
                body: {
                    type: 'string',
                    description: 'The code content to insert before the symbol'
                }
            },
            required: ['name_path', 'relative_path', 'body']
        }
    };
}