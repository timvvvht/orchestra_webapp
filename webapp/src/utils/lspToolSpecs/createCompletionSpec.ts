import { ToolSpec } from '../registerSessionTools';

export function createCompletionSpec(): ToolSpec {
    return {
        name: 'completion',
        description: 'Get code completions at a specific position. Shows available variables, functions, and keywords.',
        input_schema: {
            type: 'object',
            properties: {
                uri: {
                    type: 'string',
                    description: 'The document URI to get completions for'
                },
                position: {
                    type: 'object',
                    description: 'The position to get completions for',
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
                trigger_kind: {
                    type: 'integer',
                    description: 'What triggered the completion request',
                    enum: [1, 2, 3],
                    default: 1
                },
                trigger_character: {
                    type: 'string',
                    description: 'The trigger character (if any)'
                }
            },
            required: ['uri', 'position']
        },
        source: 'tes_local'
    };
}