import { ToolSpec } from '../registerSessionTools';

export function createDocumentSymbolsSpec(): ToolSpec {
    return {
        name: 'document_symbols',
        description: 'List all symbols in a document. Shows classes, functions, variables, and their hierarchy.',
        input_schema: {
            type: 'object',
            properties: {
                uri: {
                    type: 'string',
                    description: 'The document URI to analyze'
                },
                include_kind: {
                    type: 'string',
                    description: 'Filter symbols by kind (optional)',
                    enum: ['class', 'function', 'variable', 'method', 'interface', 'enum', 'namespace', 'type', 'property']
                }
            },
            required: ['uri']
        },
        source: 'tes_local'
    };
}