import { ToolSpec } from '../registerSessionTools';

export function createFindDefinitionSpec(): ToolSpec {
    return {
        name: 'find_definition',
        description: 'Go to definition of a symbol. Finds where a function, variable, or class is defined.',
        input_schema: {
            type: 'object',
            properties: {
                uri: {
                    type: 'string',
                    description: 'The document URI containing the symbol reference'
                },
                position: {
                    type: 'object',
                    description: 'The position of the symbol reference in the document',
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
                }
            },
            required: ['uri', 'position']
        },
        source: 'tes_local'
    };
}