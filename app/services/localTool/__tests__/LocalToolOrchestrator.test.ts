import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LocalToolOrchestrator } from '../LocalToolOrchestrator'
// Mock JobInstructionV1 type for testing
interface JobInstructionV1 {
  schema_version: string
  job_id: string
  tool_use_id: string
  session_id: string
  cwd: string
  tool_name: string
  tool_input: Record<string, any>
}

// Mock Tauri invoke function
const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

describe('LocalToolOrchestrator', () => {
  let orchestrator: LocalToolOrchestrator
  
  beforeEach(() => {
    // Mock FirehoseMux
    const mockFirehose = {
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    } as any
    
    orchestrator = new LocalToolOrchestrator(mockFirehose, {
      tesUrl: 'http://localhost:12345/execute_job',
      acsApi: 'http://localhost:8080'
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Tool Availability', () => {
    it('should identify native tools correctly', () => {
      expect(orchestrator.isNativeTool('search_files')).toBe(true)
      expect(orchestrator.isNativeTool('read_files')).toBe(true)
      expect(orchestrator.isNativeTool('str_replace_editor')).toBe(true)
      expect(orchestrator.isNativeTool('initiate_runner_session')).toBe(true)
      expect(orchestrator.isNativeTool('execute_in_runner_session')).toBe(true)
      expect(orchestrator.isNativeTool('non_existent_tool')).toBe(false)
    })

    it('should return available native tools', () => {
      const tools = orchestrator.getNativeTools()
      expect(tools).toBeInstanceOf(Set)
      // Note: In test environment, native tools may not be available
      // This test verifies the method exists and returns a Set
    })
  })

  describe('Tool Execution - search_files', () => {
    it('should execute search_files successfully', async () => {
      const mockResult = {
        status: 'success',
        files: [
          { path: '/test/file1.txt', matches: ['line 1'] },
          { path: '/test/file2.txt', matches: ['line 2'] }
        ]
      }
      mockInvoke.mockResolvedValue(mockResult)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-1',
        tool_use_id: 'tool-1',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'search_files',
        tool_input: {
          paths: ['/test'],
          pattern: '*.txt',
          content: 'test'
        }
      }

      const result = await orchestrator.executeToolDirect('search_files', jobInstruction.tool_input)
      
      expect(mockInvoke).toHaveBeenCalledWith('tool_search_files', { input: jobInstruction.tool_input })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
    })

    it('should handle search_files errors', async () => {
      const mockError = new Error('Search failed')
      mockInvoke.mockRejectedValue(mockError)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-1',
        tool_use_id: 'tool-1',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'search_files',
        tool_input: {
          paths: ['/test'],
          pattern: '*.txt'
        }
      }

      const result = await orchestrator.executeToolDirect('search_files', jobInstruction.tool_input)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Search failed')
    })
  })

  describe('Tool Execution - read_files', () => {
    it('should execute read_files successfully', async () => {
      const mockResult = {
        status: 'success',
        files: [
          { path: '/test/file1.txt', content: 'file content 1' },
          { path: '/test/file2.txt', content: 'file content 2' }
        ]
      }
      mockInvoke.mockResolvedValue(mockResult)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-2',
        tool_use_id: 'tool-2',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'read_files',
        tool_input: {
          files: ['/test/file1.txt', '/test/file2.txt']
        }
      }

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction.tool_input)
      
      expect(mockInvoke).toHaveBeenCalledWith('tool_read_files', { input: jobInstruction.tool_input })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
    })
  })

  describe('Tool Execution - str_replace_editor', () => {
    it('should execute str_replace_editor create command successfully', async () => {
      const mockResult = {
        status: 'success',
        message: 'File created successfully at: /test/newfile.txt'
      }
      mockInvoke.mockResolvedValue(mockResult)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-3',
        tool_use_id: 'tool-3',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'str_replace_editor',
        tool_input: {
          command: 'create',
          path: '/test/newfile.txt',
          file_text: 'Hello, World!'
        }
      }

      const result = await orchestrator.executeToolDirect('str_replace_editor', jobInstruction.tool_input)
      
      expect(mockInvoke).toHaveBeenCalledWith('str_replace_editor_command', { input: jobInstruction.tool_input })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
    })

    it('should execute str_replace_editor str_replace command successfully', async () => {
      const mockResult = {
        status: 'success',
        message: 'The file /test/file.txt has been edited (occurrence_index=0). Here is a snippet of the changes:\nResult of reading a snippet of /test/file.txt:\n     1\tHello, Universe!'
      }
      mockInvoke.mockResolvedValue(mockResult)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-4',
        tool_use_id: 'tool-4',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'str_replace_editor',
        tool_input: {
          command: 'str_replace',
          path: '/test/file.txt',
          old_str: 'World',
          new_str: 'Universe'
        }
      }

      const result = await orchestrator.executeToolDirect('str_replace_editor', jobInstruction.tool_input)
      
      expect(mockInvoke).toHaveBeenCalledWith('str_replace_editor_command', { input: jobInstruction.tool_input })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
    })

    it('should handle str_replace_editor validation errors', async () => {
      const mockError = {
        status: 'error',
        error: 'Parameter `old_str` is required for command: str_replace. Please provide the string you want to replace.'
      }
      mockInvoke.mockResolvedValue(mockError)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-5',
        tool_use_id: 'tool-5',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'str_replace_editor',
        tool_input: {
          command: 'str_replace',
          path: '/test/file.txt',
          old_str: '',
          new_str: 'Universe'
        }
      }

      const result = await orchestrator.executeToolDirect('str_replace_editor', jobInstruction.tool_input)
      
      expect(result.success).toBe(false)
      expect(result.data).toEqual(mockError)
      expect(result.data.status).toBe('error')
      expect(result.data.error).toContain('Parameter `old_str` is required')
    })

    it('should handle str_replace_editor path validation errors', async () => {
      const mockError = {
        status: 'error',
        error: 'The path relative/path is not absolute. Please provide an absolute path starting with \'/\'.'
      }
      mockInvoke.mockResolvedValue(mockError)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-6',
        tool_use_id: 'tool-6',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'str_replace_editor',
        tool_input: {
          command: 'create',
          path: 'relative/path',
          file_text: 'content'
        }
      }

      const result = await orchestrator.executeToolDirect('str_replace_editor', jobInstruction.tool_input)
      
      expect(result.success).toBe(false)
      expect(result.data).toEqual(mockError)
      expect(result.data.status).toBe('error')
      expect(result.data.error).toContain('not absolute')
    })
  })

  describe('Session Runner Tools', () => {
    it('should execute initiate_runner_session successfully', async () => {
      const mockResult = {
        status: 'success',
        session_id: 'test_session_123',
        cwd: '/test',
        environment_variables: {},
        active_background_jobs: {},
        message: 'Session initialized successfully.'
      }
      mockInvoke.mockResolvedValue(mockResult)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-7',
        tool_use_id: 'tool-7',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'initiate_runner_session',
        tool_input: {
          session_id_prefix: 'test_session'
        }
      }

      const result = await orchestrator.executeToolDirect('initiate_runner_session', jobInstruction.tool_input)
      
      expect(mockInvoke).toHaveBeenCalledWith('initiate_runner_session', { input: jobInstruction.tool_input })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
      expect(result.data.session_id).toContain('test_session')
    })

    it('should execute execute_in_runner_session successfully', async () => {
      const mockResult = {
        status: 'success',
        stdout: 'Hello, World!\n',
        stderr: '',
        exit_code: 0,
        session_id: 'test_session_123',
        command_id: 'cmd_456'
      }
      mockInvoke.mockResolvedValue(mockResult)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-8',
        tool_use_id: 'tool-8',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'execute_in_runner_session',
        tool_input: {
          session_id: 'test_session_123',
          command: 'echo "Hello, World!"'
        }
      }

      const result = await orchestrator.executeToolDirect('execute_in_runner_session', jobInstruction.tool_input)
      
      expect(mockInvoke).toHaveBeenCalledWith('execute_in_runner_session', { input: jobInstruction.tool_input })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
    })

    it('should execute set_runner_session_cwd successfully', async () => {
      const mockResult = {
        status: 'success',
        cwd: '/new/path',
        error: null
      }
      mockInvoke.mockResolvedValue(mockResult)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-9',
        tool_use_id: 'tool-9',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'set_runner_session_cwd',
        tool_input: {
          session_id: 'test_session_123',
          path: '/new/path'
        }
      }

      const result = await orchestrator.executeToolDirect('set_runner_session_cwd', jobInstruction.tool_input)
      
      expect(mockInvoke).toHaveBeenCalledWith('set_runner_session_cwd', { input: jobInstruction.tool_input })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
    })

    it('should execute set_runner_session_env_var successfully', async () => {
      const mockResult = {
        status: 'success',
        variable_name: 'TEST_VAR',
        variable_value: 'test_value',
        error: null
      }
      mockInvoke.mockResolvedValue(mockResult)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-10',
        tool_use_id: 'tool-10',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'set_runner_session_env_var',
        tool_input: {
          session_id: 'test_session_123',
          var_name: 'TEST_VAR',
          var_value: 'test_value'
        }
      }

      const result = await orchestrator.executeToolDirect('set_runner_session_env_var', jobInstruction.tool_input)
      
      expect(mockInvoke).toHaveBeenCalledWith('set_runner_session_env_var', { input: jobInstruction.tool_input })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResult)
    })
  })

  describe('Error Handling', () => {
    it('should handle unknown tool names', async () => {
      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-11',
        tool_use_id: 'tool-11',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'unknown_tool',
        tool_input: {}
      }

      const result = await orchestrator.executeToolDirect('unknown_tool', jobInstruction.tool_input)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Native tool unknown_tool not implemented')
    })

    it('should handle Tauri invoke failures', async () => {
      const mockError = new Error('Tauri invoke failed')
      mockInvoke.mockRejectedValue(mockError)

      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'test-job-12',
        tool_use_id: 'tool-12',
        session_id: 'session-1',
        cwd: '/test',
        tool_name: 'search_files',
        tool_input: {
          paths: ['/test'],
          pattern: '*.txt'
        }
      }

      const result = await orchestrator.executeToolDirect('search_files', jobInstruction.tool_input)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Tauri invoke failed')
    })
  })

  describe('Tool Input Validation', () => {
    it('should pass through tool_input correctly for each tool', async () => {
      const tools = [
        'search_files',
        'read_files', 
        'str_replace_editor',
        'initiate_runner_session',
        'execute_in_runner_session',
        'set_runner_session_cwd',
        'set_runner_session_env_var',
        'unset_runner_session_env_var',
        'get_runner_session_state',
        'terminate_runner_session'
      ]

      for (const toolName of tools) {
        mockInvoke.mockResolvedValue({ status: 'success' })
        
        const jobInstruction: JobInstructionV1 = {
          schema_version: '1.0.0',
          job_id: `test-job-${toolName}`,
          tool_use_id: `tool-${toolName}`,
          session_id: 'session-1',
          cwd: '/test',
          tool_name: toolName,
          tool_input: { test: 'data' }
        }

        await orchestrator.executeToolDirect(toolName, jobInstruction.tool_input)
        
        // Verify the correct Tauri command was called with the right input
        const expectedCommand = toolName === 'search_files' ? 'tool_search_files' :
                               toolName === 'read_files' ? 'tool_read_files' :
                               toolName === 'str_replace_editor' ? 'str_replace_editor_command' :
                               toolName
        
        expect(mockInvoke).toHaveBeenCalledWith(expectedCommand, { input: { test: 'data' } })
        
        mockInvoke.mockClear()
      }
    })
  })
})