import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { globalServiceManager } from "../GlobalServiceManager";

// Mock Tauri invoke function
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock isTauriEnvironment to always return true for these tests
vi.mock("@/lib/isTauri", () => ({
  isTauriEnvironment: () => true,
}));

// Get the mocked invoke function
const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe("GlobalServiceManager SSE Relay Integration", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset mocks but don't destroy the singleton
    vi.clearAllMocks();
    
    // Manually reset relay state for clean test isolation
    (globalServiceManager as any).relayStartedFor = null;
    (globalServiceManager as any).relayStartInFlight = null;
  });

  describe("handleAuthChange", () => {
    it("should start SSE relay when user ID is provided", async () => {
      const userId = "test-user-123";

      await globalServiceManager.handleAuthChange(userId);

      expect(mockInvoke).toHaveBeenCalledWith("sse_relay_start", {
        user_id: userId,
      });
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it("should stop SSE relay when user ID is null", async () => {
      // First start the relay
      await globalServiceManager.handleAuthChange("test-user-123");
      mockInvoke.mockClear();

      // Then stop it
      await globalServiceManager.handleAuthChange(null);

      expect(mockInvoke).toHaveBeenCalledWith("sse_relay_stop");
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it("should not start SSE relay if already started for same user", async () => {
      const userId = "test-user-123";

      // First call should start the relay
      await globalServiceManager.handleAuthChange(userId);
      expect(mockInvoke).toHaveBeenCalledWith("sse_relay_start", {
        user_id: userId,
      });

      // Reset mock to track second call
      mockInvoke.mockClear();

      // Second call with same user should not start again
      await globalServiceManager.handleAuthChange(userId);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should start SSE relay for different user", async () => {
      const firstUser = "test-user-123";
      const secondUser = "test-user-456";

      // Start for first user
      await globalServiceManager.handleAuthChange(firstUser);
      expect(mockInvoke).toHaveBeenCalledWith("sse_relay_start", {
        user_id: firstUser,
      });

      // Reset mock
      mockInvoke.mockClear();

      // Start for different user should work
      await globalServiceManager.handleAuthChange(secondUser);
      expect(mockInvoke).toHaveBeenCalledWith("sse_relay_start", {
        user_id: secondUser,
      });
    });

    it("should handle concurrent calls gracefully", async () => {
      const userId = "test-user-123";

      // Make invoke take some time to simulate async operation
      mockInvoke.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Reset the relay state to ensure clean test
      (globalServiceManager as any).relayStartedFor = null;
      (globalServiceManager as any).relayStartInFlight = null;

      // Start the first call and wait a bit for in-flight to be set
      const firstCall = globalServiceManager.handleAuthChange(userId);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Now make additional calls - these should be deduplicated
      const secondCall = globalServiceManager.handleAuthChange(userId);
      const thirdCall = globalServiceManager.handleAuthChange(userId);

      await Promise.all([firstCall, secondCall, thirdCall]);

      // Should only call invoke once due to in-flight tracking
      expect(mockInvoke).toHaveBeenCalledWith("sse_relay_start", {
        user_id: userId,
      });
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it("should log error when SSE relay start fails", async () => {
      const userId = "test-user-123";
      const error = new Error("SSE relay start failed");
      mockInvoke.mockRejectedValueOnce(error);

      // Spy on console.error
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await globalServiceManager.handleAuthChange(userId);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[GSM] ❌ Failed to start SSE relay:",
        error
      );

      consoleSpy.mockRestore();
    });

    it("should log error when SSE relay stop fails", async () => {
      const error = new Error("SSE relay stop failed");
      mockInvoke.mockRejectedValueOnce(error);

      // Spy on console.error
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await globalServiceManager.handleAuthChange(null);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[GSM] ❌ Failed to stop SSE relay:",
        error
      );

      consoleSpy.mockRestore();
    });
  });

  describe("destroy", () => {
    it("should stop SSE relay if running during destroy", async () => {
      const userId = "test-user-123";

      // Start the relay
      await globalServiceManager.handleAuthChange(userId);
      mockInvoke.mockClear();

      // Destroy should stop the relay
      globalServiceManager.destroy();

      // Wait a bit for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockInvoke).toHaveBeenCalledWith("sse_relay_stop");
    });

    it("should reset relay state during destroy", async () => {
      const userId = "test-user-123";

      // Start the relay
      await globalServiceManager.handleAuthChange(userId);

      // Destroy
      globalServiceManager.destroy();

      // Wait a bit for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should be able to start again after destroy
      mockInvoke.mockClear();
      await globalServiceManager.handleAuthChange(userId);
      expect(mockInvoke).toHaveBeenCalledWith("sse_relay_start", {
        user_id: userId,
      });
    });
  });
});
