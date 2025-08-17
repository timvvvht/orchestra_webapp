export type ToolPreset = {
  label: string;
  tool: string;
  input: Record<string, unknown>;
  description?: string;
};

/**
 * ✏️  Add new presets here – no UI changes required.
 */
export const presets: ToolPreset[] = [
  {
    label: 'Search *.rs in file crate',
    tool: 'search_files',
    description: 'Search for Rust files in the file tools crate',
    input: {
      root: './tools/file',
      filename_glob: '*.rs',
      limit: 10
    }
  },
  {
    label: 'Search *.toml files',
    tool: 'search_files',
    description: 'Search for TOML configuration files',
    input: {
      root: './tools/file',
      filename_glob: '*.toml',
      limit: 5
    }
  },
  {
    label: 'Search for "test" in Rust files',
    tool: 'search_files',
    description: 'Search for the word "test" in Rust source files',
    input: {
      root: './tools/file',
      filename_glob: '*.rs',
      content: 'test',
      limit: 15
    }
  },
  {
    label: 'Read Cargo.toml',
    tool: 'read_files',
    description: 'Read the contents of Cargo.toml file',
    input: {
      files: ['./tools/file/Cargo.toml']
    }
  },
  {
    label: 'Debug: List current directory',
    tool: 'search_files',
    description: 'List all files in current directory (for debugging paths)',
    input: {
      root: '.',
      filename_glob: '*',
      limit: 20
    }
  },
  {
    label: 'Debug: Search all *.rs files from root',
    tool: 'search_files',
    description: 'Search for all Rust files from current directory (for debugging)',
    input: {
      root: '.',
      filename_glob: '*.rs',
      limit: 50
    }
  },
  {
    label: 'Debug: Search with absolute path',
    tool: 'search_files',
    description: 'Test search with absolute path to see if it works',
    input: {
      root: '/Users/tim/Code/orchestra/src-tauri/tools/file',
      filename_glob: '*.rs',
      limit: 10
    }
  },
  {
    label: 'Test: Search with Paths parameter',
    tool: 'search_files',
    description: 'Test search using Paths parameter like job instructions',
    input: {
      Paths: ['/Users/tim/Code/cv-guides'],
      Max_results: 10,
      filename_glob: '*.md'
    }
  },
  {
    label: 'Create demo file (str_replace_editor)',
    tool: 'str_replace_editor',
    description: 'Create a demo text file using str_replace_editor',
    input: {
      path: '/tmp/demo_native_tools.txt',
      command: 'create',
      file_text: 'Hello from Native Tools Console!\nThis is a test file created by the str_replace_editor tool.'
    }
  },
  // Session Runner Tools (Rust)
  {
    label: 'Initialize Session (Rust)',
    tool: 'initiate_runner_session',
    description: 'Initialize a new shell session using the Rust session runner',
    input: {
      session_id_prefix: 'test_session',
      initial_cwd: '/tmp',
      prefer_login_shell: false
    }
  },
  {
    label: 'Execute Simple Command (Rust)',
    tool: 'execute_in_runner_session',
    description: 'Execute a simple command in a session',
    input: {
      session_id: 'test_session_1',
      command: 'echo "Hello from Rust session runner!"',
      timeout_seconds: 30
    }
  },
  {
    label: 'List Directory (Rust)',
    tool: 'execute_in_runner_session',
    description: 'List directory contents using the session runner',
    input: {
      session_id: 'test_session_1',
      command: 'ls -la',
      timeout_seconds: 30
    }
  },
  {
    label: 'Set Environment Variable (Rust)',
    tool: 'set_runner_session_env_var',
    description: 'Set an environment variable in the session',
    input: {
      session_id: 'test_session_1',
      var_name: 'TEST_VAR',
      var_value: 'Hello from Rust!'
    }
  },
  {
    label: 'Check Session State (Rust)',
    tool: 'get_runner_session_state',
    description: 'Get the current state of a session',
    input: {
      session_id: 'test_session_1'
    }
  },
  {
    label: 'Change Working Directory (Rust)',
    tool: 'set_runner_session_cwd',
    description: 'Change the working directory in a session',
    input: {
      session_id: 'test_session_1',
      path: '.'
    }
  },
  {
    label: 'Execute with Environment (Rust)',
    tool: 'execute_in_runner_session',
    description: 'Execute a command that uses the environment variable',
    input: {
      session_id: 'test_session_1',
      command: 'echo "Environment variable: $TEST_VAR"',
      timeout_seconds: 30
    }
  },
  {
    label: 'Terminate Session (Rust)',
    tool: 'terminate_runner_session',
    description: 'Terminate a session and clean up resources',
    input: {
      session_id: 'test_session_1'
    }
  }
];