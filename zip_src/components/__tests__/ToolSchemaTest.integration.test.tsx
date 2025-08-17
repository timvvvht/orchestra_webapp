import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import ToolSchemaTest from '../ToolSchemaTest';
import { getAllToolNames, getToolSpec } from '@/utils/toolSpecRegistry';

// Mock toast to avoid actual toasts during tests
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('ToolSchemaTest Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all tool names as clickable buttons', () => {
    // Debug: Check if we can get tool names
    const toolNames = getAllToolNames();
    
    // Let's see what's actually in the registry
    console.log('Tool names in test:', toolNames);
    console.log('Tool names length:', toolNames.length);
    
    // Let's try to get a tool spec to see if the functions work
    const testToolSpec = getToolSpec('apply_patch');
    console.log('Test tool spec:', testToolSpec);
    
    render(<ToolSchemaTest />);

    expect(toolNames.length).toBeGreaterThan(0);

    // Check that each tool name has a button
    toolNames.forEach((toolName) => {
      const button = screen.getByTestId(`tool-btn-${toolName}`);
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(toolName);
    });
  });

  it('displays schema when a tool button is clicked', async () => {
    render(<ToolSchemaTest />);

    // Click on the first tool button
    const firstToolButton = screen.getAllByTestId(/^tool-btn-/)[0];
    const firstToolName = getAllToolNames()[0];
    
    fireEvent.click(firstToolButton);

    // Check that the schema viewer displays the tool name
    const schemaViewer = screen.getByTestId('schema-viewer');
    await waitFor(() => {
      expect(schemaViewer).toHaveTextContent(`"name": "${firstToolName}"`);
    });
  });

  it('updates schema display when different tool is selected', async () => {
    render(<ToolSchemaTest />);

    const toolNames = getAllToolNames();
    if (toolNames.length < 2) {
      // Skip if we don't have at least 2 tools to test with
      return;
    }

    // Click first tool
    const firstButton = screen.getByTestId(`tool-btn-${toolNames[0]}`);
    fireEvent.click(firstButton);

    // Verify first tool schema is shown
    const schemaViewer = screen.getByTestId('schema-viewer');
    await waitFor(() => {
      expect(schemaViewer).toHaveTextContent(`"name": "${toolNames[0]}"`);
    });

    // Click second tool
    const secondButton = screen.getByTestId(`tool-btn-${toolNames[1]}`);
    fireEvent.click(secondButton);

    // Verify second tool schema is shown
    await waitFor(() => {
      expect(schemaViewer).toHaveTextContent(`"name": "${toolNames[1]}"`);
      expect(schemaViewer).not.toHaveTextContent(`"name": "${toolNames[0]}"`);
    });
  });

  it('copies schema to clipboard when copy button is clicked', async () => {
    render(<ToolSchemaTest />);

    // Select a tool first
    const firstToolButton = screen.getAllByTestId(/^tool-btn-/)[0];
    fireEvent.click(firstToolButton);

    // Wait for copy button to appear
    const copyButton = await screen.findByText('Copy Schema');
    expect(copyButton).toBeInTheDocument();

    // Click copy button
    fireEvent.click(copyButton);

    // Verify clipboard was called
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Schema copied to clipboard!');
    });
  });

  it('handles clipboard copy error gracefully', async () => {
    // Mock clipboard to throw error
    const mockClipboard = vi.fn().mockRejectedValue(new Error('Copy failed'));
    Object.assign(navigator, {
      clipboard: {
        writeText: mockClipboard,
      },
    });

    render(<ToolSchemaTest />);

    // Select a tool first
    const firstToolButton = screen.getAllByTestId(/^tool-btn-/)[0];
    fireEvent.click(firstToolButton);

    // Wait for copy button to appear
    const copyButton = await screen.findByText('Copy Schema');
    fireEvent.click(copyButton);

    // Verify error toast was shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to copy schema');
    });
  });
});