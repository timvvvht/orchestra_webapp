import { ToolSpec } from '../registerSessionTools';

export function createHoverSpec(): ToolSpec {
    return {
        name: 'hover',
        description: 'Get hover information for a symbol. Shows type information, documentation, and quick info.',
        input_schema: {
            type: 'object',
            properties: {
                uri: {
                    type: 'string',
                    description: 'The document URI to get hover information for'
                },
                position: {
                    type: 'object',
                    description: 'The position to get hover information for',
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