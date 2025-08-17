import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { NativeToolConsole } from '../NativeToolConsole'

// Mock the LocalToolOrchestrator
const mockExecuteToolDirect = vi.fn()
const mockIsNativeTool = vi.fn()
const mockNativeTools = ['search_files', 'read_files', 'str_replace_editor', 'initiate_runner_session']

vi.mock('../../services/localTool/LocalToolOrchestrator', () => ({
  LocalToolOrchestrator: vi.fn().mockImplementation(() => ({
    executeToolDirect: mockExecuteToolDirect,
    isNativeTool: mockIsNativeTool,
    nativeTools: mockNativeTools
  }))
}))

// Mock Tauri API
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

// Wrapper component for routing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('NativeToolConsole Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsNativeTool.mockImplementation((toolName: string) => 
      mockNativeTools.includes(toolName)
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the NativeToolConsole component', () => {
      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      expect(screen.getByText('Native Tool Console')).toBeInTheDocument()
      expect(screen.getByText('Execute native Rust tools directly')).toBeInTheDocument()
    })

    it('should render preset buttons for available tools', () => {
      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      // Check for preset buttons
      expect(screen.getByText('Search Files')).toBeInTheDocument()
      expect(screen.getByText('Read Cargo.toml')).toBeInTheDocument()
      expect(screen.getByText('Create Session')).toBeInTheDocument()
    })

    it('should enable preset buttons for available native tools', () => {
      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const searchButton = screen.getByText('Search Files')
      const readButton = screen.getByText('Read Cargo.toml')
      const sessionButton = screen.getByText('Create Session')

      expect(searchButton).not.toBeDisabled()
      expect(readButton).not.toBeDisabled()
      expect(sessionButton).not.toBeDisabled()
    })
  })

  describe('Tool Execution', () => {
    it('should execute search_files when Search Files preset is clicked', async () => {
      const mockResult = {
        status: 'success',
        files: [
          { path: '/test/file1.rs', matches: ['fn main()'] },
          { path: '/test/file2.rs', matches: ['struct Test'] }
        ]
      }
      mockExecuteToolDirect.mockResolvedValue(mockResult)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const searchButton = screen.getByText('Search Files')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(mockExecuteToolDirect).toHaveBeenCalledWith('search_files', expect.objectContaining({
          tool_name: 'search_files',
          tool_input: expect.objectContaining({
            paths: ['.'],
            pattern: '*.rs',
            content: 'fn'
          })
        }))
      })

      // Check that results are displayed
      await waitFor(() => {
        expect(screen.getByText(/file1.rs/)).toBeInTheDocument()
        expect(screen.getByText(/file2.rs/)).toBeInTheDocument()
      })
    })

    it('should execute read_files when Read Cargo.toml preset is clicked', async () => {
      const mockResult = {
        status: 'success',
        files: [
          { 
            path: '/test/Cargo.toml', 
            content: '[package]\nname = "test"\nversion = "0.1.0"' 
          }
        ]
      }
      mockExecuteToolDirect.mockResolvedValue(mockResult)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const readButton = screen.getByText('Read Cargo.toml')
      fireEvent.click(readButton)

      await waitFor(() => {
        expect(mockExecuteToolDirect).toHaveBeenCalledWith('read_files', expect.objectContaining({
          tool_name: 'read_files',
          tool_input: expect.objectContaining({
            files: ['./Cargo.toml']
          })
        }))
      })

      // Check that results are displayed
      await waitFor(() => {
        expect(screen.getByText(/Cargo.toml/)).toBeInTheDocument()
        expect(screen.getByText(/\[package\]/)).toBeInTheDocument()
      })
    })

    it('should execute initiate_runner_session when Create Session preset is clicked', async () => {
      const mockResult = {
        status: 'success',
        session_id: 'test_session_123',
        cwd: '/test',
        environment_variables: {},
        active_background_jobs: {},
        message: 'Session initialized successfully.'
      }
      mockExecuteToolDirect.mockResolvedValue(mockResult)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const sessionButton = screen.getByText('Create Session')
      fireEvent.click(sessionButton)

      await waitFor(() => {
        expect(mockExecuteToolDirect).toHaveBeenCalledWith('initiate_runner_session', expect.objectContaining({
          tool_name: 'initiate_runner_session',
          tool_input: expect.objectContaining({
            session_id_prefix: 'native_tool_console'
          })
        }))
      })

      // Check that results are displayed
      await waitFor(() => {
        expect(screen.getByText(/test_session_123/)).toBeInTheDocument()
        expect(screen.getByText(/Session initialized successfully/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error messages when tool execution fails', async () => {
      const mockError = new Error('Tool execution failed')
      mockExecuteToolDirect.mockRejectedValue(mockError)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const searchButton = screen.getByText('Search Files')
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/Error executing tool/)).toBeInTheDocument()
        expect(screen.getByText(/Tool execution failed/)).toBeInTheDocument()
      })
    })

    it('should display validation errors from str_replace_editor', async () => {
      const mockResult = {
        status: 'error',
        error: 'Parameter `old_str` is required for command: str_replace. Please provide the string you want to replace.'
      }
      mockExecuteToolDirect.mockResolvedValue(mockResult)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      // Manually trigger str_replace_editor with invalid input
      const customInput = screen.getByPlaceholderText(/Enter tool input JSON/)
      const executeButton = screen.getByText('Execute Tool')

      fireEvent.change(customInput, { 
        target: { 
          value: JSON.stringify({
            tool_name: 'str_replace_editor',
            tool_input: {
              command: 'str_replace',
              path: '/test/file.txt',
              old_str: '',
              new_str: 'replacement'
            }
          })
        }
      })

      fireEvent.click(executeButton)

      await waitFor(() => {
        expect(screen.getByText(/Parameter `old_str` is required/)).toBeInTheDocument()
      })
    })
  })

  describe('Custom Tool Input', () => {
    it('should allow custom tool execution via JSON input', async () => {
      const mockResult = {
        status: 'success',
        message: 'File created successfully at: /test/newfile.txt'
      }
      mockExecuteToolDirect.mockResolvedValue(mockResult)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const customInput = screen.getByPlaceholderText(/Enter tool input JSON/)
      const executeButton = screen.getByText('Execute Tool')

      const toolInput = {
        tool_name: 'str_replace_editor',
        tool_input: {
          command: 'create',
          path: '/test/newfile.txt',
          file_text: 'Hello, World!'
        }
      }

      fireEvent.change(customInput, { 
        target: { value: JSON.stringify(toolInput) }
      })

      fireEvent.click(executeButton)

      await waitFor(() => {
        expect(mockExecuteToolDirect).toHaveBeenCalledWith('str_replace_editor', expect.objectContaining({
          tool_name: 'str_replace_editor',
          tool_input: toolInput.tool_input
        }))
      })

      await waitFor(() => {
        expect(screen.getByText(/File created successfully/)).toBeInTheDocument()
      })
    })

    it('should handle invalid JSON input gracefully', async () => {
      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const customInput = screen.getByPlaceholderText(/Enter tool input JSON/)
      const executeButton = screen.getByText('Execute Tool')

      fireEvent.change(customInput, { 
        target: { value: 'invalid json {' }
      })

      fireEvent.click(executeButton)

      await waitFor(() => {
        expect(screen.getByText(/Invalid JSON input/)).toBeInTheDocument()
      })
    })
  })

  describe('Results Display', () => {
    it('should format and display tool results correctly', async () => {
      const mockResult = {
        status: 'success',
        files: [
          { 
            path: '/test/example.rs', 
            content: 'fn main() {\n    println!("Hello, World!");\n}' 
          }
        ]
      }
      mockExecuteToolDirect.mockResolvedValue(mockResult)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const readButton = screen.getByText('Read Cargo.toml')
      fireEvent.click(readButton)

      await waitFor(() => {
        expect(screen.getByText(/example.rs/)).toBeInTheDocument()
        expect(screen.getByText(/fn main/)).toBeInTheDocument()
        expect(screen.getByText(/println!/)).toBeInTheDocument()
      })
    })

    it('should display execution metadata', async () => {
      const mockResult = {
        status: 'success',
        session_id: 'test_session_123',
        command_id: 'cmd_456',
        exit_code: 0,
        stdout: 'Command executed successfully'
      }
      mockExecuteToolDirect.mockResolvedValue(mockResult)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const sessionButton = screen.getByText('Create Session')
      fireEvent.click(sessionButton)

      await waitFor(() => {
        expect(screen.getByText(/test_session_123/)).toBeInTheDocument()
        expect(screen.getByText(/cmd_456/)).toBeInTheDocument()
        expect(screen.getByText(/exit_code.*0/)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during tool execution', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockExecuteToolDirect.mockReturnValue(mockPromise)

      render(
        <TestWrapper>
          <NativeToolConsole />
        </TestWrapper>
      )

      const searchButton = screen.getByText('Search Files')
      fireEvent.click(searchButton)

      // Should show loading state
      expect(screen.getByText(/Executing/)).toBeInTheDocument()

      // Resolve the promise
      resolvePromise!({ status: 'success', files: [] })

      await waitFor(() => {
        expect(screen.queryByText(/Executing/)).not.toBeInTheDocument()
      })
    })
  })
})