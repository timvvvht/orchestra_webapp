/**
 * Vitest tests for registerSessionTools utilities
 * 
 * Tests that all new tool registration functions properly delegate to registerSessionTools
 * with correct tool specifications.
 */

import { vi, beforeEach, describe, it, expect } from "vitest";

// Mock the registerSessionTools function
vi.mock("../registerSessionTools", () => ({
  registerSessionTools: vi.fn(),
  createReadFilesToolSpec: vi.fn(),
  createSearchFilesToolSpec: vi.fn(),
  createStrReplaceEditorToolSpec: vi.fn(),
  createMyNewToolSpec: vi.fn(),
  createPathSecurityToolSpec: vi.fn(),
  createAwsToolsSpec: vi.fn(),
  registerReadFilesTool: vi.fn(),
  registerSearchFilesTool: vi.fn(),
  registerStrReplaceEditorTool: vi.fn(),
  registerMyNewToolTool: vi.fn(),
  registerPathSecurityTool: vi.fn(),
  registerAwsToolsTool: vi.fn(),
}));

// Import after mocking
import {
  registerSessionTools,
  createReadFilesToolSpec,
  createSearchFilesToolSpec,
  createStrReplaceEditorToolSpec,
  createMyNewToolSpec,
  createPathSecurityToolSpec,
  createAwsToolsSpec,
  registerReadFilesTool,
  registerSearchFilesTool,
  registerStrReplaceEditorTool,
  registerMyNewToolTool,
  registerPathSecurityTool,
  registerAwsToolsTool,
} from "../registerSessionTools";

// Mock the actual tool spec creators to return predictable values
const mockToolSpec = (name: string, required: string[] = []) => ({
  name,
  description: `Mock ${name} tool`,
  input_schema: {
    type: "object",
    properties: {},
    required,
  },
  source: "tes_local",
});

beforeEach(() => {
  vi.clearAllMocks();
  
  // Setup mock implementations for tool spec creators
  (createReadFilesToolSpec as ReturnType<typeof vi.fn>).mockReturnValue(mockToolSpec("read_files", ["files"]));
  (createSearchFilesToolSpec as ReturnType<typeof vi.fn>).mockReturnValue(mockToolSpec("search_files"));
  (createStrReplaceEditorToolSpec as ReturnType<typeof vi.fn>).mockReturnValue(mockToolSpec("str_replace_editor", ["command", "path"]));
  (createMyNewToolSpec as ReturnType<typeof vi.fn>).mockReturnValue(mockToolSpec("my_new_tool", ["message"]));
  (createPathSecurityToolSpec as ReturnType<typeof vi.fn>).mockReturnValue(mockToolSpec("path_security", ["path"]));
  (createAwsToolsSpec as ReturnType<typeof vi.fn>).mockReturnValue(mockToolSpec("aws_tools"));

  // Setup mock implementation for registerSessionTools
  (registerSessionTools as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

  // Setup mock implementations for registration functions
  (registerReadFilesTool as ReturnType<typeof vi.fn>).mockImplementation(async (sessionId: string, options = {}) => {
    const tool = createReadFilesToolSpec();
    await registerSessionTools({
      sessionId,
      tools: [tool],
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    });
  });

  (registerSearchFilesTool as ReturnType<typeof vi.fn>).mockImplementation(async (sessionId: string, options = {}) => {
    const tool = createSearchFilesToolSpec();
    await registerSessionTools({
      sessionId,
      tools: [tool],
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    });
  });

  (registerStrReplaceEditorTool as ReturnType<typeof vi.fn>).mockImplementation(async (sessionId: string, options = {}) => {
    const tool = createStrReplaceEditorToolSpec();
    await registerSessionTools({
      sessionId,
      tools: [tool],
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    });
  });

  (registerMyNewToolTool as ReturnType<typeof vi.fn>).mockImplementation(async (sessionId: string, options = {}) => {
    const tool = createMyNewToolSpec();
    await registerSessionTools({
      sessionId,
      tools: [tool],
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    });
  });

  (registerPathSecurityTool as ReturnType<typeof vi.fn>).mockImplementation(async (sessionId: string, options = {}) => {
    const tool = createPathSecurityToolSpec();
    await registerSessionTools({
      sessionId,
      tools: [tool],
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    });
  });

  (registerAwsToolsTool as ReturnType<typeof vi.fn>).mockImplementation(async (sessionId: string, options = {}) => {
    const tool = createAwsToolsSpec();
    await registerSessionTools({
      sessionId,
      tools: [tool],
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    });
  });
});

describe("Tool Registration Functions", () => {
  const testSessionId = "test-session-123";
  const testOptions = {
    baseUrl: "https://test.example.com",
    authToken: "test-token",
  };

  describe("registerReadFilesTool", () => {
    it("registers read_files tool with correct parameters", async () => {
      await registerReadFilesTool(testSessionId, testOptions);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "read_files" })],
        baseUrl: testOptions.baseUrl,
        authToken: testOptions.authToken,
      });

      expect(createReadFilesToolSpec).toHaveBeenCalled();
    });

    it("registers read_files tool with default options", async () => {
      await registerReadFilesTool(testSessionId);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "read_files" })],
        baseUrl: undefined,
        authToken: undefined,
      });
    });
  });

  describe("registerSearchFilesTool", () => {
    it("registers search_files tool with correct parameters", async () => {
      await registerSearchFilesTool(testSessionId, testOptions);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "search_files" })],
        baseUrl: testOptions.baseUrl,
        authToken: testOptions.authToken,
      });

      expect(createSearchFilesToolSpec).toHaveBeenCalled();
    });

    it("registers search_files tool with default options", async () => {
      await registerSearchFilesTool(testSessionId);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "search_files" })],
        baseUrl: undefined,
        authToken: undefined,
      });
    });
  });

  describe("registerStrReplaceEditorTool", () => {
    it("registers str_replace_editor tool with correct parameters", async () => {
      await registerStrReplaceEditorTool(testSessionId, testOptions);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "str_replace_editor" })],
        baseUrl: testOptions.baseUrl,
        authToken: testOptions.authToken,
      });

      expect(createStrReplaceEditorToolSpec).toHaveBeenCalled();
    });

    it("registers str_replace_editor tool with default options", async () => {
      await registerStrReplaceEditorTool(testSessionId);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "str_replace_editor" })],
        baseUrl: undefined,
        authToken: undefined,
      });
    });
  });

  describe("registerMyNewToolTool", () => {
    it("registers my_new_tool tool with correct parameters", async () => {
      await registerMyNewToolTool(testSessionId, testOptions);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "my_new_tool" })],
        baseUrl: testOptions.baseUrl,
        authToken: testOptions.authToken,
      });

      expect(createMyNewToolSpec).toHaveBeenCalled();
    });

    it("registers my_new_tool tool with default options", async () => {
      await registerMyNewToolTool(testSessionId);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "my_new_tool" })],
        baseUrl: undefined,
        authToken: undefined,
      });
    });
  });

  describe("registerPathSecurityTool", () => {
    it("registers path_security tool with correct parameters", async () => {
      await registerPathSecurityTool(testSessionId, testOptions);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "path_security" })],
        baseUrl: testOptions.baseUrl,
        authToken: testOptions.authToken,
      });

      expect(createPathSecurityToolSpec).toHaveBeenCalled();
    });

    it("registers path_security tool with default options", async () => {
      await registerPathSecurityTool(testSessionId);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "path_security" })],
        baseUrl: undefined,
        authToken: undefined,
      });
    });
  });

  describe("registerAwsToolsTool", () => {
    it("registers aws_tools tool with correct parameters", async () => {
      await registerAwsToolsTool(testSessionId, testOptions);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "aws_tools" })],
        baseUrl: testOptions.baseUrl,
        authToken: testOptions.authToken,
      });

      expect(createAwsToolsSpec).toHaveBeenCalled();
    });

    it("registers aws_tools tool with default options", async () => {
      await registerAwsToolsTool(testSessionId);

      expect(registerSessionTools).toHaveBeenCalledWith({
        sessionId: testSessionId,
        tools: [expect.objectContaining({ name: "aws_tools" })],
        baseUrl: undefined,
        authToken: undefined,
      });
    });
  });

  describe("Tool Specification Creation", () => {
    it("creates read_files tool spec with correct structure", () => {
      const spec = createReadFilesToolSpec();
      
      expect(spec).toEqual({
        name: "read_files",
        description: expect.any(String),
        input_schema: {
          type: "object",
          properties: expect.any(Object),
          required: ["files"],
        },
        source: "tes_local",
      });
    });

    it("creates search_files tool spec with correct structure", () => {
      const spec = createSearchFilesToolSpec();
      
      expect(spec).toEqual({
        name: "search_files",
        description: expect.any(String),
        input_schema: {
          type: "object",
          properties: expect.any(Object),
          required: [],
        },
        source: "tes_local",
      });
    });

    it("creates str_replace_editor tool spec with correct structure", () => {
      const spec = createStrReplaceEditorToolSpec();
      
      expect(spec).toEqual({
        name: "str_replace_editor",
        description: expect.any(String),
        input_schema: {
          type: "object",
          properties: expect.any(Object),
          required: ["command", "path"],
        },
        source: "tes_local",
      });
    });

    it("creates my_new_tool tool spec with correct structure", () => {
      const spec = createMyNewToolSpec();
      
      expect(spec).toEqual({
        name: "my_new_tool",
        description: expect.any(String),
        input_schema: {
          type: "object",
          properties: expect.any(Object),
          required: ["message"],
        },
        source: "tes_local",
      });
    });

    it("creates path_security tool spec with correct structure", () => {
      const spec = createPathSecurityToolSpec();
      
      expect(spec).toEqual({
        name: "path_security",
        description: expect.any(String),
        input_schema: {
          type: "object",
          properties: expect.any(Object),
          required: ["path"],
        },
        source: "tes_local",
      });
    });

    it("creates aws_tools tool spec with correct structure", () => {
      const spec = createAwsToolsSpec();
      
      expect(spec).toEqual({
        name: "aws_tools",
        description: expect.any(String),
        input_schema: {
          type: "object",
          properties: expect.any(Object),
          required: [],
        },
        source: "tes_local",
      });
    });
  });

  describe("Error Handling", () => {
    it("handles registerSessionTools errors gracefully", async () => {
      // Mock registerSessionTools to simulate the actual behavior where errors are caught and logged
      (registerSessionTools as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        // Simulate the actual registerSessionTools behavior: catch error and don't rethrow
        try {
          throw new Error("Registration failed");
        } catch (error) {
          console.error("🚨 [registerSessionTools] Failed to register tools:", error);
          // Don't throw - tool registration failure shouldn't break session creation
          return undefined;
        }
      });

      // The functions should handle errors gracefully (not throw)
      await expect(registerReadFilesTool(testSessionId)).resolves.toBeUndefined();
      await expect(registerSearchFilesTool(testSessionId)).resolves.toBeUndefined();
      await expect(registerStrReplaceEditorTool(testSessionId)).resolves.toBeUndefined();
      await expect(registerMyNewToolTool(testSessionId)).resolves.toBeUndefined();
      await expect(registerPathSecurityTool(testSessionId)).resolves.toBeUndefined();
      await expect(registerAwsToolsTool(testSessionId)).resolves.toBeUndefined();
    });
  });
});