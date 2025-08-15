import { ToolSpec } from '../registerSessionTools';

export function createFindReferencesSpec(): ToolSpec {
    return {
        name: 'find_references',
        description: 'Find all references to a symbol in the codebase. Shows where a function, variable, or class is used.',
        input_schema: {
            type: 'object',
            properties: {
                uri: {
                    type: 'string',
                    description: 'The document URI containing the symbol'
                },
                position: {
                    type: 'object',
                    description: 'The position of the symbol in the document',
                    properties: {
                        line: {
                            type: 'integer',
                            description: 'Line number (0-based)'
                        },
                        character: {
                            type: 'integer',
                            description: 'Character position (0-based)'
                        }
                    },
                    required: ['line', 'character']
                },
                include_declaration: {
                    type: 'boolean',
                    description: 'Whether to include the declaration in results',
                    default: false
                }
            },
            required: ['uri', 'position']
        },
        source: 'tes_local'
    };
}