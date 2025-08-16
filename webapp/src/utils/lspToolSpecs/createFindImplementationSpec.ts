import { ToolSpec } from '../registerSessionTools';

export function createFindImplementationSpec(): ToolSpec {
    return {
        name: 'find_implementation',
        description: 'Find implementations of an interface or abstract method. Shows concrete implementations.',
        input_schema: {
            type: 'object',
            properties: {
                uri: {
                    type: 'string',
                    description: 'The document URI containing the interface or abstract method'
                },
                position: {
                    type: 'object',
                    description: 'The position of the interface or abstract method',
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