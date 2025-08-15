import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createReplaceSymbolBodySpec(): ToolSpec {
    return {
        name: 'replace_symbol_body',
        description:
            'Replace the body/content of a specified symbol. Useful for refactoring and updating implementations.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {
                name_path: {
                    type: 'string',
                    description: 'The name path of the symbol whose body will be replaced (e.g., "class/method")'
                },
                relative_path: {
                    type: 'string',
                    description: 'The relative path to the file containing the symbol'
                },
                body: {
                    type: 'string',
                    description: 'The new body/content for the symbol'
                }
            },
            required: ['name_path', 'relative_path', 'body']
        }
    };
}