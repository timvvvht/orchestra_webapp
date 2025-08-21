/**
 * Session Tool Registration Utilities
 *
 * Provides helpers for registering tools with ACS sessions,
 * specifically for Mission Control workflows.
 */

import { isTauri } from '@/utils/runtime';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    if (!isTauri()) throw new Error('Tauri invoke not available in web environment');
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
}
import { toast } from 'sonner';
import {
    createFindSymbolSpec,
    createGetSymbolsOverviewSpec,
    createFindReferencingSymbolsSpec,
    createInsertAfterSymbolSpec,
    createInsertBeforeSymbolSpec,
    createReplaceSymbolBodySpec,
    createRestartLanguageServerSpec,
    createPingLanguageServerSpec
} from './lspToolSpecs';

export interface ToolSpec {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: Record<string, any>;
        required: string[];
        /**
         * Whether additional properties are allowed in the input. This mirrors the JSON Schema
         * `additionalProperties` keyword. Most of our tool schemas explicitly set this to `false`
         * to enforce strict validation but the field should remain optional.
         */
        additionalProperties?: boolean;
    };
    source: string;
}

export interface RegisterSessionToolsOptions {
    sessionId: string;
    tools: ToolSpec[];
    baseUrl?: string;
    authToken?: string;
}

/**
 * Register tools for a session using Tauri invoke
 */
export async function registerSessionTools({
    sessionId,
    tools,
    baseUrl = 'https://orchestra-acs-web.fly.dev', // Default ACS server URL
    authToken
}: RegisterSessionToolsOptions): Promise<void> {
    try {
        const toolNames = tools.map(tool => tool.name).join(', ');
        console.log(`🔧 [registerSessionTools] Registering ${tools.length} tools for session ${sessionId.slice(0, 8)}: ${toolNames}`);

        await invoke('register_session_tools', {
            sessionId,
            tools,
            catalogVersion: '1.0',
            baseUrl,
            authToken: authToken || null
        });

        console.log(`✅ [registerSessionTools] Successfully registered ${tools.length} tools: ${toolNames}`);
    } catch (error) {
        console.error('🚨 [registerSessionTools] Failed to register tools:', error);
        // Don't throw - tool registration failure shouldn't break session creation
        toast.error('Tool registration failed', {
            description: 'Session will continue without some tools'
        });
    }
}

/**
 * Create the apply_patch tool specification
 */
export function createApplyPatchToolSpec(): ToolSpec {
    return {
        name: 'apply_patch',
        description: 'Applies a unified diff/patch to files in the workspace.',
        input_schema: {
            type: 'object',
            properties: {
                patch: {
                    type: 'string',
                    description: 'Unified diff/patch text to apply to the target files.'
                }
            },
            required: ['patch']
        },
        source: 'tes_local'
    };
}

/**
 * Create the cat tool specification
 */
export function createCatToolSpec(): ToolSpec {
    return {
        name: 'cat',
        description: 'Outputs the contents of a file, with optional line range support.',
        input_schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    description: 'File path to read, relative to the current directory if not absolute.'
                },
                view_range: {
                    type: 'object',
                    description: 'Optional range of lines to display',
                    properties: {
                        start: {
                            type: 'integer',
                            description: 'Starting line number (1-based indexing)'
                        },
                        end: {
                            type: 'integer',
                            description: 'Ending line number (inclusive)'
                        }
                    }
                }
            },
            required: ['file']
        },
        source: 'tes_local'
    };
}

/**
 * Create the tree tool specification
 */
export function createTreeToolSpec(): ToolSpec {
    return {
        name: 'tree',
        description:
            'Generates a structured model of the directory hierarchy. Optionally, a depth limit can be specified to control how deep the directory tree should be traversed. The maximum depth is capped at 3 levels to prevent excessive output.',
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Directory to visualize. Can be relative or absolute. Defaults to current directory (".").',
                    default: '.'
                },
                depth: {
                    type: 'integer',
                    description: 'Optional depth limit for the directory tree (max 3). For example, 3 limits the tree to 3 levels.',
                    maximum: 3,
                    default: 3
                },
                include_files: {
                    type: 'boolean',
                    description: 'Whether to include files in output. Defaults to true.',
                    default: true
                },
                exclude_patterns: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Glob patterns to exclude from the tree'
                }
            },
            required: []
        },
        source: 'tes_local'
    };
}

/**
 * Create the agentic_search_background tool specification
 */
export function createAgenticSearchBackgroundSpec(): ToolSpec {
    return {
        name: 'agentic_search_background',
        description:
            'Performs intelligent background search using an agentic approach. Executes search queries through ACS in a background session and returns the final response.',
        input_schema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'The search query or prompt to execute'
                },
                agent_config: {
                    type: 'string',
                    description: 'Optional agent configuration name to use (defaults to "general")',
                    default: 'general'
                },
                timeout_sec: {
                    type: 'integer',
                    description: 'Optional timeout in seconds for the search operation (defaults to 120)',
                    default: 120
                }
            },
            required: ['prompt']
        },
        source: 'tes_local'
    };
}

/**
 * Create the search_notes tool specification
 */
export function createSearchNotesSpec(): ToolSpec {
    return {
        name: 'search_notes',
        description:
            "Search the user's notes / knowledge base / knowledge vault using multiple queries in parallel. Executes multiple search queries against the indexed vault and returns ranked snippets with document names.",
        input_schema: {
            type: 'object',
            properties: {
                queries: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Array of search queries to execute in parallel'
                },
                limit: {
                    type: 'integer',
                    description: 'Maximum number of results per query (default: 10)',
                    default: 10,
                    minimum: 1,
                    maximum: 100
                }
            },
            required: ['queries']
        },
        source: 'tes_local'
    };
}

/**
 * Create the read_files tool specification
 */
export function createReadFilesToolSpec(): ToolSpec {
    return {
        name: 'read_files',
        description:
            'Read multiple files simultaneously and return their contents. Supports various file formats including plain text, PDF, and DOCX files. Safety limits: maximum 25 files per request, and responses are automatically truncated if they exceed ~100,000 AI tokens to prevent excessive output.',
        input_schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Array of file paths to read (maximum 25 files per request)'
                }
            },
            required: ['files']
        },
        source: 'tes_local'
    };
}

/**
 * Create the search_files tool specification
 */
export function createSearchFilesToolSpec(): ToolSpec {
    return {
        name: 'search_files',
        description: 'Search for files by name and content using ripgrep. Supports filename patterns, content search, case-insensitive search, and pagination.',
        input_schema: {
            type: 'object',
            properties: {
                root: {
                    type: 'string',
                    description: 'Directory root to search in (defaults to current directory)',
                    default: '.'
                },
                filename_glob: {
                    type: 'string',
                    description: "Glob pattern for filenames (e.g., '*.rs')"
                },
                filename_regex: {
                    type: 'string',
                    description: 'Regex pattern for filenames (overrides filename_glob)'
                },
                content: {
                    type: 'string',
                    description: 'Plain text search inside files'
                },
                content_regex: {
                    type: 'string',
                    description: 'Regex pattern search inside files'
                },
                ignore_case: {
                    type: 'boolean',
                    description: 'Case-insensitive search (applies to both path & content)',
                    default: false
                },
                context_lines: {
                    type: 'integer',
                    description: 'Lines of context before/after matches'
                },
                exclude_globs: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: "Glob patterns to exclude (e.g., 'node_modules', '*.min.js')"
                },
                max_depth: {
                    type: 'integer',
                    description: 'Maximum directory depth (default: 25)',
                    default: 25
                },
                limit: {
                    type: 'integer',
                    description: 'Maximum number of results to return (default: 50)',
                    default: 50
                },
                offset: {
                    type: 'integer',
                    description: 'Offset for pagination (default: 0)',
                    default: 0
                }
            },
            required: []
        },
        source: 'tes_local'
    };
}

/**
 * Create the str_replace_editor tool specification
 */
export function createStrReplaceEditorToolSpec(): ToolSpec {
    return {
        name: 'str_replace_editor',
        description: 'A versatile file editing tool that supports viewing, creating, appending, inserting, and string replacement operations on files.',
        input_schema: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: "Command to execute: 'view', 'create', 'str_replace', 'insert', 'append'",
                    enum: ['view', 'create', 'str_replace', 'insert', 'append']
                },
                path: {
                    type: 'string',
                    description: 'Absolute path to the file to operate on'
                },
                view_range: {
                    type: 'array',
                    items: {
                        type: 'integer'
                    },
                    description: 'Optional range of lines to display [start, end] (1-based indexing)',
                    minItems: 2,
                    maxItems: 2
                },
                file_text: {
                    type: 'string',
                    description: 'Text content for create/append operations'
                },
                old_str: {
                    type: 'string',
                    description: 'String to replace (required for str_replace command)'
                },
                new_str: {
                    type: 'string',
                    description: 'Replacement string (for str_replace command)'
                },
                occurrence_index: {
                    type: 'integer',
                    description: '0-based index of which occurrence to replace (for multiple matches)',
                    minimum: 0
                },
                insert_line: {
                    type: 'integer',
                    description: 'Line number where to insert text (for insert command)',
                    minimum: 0
                }
            },
            required: ['command', 'path']
        },
        source: 'tes_local'
    };
}

/**
 * Create the ls tool specification
 */
export function createLsToolSpec(): ToolSpec {
    return {
        name: 'ls',
        description:
            'Lists files and directories in a single directory level (non-recursive). Supports three options: include_hidden (boolean, default false), only_dirs (boolean, default false), and path (string, default "."). Hidden files start with a dot (e.g., .gitignore). The output is an array of LsEntry objects, sorted with directories first, then alphabetically. Each LsEntry has a name (string), is_dir (boolean), and size (number).',
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Directory path to list contents of. Defaults to current directory (".")',
                    default: '.'
                },
                include_hidden: {
                    type: 'boolean',
                    description: 'Whether to include hidden files/directories (starting with dot). Defaults to false.',
                    default: false
                },
                only_dirs: {
                    type: 'boolean',
                    description: 'Whether to only include directories in the output. Defaults to false.',
                    default: false
                }
            },
            required: []
        },
        source: 'tes_local'
    };
}

/**
 * Create the my_new_tool tool specification
 */
export function createMyNewToolSpec(): ToolSpec {
    return {
        name: 'my_new_tool',
        description: 'An example tool that processes a message with an optional count parameter, demonstrating the custom tool development pattern.',
        input_schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'Message to process'
                },
                count: {
                    type: 'integer',
                    description: 'Number of times to process the message (default: 1)',
                    default: 1,
                    minimum: 1
                }
            },
            required: ['message']
        },
        source: 'tes_local'
    };
}

/**
 * Create the path_security tool specification
 */
export function createPathSecurityToolSpec(): ToolSpec {
    return {
        name: 'path_security',
        description: 'Validates that a given path is inside the current working directory, preventing access to files outside the intended scope.',
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Path to validate for security'
                }
            },
            required: ['path']
        },
        source: 'tes_local'
    };
}

/**
 * Create the aws_tools tool specification
 */
export function createAwsToolsSpec(): ToolSpec {
    return {
        name: 'aws_tools',
        description: 'Search and explore AWS-related tools and functions. Supports searching AWS service definitions, functions, and classes.',
        input_schema: {
            type: 'object',
            properties: {
                service: {
                    type: 'string',
                    description: 'AWS service name to filter results (optional)'
                },
                query: {
                    type: 'string',
                    description: 'Search query for AWS tools and functions'
                },
                root: {
                    type: 'string',
                    description: 'Root directory to search for AWS tools (defaults to tools directory)',
                    default: '/Users/tim/Code/computer-use/tools'
                },
                filename_glob: {
                    type: 'string',
                    description: 'Filename pattern to filter AWS tool files (default: *aws*.py)',
                    default: '*aws*.py'
                }
            },
            required: []
        },
        source: 'tes_local'
    };
}

/**
 * Create the initiate_runner_session tool specification
 */
export function createInitiateRunnerSessionSpec(): ToolSpec {
    return {
        name: 'initiate_runner_session',
        description:
            'Create a new long-lived shell session. Optionally choose starting cwd, pre-set environment variables, and request a login shell. Returns the newly created session_id and initial state.',
        input_schema: {
            type: 'object',
            properties: {
                session_id_prefix: {
                    type: 'string',
                    description: "Prefix for the generated session ID. Defaults to 'shell_session'."
                },
                initial_cwd: {
                    type: ['string', 'null'],
                    description: 'Optional starting directory path for the session.'
                },
                initial_env_vars: {
                    type: ['object', 'null'],
                    description: 'Optional map of env var name → value to preload into the session.',
                    additionalProperties: { type: 'string' }
                },
                prefer_login_shell: {
                    type: 'boolean',
                    description: 'If true, start the shell as a login shell (e.g., bash -l).',
                    default: false
                }
            },
            required: [],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the execute_in_runner_session tool specification
 */
export function createExecuteInRunnerSessionSpec(): ToolSpec {
    return {
        name: 'execute_in_runner_session',
        description:
            "Run a single command inside an existing session. Captures stdout/stderr and exit code. Useful for short-lived commands that need the session's environment.",
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string', description: 'Target session ID.' },
                command: { type: 'string', description: 'Shell command to execute.' },
                timeout_seconds: {
                    type: 'integer',
                    minimum: 1,
                    description: 'Maximum time to allow the command to run before killing it. Defaults to 120 seconds.',
                    default: 120
                }
            },
            required: ['session_id', 'command'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the set_runner_session_cwd tool specification
 */
export function createSetRunnerSessionCwdSpec(): ToolSpec {
    return {
        name: 'set_runner_session_cwd',
        description: 'Change the current working directory of an existing session.',
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string' },
                path: { type: 'string', description: 'Absolute or relative path to new cwd.' }
            },
            required: ['session_id', 'path'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the set_runner_session_env_var tool specification
 */
export function createSetRunnerSessionEnvVarSpec(): ToolSpec {
    return {
        name: 'set_runner_session_env_var',
        description: 'Set or override an environment variable inside a session.',
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string' },
                var_name: { type: 'string' },
                var_value: { type: 'string' }
            },
            required: ['session_id', 'var_name', 'var_value'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the unset_runner_session_env_var tool specification
 */
export function createUnsetRunnerSessionEnvVarSpec(): ToolSpec {
    return {
        name: 'unset_runner_session_env_var',
        description: 'Remove an environment variable from a session.',
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string' },
                var_name: { type: 'string' }
            },
            required: ['session_id', 'var_name'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the get_runner_session_state tool specification
 */
export function createGetRunnerSessionStateSpec(): ToolSpec {
    return {
        name: 'get_runner_session_state',
        description: 'Retrieve current cwd, environment variables, and active background jobs for a session.',
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string' }
            },
            required: ['session_id'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the terminate_runner_session tool specification
 */
export function createTerminateRunnerSessionSpec(): ToolSpec {
    return {
        name: 'terminate_runner_session',
        description: 'Terminate an existing session and kill all background jobs.',
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string' }
            },
            required: ['session_id'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the start_background_os_job_in_session tool specification
 */
export function createStartBackgroundOsJobInSessionSpec(): ToolSpec {
    return {
        name: 'start_background_os_job_in_session',
        description: 'Start a long-running background OS process inside a session. Returns an internal job ID and OS PID.',
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string' },
                command_parts: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                    description: 'Command broken into argv parts – first element is executable, rest are args.'
                }
            },
            required: ['session_id', 'command_parts'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the get_background_os_job_status tool specification
 */
export function createGetBackgroundOsJobStatusSpec(): ToolSpec {
    return {
        name: 'get_background_os_job_status',
        description: 'Query status of a background OS job previously started in the session.',
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string' },
                internal_job_id: { type: 'string' }
            },
            required: ['session_id', 'internal_job_id'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Create the send_signal_to_os_job tool specification
 */
export function createSendSignalToOsJobSpec(): ToolSpec {
    return {
        name: 'send_signal_to_os_job',
        description: 'Send a POSIX signal (e.g., SIGTERM) to a running background OS job.',
        input_schema: {
            type: 'object',
            properties: {
                session_id: { type: 'string' },
                internal_job_id: { type: 'string' },
                signal_name: {
                    type: 'string',
                    description: "Signal name to send. Default = 'SIGTERM'.",
                    default: 'SIGTERM'
                }
            },
            required: ['session_id', 'internal_job_id'],
            additionalProperties: false
        },
        source: 'tes_local'
    } as const;
}

/**
 * Register the apply_patch tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the apply_patch tool is available for the session.
 */
export async function registerApplyPatchTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerApplyPatchTool] 📋 Registering apply_patch tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const applyPatchTool = createApplyPatchToolSpec();

    console.log('🔧 [registerApplyPatchTool] 📋 Tool spec created:', {
        name: applyPatchTool.name,
        source: applyPatchTool.source,
        hasInputSchema: !!applyPatchTool.input_schema,
        requiredFields: applyPatchTool.input_schema.required
    });

    await registerSessionTools({
        sessionId,
        tools: [applyPatchTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerApplyPatchTool] ✅ apply_patch tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the cat tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the cat tool is available for the session.
 */
export async function registerCatTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerCatTool] 📋 Registering cat tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const catTool = createCatToolSpec();

    console.log('🔧 [registerCatTool] 📋 Tool spec created:', {
        name: catTool.name,
        source: catTool.source,
        hasInputSchema: !!catTool.input_schema,
        requiredFields: catTool.input_schema.required
    });

    await registerSessionTools({
        sessionId,
        tools: [catTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerCatTool] ✅ cat tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the tree tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the tree tool is available for the session.
 */
export async function registerTreeTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerTreeTool] 📋 Registering tree tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const treeTool = createTreeToolSpec();

    console.log('🔧 [registerTreeTool] 📋 Tool spec created:', {
        name: treeTool.name,
        source: treeTool.source,
        hasInputSchema: !!treeTool.input_schema,
        requiredFields: treeTool.input_schema.required || []
    });

    await registerSessionTools({
        sessionId,
        tools: [treeTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerTreeTool] ✅ tree tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the agentic_search_background tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the agentic_search_background tool is available for the session.
 */
export async function registerAgenticSearchBackgroundTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerAgenticSearchBackgroundTool] 📋 Registering agentic_search_background tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const agenticSearchTool = createAgenticSearchBackgroundSpec();

    console.log('🔧 [registerAgenticSearchBackgroundTool] 📋 Tool spec created:', {
        name: agenticSearchTool.name,
        source: agenticSearchTool.source,
        hasInputSchema: !!agenticSearchTool.input_schema,
        requiredFields: agenticSearchTool.input_schema.required
    });

    await registerSessionTools({
        sessionId,
        tools: [agenticSearchTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log(
        '🔧 [registerAgenticSearchBackgroundTool] ✅ agentic_search_background tool registration completed for session:',
        sessionId.slice(0, 8) + '...'
    );
}

/**
 * Register the search_notes tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the search_notes tool is available for the session.
 */
export async function registerSearchNotesTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerSearchNotesTool] 📋 Registering search_notes tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const searchNotesTool = createSearchNotesSpec();

    console.log('🔧 [registerSearchNotesTool] 📋 Tool spec created:', {
        name: searchNotesTool.name,
        source: searchNotesTool.source,
        hasInputSchema: !!searchNotesTool.input_schema,
        requiredFields: searchNotesTool.input_schema.required
    });

    await registerSessionTools({
        sessionId,
        tools: [searchNotesTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerSearchNotesTool] ✅ search_notes tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the read_files tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the read_files tool is available for the session.
 */
export async function registerReadFilesTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerReadFilesTool] 📋 Registering read_files tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const readFilesTool = createReadFilesToolSpec();

    console.log('🔧 [registerReadFilesTool] 📋 Tool spec created:', {
        name: readFilesTool.name,
        source: readFilesTool.source,
        hasInputSchema: !!readFilesTool.input_schema,
        requiredFields: readFilesTool.input_schema.required
    });

    await registerSessionTools({
        sessionId,
        tools: [readFilesTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerReadFilesTool] ✅ read_files tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the search_files tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the search_files tool is available for the session.
 */
export async function registerSearchFilesTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerSearchFilesTool] 📋 Registering search_files tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const searchFilesTool = createSearchFilesToolSpec();

    console.log('🔧 [registerSearchFilesTool] 📋 Tool spec created:', {
        name: searchFilesTool.name,
        source: searchFilesTool.source,
        hasInputSchema: !!searchFilesTool.input_schema,
        requiredFields: searchFilesTool.input_schema.required || []
    });

    await registerSessionTools({
        sessionId,
        tools: [searchFilesTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerSearchFilesTool] ✅ search_files tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the str_replace_editor tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the str_replace_editor tool is available for the session.
 */
export async function registerStrReplaceEditorTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerStrReplaceEditorTool] 📋 Registering str_replace_editor tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const strReplaceEditorTool = createStrReplaceEditorToolSpec();

    console.log('🔧 [registerStrReplaceEditorTool] 📋 Tool spec created:', {
        name: strReplaceEditorTool.name,
        source: strReplaceEditorTool.source,
        hasInputSchema: !!strReplaceEditorTool.input_schema,
        requiredFields: strReplaceEditorTool.input_schema.required
    });

    await registerSessionTools({
        sessionId,
        tools: [strReplaceEditorTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerStrReplaceEditorTool] ✅ str_replace_editor tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the my_new_tool tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the my_new_tool tool is available for the session.
 */
export async function registerMyNewToolTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerMyNewToolTool] 📋 Registering my_new_tool tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const myNewTool = createMyNewToolSpec();

    console.log('🔧 [registerMyNewToolTool] 📋 Tool spec created:', {
        name: myNewTool.name,
        source: myNewTool.source,
        hasInputSchema: !!myNewTool.input_schema,
        requiredFields: myNewTool.input_schema.required
    });

    await registerSessionTools({
        sessionId,
        tools: [myNewTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerMyNewToolTool] ✅ my_new_tool tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the path_security tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the path_security tool is available for the session.
 */
export async function registerPathSecurityTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerPathSecurityTool] 📋 Registering path_security tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const pathSecurityTool = createPathSecurityToolSpec();

    console.log('🔧 [registerPathSecurityTool] 📋 Tool spec created:', {
        name: pathSecurityTool.name,
        source: pathSecurityTool.source,
        hasInputSchema: !!pathSecurityTool.input_schema,
        requiredFields: pathSecurityTool.input_schema.required
    });

    await registerSessionTools({
        sessionId,
        tools: [pathSecurityTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerPathSecurityTool] ✅ path_security tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Register the aws_tools tool for a session
 *
 * This is the main function to call from Mission Control workflows
 * to ensure the aws_tools tool is available for the session.
 */
export async function registerAwsToolsTool(sessionId: string, options: { baseUrl?: string; authToken?: string } = {}): Promise<void> {
    console.log('🔧 [registerAwsToolsTool] 📋 Registering aws_tools tool:', {
        sessionId: sessionId.slice(0, 8) + '...',
        baseUrl: options.baseUrl || 'default',
        hasAuthToken: !!options.authToken
    });

    const awsToolsTool = createAwsToolsSpec();

    console.log('🔧 [registerAwsToolsTool] 📋 Tool spec created:', {
        name: awsToolsTool.name,
        source: awsToolsTool.source,
        hasInputSchema: !!awsToolsTool.input_schema,
        requiredFields: awsToolsTool.input_schema.required || []
    });

    await registerSessionTools({
        sessionId,
        tools: [awsToolsTool],
        baseUrl: options.baseUrl,
        authToken: options.authToken
    });

    console.log('🔧 [registerAwsToolsTool] ✅ aws_tools tool registration completed for session:', sessionId.slice(0, 8) + '...');
}

/**
 * Default session tools - tools that are available by default when creating new sessions
 */
export const sessionTools = [
    createApplyPatchToolSpec,
    createCatToolSpec,
    createTreeToolSpec,
    createAgenticSearchBackgroundSpec,
    createSearchNotesSpec,
    createReadFilesToolSpec,
    createSearchFilesToolSpec,
    createStrReplaceEditorToolSpec,
    createLsToolSpec,
    createMyNewToolSpec,
    createPathSecurityToolSpec,
    createAwsToolsSpec,
    createInitiateRunnerSessionSpec,
    createExecuteInRunnerSessionSpec,
    createSetRunnerSessionCwdSpec,
    createSetRunnerSessionEnvVarSpec,
    createUnsetRunnerSessionEnvVarSpec,
    createGetRunnerSessionStateSpec,
    createTerminateRunnerSessionSpec,
    createStartBackgroundOsJobInSessionSpec,
    createGetBackgroundOsJobStatusSpec,
    createSendSignalToOsJobSpec,
    // LSP HTTP Tools
    createFindSymbolSpec(),
    createGetSymbolsOverviewSpec(),
    createFindReferencingSymbolsSpec(),
    createInsertAfterSymbolSpec(),
    createInsertBeforeSymbolSpec(),
    createReplaceSymbolBodySpec(),
    // Note: createCodebaseOrientationSpec() is not implemented by the onefile LSP server
    createRestartLanguageServerSpec(),
    createPingLanguageServerSpec()
];
