import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createInsertAfterSymbolSpec(): ToolSpec {
    return {
        name: 'insert_after_symbol',
        description:
            'Insert code content after a specified symbol. Useful for adding methods, properties, or other code elements.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {
                name_path: {
                    type: 'string',
                    description: 'The name path of the symbol to insert after (e.g., "class/method")'
                },
                relative_path: {
                    type: 'string',
                    description: 'The relative path to the file containing the symbol'
                },
                body: {
                    type: 'string',
                    description: 'The code content to insert after the symbol'
                }
            },
            required: ['name_path', 'relative_path', 'body']
        }
    };
}