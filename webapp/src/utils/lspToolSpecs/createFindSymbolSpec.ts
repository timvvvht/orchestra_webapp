import { z } from 'zod';
import { ToolSpec } from '../registerSessionTools';

/**
 * Creates the find_symbol tool specification.
 * 
 * This tool supports two modes:
 * 
 * 1. **Name-based search mode**: Provide `name_path` to search for symbols by name/path
 *    - Example: { name_path: "App", depth: 1 }
 *    - Example: { name_path: "Class/method", relative_path: "src/file.ts" }
 * 
 * 2. **Cursor-based lookup mode**: Provide `relative_path` + `line` to find symbol at cursor position
 *    - Example: { relative_path: "src/App.tsx", line: 10, column: 5 }
 *    - Example: { relative_path: "src/App.tsx", line: 10, column: 5, mode: "defining" }
 * 
 * @returns ToolSpec for the find_symbol tool
 */
export function createFindSymbolSpec(): ToolSpec {
    return {
        name: 'find_symbol',
        description:
            'Search symbols by name/path or find symbol at cursor position. Supports two modes: name-based search (provide name_path) or cursor-based lookup (provide relative_path + line + optional column).',
        source: 'lsp_http',
        input_schema: {
            type: 'object',
            properties: {
                // Name-based search mode parameters
                name_path: {
                    type: 'string',
                    description: 'Symbol name or path to search for (e.g. "method", "Class/method", "/Top/Class"). Required for name-based search mode.'
                },
                
                // Cursor-based lookup mode parameters
                relative_path: {
                    type: 'string',
                    description: 'File path relative to project root. Required for cursor-based lookup mode, optional for name-based search (restricts search to file/directory).'
                },
                line: {
                    type: 'integer',
                    description: '0-based line number for cursor-based lookup. Required for cursor-based lookup mode.',
                    minimum: 0
                },
                column: {
                    type: 'integer',
                    description: '0-based column number for cursor-based lookup. Optional for "containing" mode, required for "defining" mode.',
                    minimum: 0
                },
                mode: {
                    type: 'string',
                    description: 'Cursor lookup mode: "containing" (finds symbol containing cursor) or "defining" (finds symbol definition at exact cursor position). Default: "containing".',
                    enum: ['containing', 'defining'],
                    default: 'containing'
                },
                
                // Common parameters for both modes
                depth: {
                    type: 'integer',
                    description: 'Include children depth in results. Default: 0.',
                    default: 0,
                    minimum: 0
                },
                include_body: {
                    type: 'boolean',
                    description: 'Whether to include symbol body/content in results. Default: false.',
                    default: false
                },
                include_kinds: {
                    type: 'array',
                    items: {
                        type: 'integer'
                    },
                    description: 'LSP SymbolKind integer codes to include in results (e.g., [5, 6, 12] for class, method, function).'
                },
                exclude_kinds: {
                    type: 'array',
                    items: {
                        type: 'integer'
                    },
                    description: 'LSP SymbolKind integer codes to exclude from results. Takes precedence over include_kinds.'
                },
                substring_matching: {
                    type: 'boolean',
                    description: 'Use substring matching for the last segment of name_path. Default: false. Only applies to name-based search.',
                    default: false
                },
                max_answer_chars: {
                    type: 'integer',
                    description: 'Maximum number of characters for the JSON result. If exceeded, returns explanatory message.',
                    default: 200000,
                    minimum: 1
                }
            },
            required: [],
            additionalProperties: false
        }
    };
}