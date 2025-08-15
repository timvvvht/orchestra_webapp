import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

export function createCodebaseOrientationSpec(): ToolSpec {
    return {
        name: 'codebase_orientation',
        description:
            'Get orientation and overview of the codebase structure. Provides high-level understanding of project organization.',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {
                include_files: {
                    type: 'boolean',
                    description: 'Whether to include file listing in orientation',
                    default: true
                },
                max_depth: {
                    type: 'integer',
                    description: 'Maximum depth for directory traversal',
                    default: 2,
                    minimum: 1
                },
                focus_path: {
                    type: 'string',
                    description: 'Optional path to focus orientation on specific directory'
                }
            },
            required: []
        }
    };
}