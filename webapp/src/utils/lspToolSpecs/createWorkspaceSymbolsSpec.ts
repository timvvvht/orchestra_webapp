import { ToolSpec } from '../registerSessionTools';

export function createWorkspaceSymbolsSpec(): ToolSpec {
    return {
        name: 'workspace_symbols',
        description: 'Search for symbols across the entire workspace. Find classes, functions, and variables in all files.',
        input_schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The symbol name or pattern to search for'
                },
                kind: {
                    type: 'string',
                    description: 'Symbol kind filter (optional)',
                    enum: ['class', 'function', 'variable', 'method', 'interface', 'enum', 'namespace', 'type', 'property']
                },
                limit: {
                    type: 'integer',
                    description: 'Maximum number of results to return',
                    default: 100,
                    minimum: 1,
                    maximum: 1000
                }
            },
            required: ['query']
        },
        source: 'tes_local'
    };
}