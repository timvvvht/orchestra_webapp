import { ToolSpec } from '../registerSessionTools';

export function createSignatureHelpSpec(): ToolSpec {
    return {
        name: 'signature_help',
        description: 'Get signature help for function calls. Shows parameter information and documentation.',
        input_schema: {
            type: 'object',
            properties: {
                uri: {
                    type: 'string',
                    description: 'The document URI to get signature help for'
                },
                position: {
                    type: 'object',
                    description: 'The position to get signature help for',
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
                    description: 'What triggered the signature help request',
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