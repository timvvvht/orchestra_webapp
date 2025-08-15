import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { LocalToolOrchestrator } from '../LocalToolOrchestrator'
import type { JobInstructionV1 } from '../../../types/JobInstructionV1'

// These tests require a running Tauri application
// They can be skipped in CI/CD environments where Tauri is not available
const isE2EEnabled = process.env.VITE_E2E === 'true'

describe.skipIf(!isE2EEnabled)('LocalToolOrchestrator E2E Tests', () => {
  let orchestrator: LocalToolOrchestrator
  let testSessionId: string | null = null

  beforeAll(async () => {
    orchestrator = new LocalToolOrchestrator()
    
    // Wait for Tauri to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  afterAll(async () => {
    // Clean up test session if created
    if (testSessionId) {
      try {
        await orchestrator.executeToolDirect('terminate_runner_session', {
          schema_version: '1.0.0',
          job_id: 'cleanup-job',
          tool_use_id: 'cleanup-tool',
          session_id: 'cleanup-session',
          cwd: process.cwd(),
          tool_name: 'terminate_runner_session',
          tool_input: {
            session_id: testSessionId
          }
        })
      } catch (error) {
        console.warn('Failed to cleanup test session:', error)
      }
    }
  })

  beforeEach(() => {
    // Reset session ID for each test
    testSessionId = null
  })

  describe('Real Tauri Integration', () => {
    it('should execute search_files against real filesystem', async () => {
      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-search-1',
        tool_use_id: 'e2e-tool-1',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'search_files',
        tool_input: {
          paths: ['.'],
          pattern: '*.json',
          max_results: 5
        }
      }

      const result = await orchestrator.executeToolDirect('search_files', jobInstruction)
      
      expect(result).toBeDefined()
      expect(result.status).toBe('success')
      expect(result.files).toBeDefined()
      expect(Array.isArray(result.files)).toBe(true)
      
      // Should find package.json at minimum
      const packageJsonFound = result.files.some((file: any) => 
        file.path.includes('package.json')
      )
      expect(packageJsonFound).toBe(true)
    }, 10000)

    it('should execute read_files against real files', async () => {
      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-read-1',
        tool_use_id: 'e2e-tool-2',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: ['./package.json']
        }
      }

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction)
      
      expect(result).toBeDefined()
      expect(result.status).toBe('success')
      expect(result.files).toBeDefined()
      expect(Array.isArray(result.files)).toBe(true)
      expect(result.files.length).toBe(1)
      
      const packageFile = result.files[0]
      expect(packageFile.path).toContain('package.json')
      expect(packageFile.content).toContain('"name"')
      expect(packageFile.content).toContain('orchestra')
    }, 10000)

    it('should create and manage a real session', async () => {
      // Step 1: Create session
      const initiateInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-session-1',
        tool_use_id: 'e2e-tool-3',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'initiate_runner_session',
        tool_input: {
          session_id_prefix: 'e2e_test'
        }
      }

      const sessionResult = await orchestrator.executeToolDirect('initiate_runner_session', initiateInstruction)
      
      expect(sessionResult).toBeDefined()
      expect(sessionResult.status).toBe('success')
      expect(sessionResult.session_id).toBeDefined()
      expect(sessionResult.session_id).toContain('e2e_test')
      
      testSessionId = sessionResult.session_id

      // Step 2: Execute command in session
      const executeInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-execute-1',
        tool_use_id: 'e2e-tool-4',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'execute_in_runner_session',
        tool_input: {
          session_id: testSessionId,
          command: 'echo "Hello from E2E test"'
        }
      }

      const executeResult = await orchestrator.executeToolDirect('execute_in_runner_session', executeInstruction)
      
      expect(executeResult).toBeDefined()
      expect(executeResult.status).toBe('success')
      expect(executeResult.stdout).toContain('Hello from E2E test')
      expect(executeResult.exit_code).toBe(0)

      // Step 3: Get session state
      const stateInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-state-1',
        tool_use_id: 'e2e-tool-5',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'get_runner_session_state',
        tool_input: {
          session_id: testSessionId
        }
      }

      const stateResult = await orchestrator.executeToolDirect('get_runner_session_state', stateInstruction)
      
      expect(stateResult).toBeDefined()
      expect(stateResult.status).toBe('success')
      expect(stateResult.cwd).toBeDefined()
      expect(stateResult.environment_variables).toBeDefined()

      // Step 4: Set environment variable
      const envInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-env-1',
        tool_use_id: 'e2e-tool-6',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'set_runner_session_env_var',
        tool_input: {
          session_id: testSessionId,
          var_name: 'E2E_TEST_VAR',
          var_value: 'test_value_123'
        }
      }

      const envResult = await orchestrator.executeToolDirect('set_runner_session_env_var', envInstruction)
      
      expect(envResult).toBeDefined()
      expect(envResult.status).toBe('success')
      expect(envResult.variable_name).toBe('E2E_TEST_VAR')
      expect(envResult.variable_value).toBe('test_value_123')

      // Step 5: Verify environment variable was set
      const verifyInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-verify-1',
        tool_use_id: 'e2e-tool-7',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'execute_in_runner_session',
        tool_input: {
          session_id: testSessionId,
          command: 'echo $E2E_TEST_VAR'
        }
      }

      const verifyResult = await orchestrator.executeToolDirect('execute_in_runner_session', verifyInstruction)
      
      expect(verifyResult).toBeDefined()
      expect(verifyResult.status).toBe('success')
      expect(verifyResult.stdout).toContain('test_value_123')
    }, 30000)

    it('should handle str_replace_editor file operations', async () => {
      const testFilePath = '/tmp/e2e_test_file.txt'
      
      // Step 1: Create a test file
      const createInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-create-1',
        tool_use_id: 'e2e-tool-8',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'str_replace_editor',
        tool_input: {
          command: 'create',
          path: testFilePath,
          file_text: 'Hello, World!\nThis is a test file.\nEnd of file.'
        }
      }

      const createResult = await orchestrator.executeToolDirect('str_replace_editor', createInstruction)
      
      expect(createResult).toBeDefined()
      expect(createResult.status).toBe('success')
      expect(createResult.message).toContain('File created successfully')

      // Step 2: Read the file to verify creation
      const readInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-read-2',
        tool_use_id: 'e2e-tool-9',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: [testFilePath]
        }
      }

      const readResult = await orchestrator.executeToolDirect('read_files', readInstruction)
      
      expect(readResult).toBeDefined()
      expect(readResult.status).toBe('success')
      expect(readResult.files[0].content).toContain('Hello, World!')
      expect(readResult.files[0].content).toContain('This is a test file.')

      // Step 3: Replace text in the file
      const replaceInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-replace-1',
        tool_use_id: 'e2e-tool-10',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'str_replace_editor',
        tool_input: {
          command: 'str_replace',
          path: testFilePath,
          old_str: 'World',
          new_str: 'Universe'
        }
      }

      const replaceResult = await orchestrator.executeToolDirect('str_replace_editor', replaceInstruction)
      
      expect(replaceResult).toBeDefined()
      expect(replaceResult.status).toBe('success')
      expect(replaceResult.message).toContain('has been edited')

      // Step 4: Verify the replacement
      const verifyReadResult = await orchestrator.executeToolDirect('read_files', readInstruction)
      
      expect(verifyReadResult.files[0].content).toContain('Hello, Universe!')
      expect(verifyReadResult.files[0].content).not.toContain('Hello, World!')

      // Cleanup: Remove test file
      try {
        const fs = await import('fs/promises')
        await fs.unlink(testFilePath)
      } catch (error) {
        console.warn('Failed to cleanup test file:', error)
      }
    }, 20000)
  })

  describe('Error Handling in Real Environment', () => {
    it('should handle file not found errors', async () => {
      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-error-1',
        tool_use_id: 'e2e-tool-11',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'read_files',
        tool_input: {
          files: ['/nonexistent/file/path.txt']
        }
      }

      const result = await orchestrator.executeToolDirect('read_files', jobInstruction)
      
      expect(result).toBeDefined()
      expect(result.status).toBe('error')
      expect(result.error).toContain('not found')
    })

    it('should handle invalid path errors in str_replace_editor', async () => {
      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-error-2',
        tool_use_id: 'e2e-tool-12',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'str_replace_editor',
        tool_input: {
          command: 'create',
          path: 'relative/path/file.txt',
          file_text: 'content'
        }
      }

      const result = await orchestrator.executeToolDirect('str_replace_editor', jobInstruction)
      
      expect(result).toBeDefined()
      expect(result.status).toBe('error')
      expect(result.error).toContain('not absolute')
    })

    it('should handle session not found errors', async () => {
      const jobInstruction: JobInstructionV1 = {
        schema_version: '1.0.0',
        job_id: 'e2e-error-3',
        tool_use_id: 'e2e-tool-13',
        session_id: 'e2e-session-1',
        cwd: process.cwd(),
        tool_name: 'execute_in_runner_session',
        tool_input: {
          session_id: 'nonexistent_session_123',
          command: 'echo "test"'
        }
      }

      const result = await orchestrator.executeToolDirect('execute_in_runner_session', jobInstruction)
      
      expect(result).toBeDefined()
      expect(result.status).toBe('error')
      expect(result.error).toContain('session')
    })
  })
})