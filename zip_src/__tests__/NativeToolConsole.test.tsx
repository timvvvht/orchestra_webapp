import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock all dependencies first
const mockExecuteTool = vi.fn();
const mockExecuteToolCall = vi.fn();
const mockIsNativeTool = vi.fn();
const mockGetAllTools = vi.fn();
const mockGetToolSource = vi.fn();

// Mock hooks
vi.mock('../hooks/useNativeTools', () => ({
  useNativeTools: vi.fn()
}));

vi.mock('../hooks/useLocalToolOrchestrator', () => ({
  useOrchestrator: vi.fn()
}));

// Mock presets
vi.mock('../devtool-presets/nativeToolPresets', () => ({
  presets: [
    {
      label: 'Test Preset 1',
      tool: 'search_files_v2',
      description: 'Test description',
      input: { root: '/test', filename_glob: '*.rs' }
    },
    {
      label: 'Test Preset 2',
      tool: 'read_files',
      description: 'Another test',
      input: { files: ['/test/file.txt'] }
    }
  ]
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-title">{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, size }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="scroll-area" className={className}>{children}</div>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => 
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => 
    <div data-testid="alert" data-variant={variant}>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="alert-description">{children}</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => 
    <div data-testid="loader2-icon" className={className}>Loading...</div>,
  Play: ({ className }: { className?: string }) => 
    <div data-testid="play-icon" className={className}>▶</div>,
  AlertCircle: ({ className }: { className?: string }) => 
    <div data-testid="alert-circle-icon" className={className}>⚠</div>
}));

// Import the component after mocks
import NativeToolConsole from '../pages/NativeToolConsole';
import { useNativeTools } from '../hooks/useNativeTools';
import { useOrchestrator } from '../hooks/useLocalToolOrchestrator';

// Get the mocked functions
const mockedUseNativeTools = vi.mocked(useNativeTools);
const mockedUseOrchestrator = vi.mocked(useOrchestrator);

describe('NativeToolConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock implementations
    mockIsNativeTool.mockImplementation((toolName: string) => 
      ['search_files_v2', 'read_files'].includes(toolName)
    );
    mockGetAllTools.mockReturnValue({
      native: ['search_files_v2', 'read_files'],
      python: []
    });
    mockGetToolSource.mockImplementation((toolName: string) => 
      mockIsNativeTool(toolName) ? 'rust' : 'python'
    );
    mockExecuteToolCall.mockResolvedValue({
      success: true,
      data: { result: 'test result' },
      executionTime: 100
    });

    // Set up hook mocks
    mockedUseNativeTools.mockReturnValue({
      tools: [
        { name: 'search_files_v2' },
        { name: 'list_directory' },
        { name: 'read_files' }
      ],
      loading: false,
      error: null,
      executeTool: mockExecuteTool
    });

    mockedUseOrchestrator.mockReturnValue({
      executeToolCall: mockExecuteToolCall,
      isNativeTool: mockIsNativeTool,
      getAllTools: mockGetAllTools,
      getToolSource: mockGetToolSource
    });
  });

  it('renders the main console interface', () => {
    render(<NativeToolConsole />);
    
    expect(screen.getByText('🛠 Native-Tool Test Console')).toBeInTheDocument();
    expect(screen.getByText('Auto-discover and test native Rust tools with predefined presets')).toBeInTheDocument();
  });

  it('displays available tools', () => {
    render(<NativeToolConsole />);
    
    expect(screen.getByText('Available Tools')).toBeInTheDocument();
    expect(screen.getByText('3 tools discovered from backend')).toBeInTheDocument();
    expect(screen.getByText('search_files_v2')).toBeInTheDocument();
    expect(screen.getByText('list_directory')).toBeInTheDocument();
    expect(screen.getByText('read_files')).toBeInTheDocument();
  });

  it('displays presets section', () => {
    render(<NativeToolConsole />);
    
    expect(screen.getByText('Presets')).toBeInTheDocument();
    expect(screen.getByText('Test Preset 1')).toBeInTheDocument();
    expect(screen.getByText('Test Preset 2')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('shows Rust badge for native tools', () => {
    render(<NativeToolConsole />);
    
    const rustBadges = screen.getAllByText('🦀 Rust');
    expect(rustBadges.length).toBeGreaterThan(0);
  });

  it('executes a preset when clicked', async () => {
    render(<NativeToolConsole />);
    
    const playButtons = screen.getAllByTestId('play-icon');
    const firstPresetButton = playButtons[0].closest('button');
    
    expect(firstPresetButton).not.toBeDisabled();
    
    fireEvent.click(firstPresetButton!);
    
    await waitFor(() => {
      expect(mockExecuteToolCall).toHaveBeenCalledWith(
        'search_files_v2',
        { root: '/test', filename_glob: '*.rs' }
      );
    });
  });

  it('displays execution results', async () => {
    mockExecuteToolCall.mockResolvedValue({
      success: true,
      data: { files: ['test.rs', 'main.rs'] },
      executionTime: 150
    });

    render(<NativeToolConsole />);
    
    const playButtons = screen.getAllByTestId('play-icon');
    const firstPresetButton = playButtons[0].closest('button');
    
    fireEvent.click(firstPresetButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Test Preset 1')).toBeInTheDocument();
    });

    // Wait for the result to appear
    await waitFor(() => {
      expect(screen.getByText('150ms')).toBeInTheDocument();
    });
  });

  it('handles execution errors', async () => {
    mockExecuteToolCall.mockResolvedValue({
      success: false,
      error: 'Tool execution failed',
      executionTime: 0
    });

    render(<NativeToolConsole />);
    
    const playButtons = screen.getAllByTestId('play-icon');
    const firstPresetButton = playButtons[0].closest('button');
    
    fireEvent.click(firstPresetButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Tool execution failed')).toBeInTheDocument();
    });
  });

  it('disables buttons for unavailable tools', () => {
    // Mock a tool that's not available
    mockedUseNativeTools.mockReturnValueOnce({
      tools: [{ name: 'available_tool' }], // Only one tool available
      loading: false,
      error: null,
      executeTool: mockExecuteTool
    });

    render(<NativeToolConsole />);
    
    const playButtons = screen.getAllByTestId('play-icon');
    
    // The first preset uses 'search_files_v2' which is not in the available tools
    const firstPresetButton = playButtons[0].closest('button');
    expect(firstPresetButton).toBeDisabled();
  });

  it('shows loading state', () => {
    mockedUseNativeTools.mockReturnValueOnce({
      tools: [],
      loading: true,
      error: null,
      executeTool: mockExecuteTool
    });

    render(<NativeToolConsole />);
    
    expect(screen.getByText('Loading native tools...')).toBeInTheDocument();
    expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockedUseNativeTools.mockReturnValueOnce({
      tools: [],
      loading: false,
      error: new Error('Failed to load tools'),
      executeTool: mockExecuteTool
    });

    render(<NativeToolConsole />);
    
    expect(screen.getByText('Error loading native tools: Failed to load tools')).toBeInTheDocument();
    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
  });

  it('shows manual input section', () => {
    render(<NativeToolConsole />);
    
    expect(screen.getByText('Raw JSON Input')).toBeInTheDocument();
    expect(screen.getByText('Manually test any tool with custom input')).toBeInTheDocument();
    expect(screen.getByText('Execute (Manual input coming soon)')).toBeInTheDocument();
  });

  it('displays results section initially empty', () => {
    render(<NativeToolConsole />);
    
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText('Click a preset to see results here')).toBeInTheDocument();
  });
});
