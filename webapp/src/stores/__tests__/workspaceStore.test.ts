import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWorkspaceStore } from "../workspaceStore";

// Mock crypto.subtle for testing
const mockDigest = new ArrayBuffer(32);
const mockCrypto = {
  subtle: {
    digest: vi.fn().mockResolvedValue(mockDigest),
  },
};

describe("workspaceStore", () => {
  beforeEach(() => {
    // Reset store state
    useWorkspaceStore.setState({
      workspaces: {},
      activeWorkspaceId: null,
      isLoading: false,
      error: null,
    });

    // Mock crypto.subtle
    Object.defineProperty(global, "crypto", {
      value: mockCrypto,
      writable: true,
    });
  });

  describe("createWorkspace", () => {
    it("should create a new workspace with SHA256 ID", async () => {
      const params = {
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
        name: "My Workspace",
        description: "Test workspace",
      };

      const workspace = await useWorkspaceStore
        .getState()
        .createWorkspace(params);

      expect(workspace).toBeDefined();
      expect(workspace.id).toBeDefined();
      expect(workspace.userId).toBe(params.userId);
      expect(workspace.repoId).toBe(params.repoId);
      expect(workspace.repoFullName).toBe(params.repoFullName);
      expect(workspace.branch).toBe(params.branch);
      expect(workspace.name).toBe(params.name);
      expect(workspace.description).toBe(params.description);
      expect(workspace.isActive).toBe(false);
      expect(workspace.createdAt).toBeDefined();
      expect(workspace.updatedAt).toBeDefined();
      expect(workspace.lastAccessedAt).toBeDefined();

      // Verify SHA256 was called
      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith(
        "SHA-256",
        expect.any(Uint8Array)
      );
    });

    it("should return existing workspace if userId:repoId:branch combination exists", async () => {
      const params = {
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      };

      // Create first workspace
      const firstWorkspace = await useWorkspaceStore
        .getState()
        .createWorkspace(params);

      // Create second workspace with same params
      const secondWorkspace = await useWorkspaceStore
        .getState()
        .createWorkspace(params);

      expect(secondWorkspace.id).toBe(firstWorkspace.id);
      expect(secondWorkspace.lastAccessedAt).not.toBe(
        firstWorkspace.lastAccessedAt
      );
    });

    it("should use default name if not provided", async () => {
      const params = {
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      };

      const workspace = await useWorkspaceStore
        .getState()
        .createWorkspace(params);
      expect(workspace.name).toBe("owner/repo/main");
    });
  });

  describe("updateWorkspace", () => {
    it("should update workspace properties", async () => {
      const params = {
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      };

      const workspace = await useWorkspaceStore
        .getState()
        .createWorkspace(params);
      const originalUpdatedAt = workspace.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      useWorkspaceStore.getState().updateWorkspace(workspace.id, {
        name: "Updated Name",
        description: "Updated description",
      });

      const updated = useWorkspaceStore.getState().getWorkspace(workspace.id);
      expect(updated?.name).toBe("Updated Name");
      expect(updated?.description).toBe("Updated description");
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("should not update immutable fields", async () => {
      const params = {
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      };

      const workspace = await useWorkspaceStore
        .getState()
        .createWorkspace(params);
      const originalId = workspace.id;
      const originalUserId = workspace.userId;
      const originalRepoId = workspace.repoId;

      useWorkspaceStore.getState().updateWorkspace(workspace.id, {
        id: "new-id",
        userId: "new-user",
        repoId: 999,
      } as any);

      const updated = useWorkspaceStore.getState().getWorkspace(workspace.id);
      expect(updated?.id).toBe(originalId);
      expect(updated?.userId).toBe(originalUserId);
      expect(updated?.repoId).toBe(originalRepoId);
    });
  });

  describe("setActiveWorkspace", () => {
    it("should set active workspace and deactivate others", async () => {
      const workspace1 = await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo1",
        branch: "main",
      });

      const workspace2 = await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 789,
        repoFullName: "owner/repo2",
        branch: "develop",
      });

      // Set first workspace as active
      useWorkspaceStore.getState().setActiveWorkspace(workspace1.id);

      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
        workspace1.id
      );
      expect(
        useWorkspaceStore.getState().getWorkspace(workspace1.id)?.isActive
      ).toBe(true);
      expect(
        useWorkspaceStore.getState().getWorkspace(workspace2.id)?.isActive
      ).toBe(false);

      // Set second workspace as active
      useWorkspaceStore.getState().setActiveWorkspace(workspace2.id);

      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(
        workspace2.id
      );
      expect(
        useWorkspaceStore.getState().getWorkspace(workspace1.id)?.isActive
      ).toBe(false);
      expect(
        useWorkspaceStore.getState().getWorkspace(workspace2.id)?.isActive
      ).toBe(true);
    });

    it("should clear active workspace when set to null", async () => {
      const workspace = await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      });

      useWorkspaceStore.getState().setActiveWorkspace(workspace.id);
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(workspace.id);

      useWorkspaceStore.getState().setActiveWorkspace(null);
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(null);
      expect(
        useWorkspaceStore.getState().getWorkspace(workspace.id)?.isActive
      ).toBe(false);
    });
  });

  describe("getters", () => {
    it("should get workspace by repo and branch", async () => {
      const workspace = await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      });

      const found = useWorkspaceStore
        .getState()
        .getWorkspaceByRepoAndBranch(456, "main");
      expect(found).toEqual(workspace);
    });

    it("should get workspaces by repo", async () => {
      await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo1",
        branch: "main",
      });

      await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo1",
        branch: "develop",
      });

      await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 789,
        repoFullName: "owner/repo2",
        branch: "main",
      });

      const repoWorkspaces = useWorkspaceStore
        .getState()
        .getWorkspacesByRepo(456);
      expect(repoWorkspaces).toHaveLength(2);
      expect(repoWorkspaces.every((w) => w.repoId === 456)).toBe(true);
    });

    it("should get workspaces by user", async () => {
      await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      });

      await useWorkspaceStore.getState().createWorkspace({
        userId: "user456",
        repoId: 789,
        repoFullName: "owner/repo2",
        branch: "main",
      });

      const userWorkspaces = useWorkspaceStore
        .getState()
        .getWorkspacesByUser("user123");
      expect(userWorkspaces).toHaveLength(1);
      expect(userWorkspaces[0].userId).toBe("user123");
    });

    it("should get recent workspaces", async () => {
      const workspace1 = await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo1",
        branch: "main",
      });

      const workspace2 = await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 789,
        repoFullName: "owner/repo2",
        branch: "develop",
      });

      // Access workspace2 more recently
      useWorkspaceStore.getState().refreshWorkspaceAccess(workspace2.id);

      const recent = useWorkspaceStore.getState().getRecentWorkspaces(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].id).toBe(workspace2.id);
    });
  });

  describe("deleteWorkspace", () => {
    it("should delete workspace", async () => {
      const workspace = await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      });

      useWorkspaceStore.getState().deleteWorkspace(workspace.id);

      expect(
        useWorkspaceStore.getState().getWorkspace(workspace.id)
      ).toBeUndefined();
      expect(useWorkspaceStore.getState().getWorkspaceCount()).toBe(0);
    });

    it("should clear active workspace if deleted", async () => {
      const workspace = await useWorkspaceStore.getState().createWorkspace({
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      });

      useWorkspaceStore.getState().setActiveWorkspace(workspace.id);
      useWorkspaceStore.getState().deleteWorkspace(workspace.id);

      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(null);
    });
  });

  describe("error handling", () => {
    it("should handle errors in createWorkspace", async () => {
      // Mock crypto to throw error
      mockCrypto.subtle.digest.mockRejectedValue(new Error("Crypto error"));

      const params = {
        userId: "user123",
        repoId: 456,
        repoFullName: "owner/repo",
        branch: "main",
      };

      await expect(
        useWorkspaceStore.getState().createWorkspace(params)
      ).rejects.toThrow("Crypto error");
      expect(useWorkspaceStore.getState().error).toBe("Crypto error");
    });

    it("should clear error", () => {
      useWorkspaceStore.setState({ error: "Test error" });
      useWorkspaceStore.getState().clearError();
      expect(useWorkspaceStore.getState().error).toBe(null);
    });
  });
});
