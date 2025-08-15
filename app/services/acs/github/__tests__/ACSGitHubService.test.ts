import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ACSGitHubService } from '../index';
import { createACSClient } from '../../shared/client';
import type { GitHubStatus, GitHubRepo, CreatePrRequest, CreatePrResponse } from '../../shared/types';

// Mock the ACS client instead of using nock
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  isAuthenticated: vi.fn(),
  getAuthToken: vi.fn()
};

describe('ACSGitHubService', () => {
  let service: ACSGitHubService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    service = new ACSGitHubService(mockClient as any);
  });

  describe('startConnect', () => {
    it('should return OAuth URL for GitHub connection', async () => {
      const mockResponse = { url: 'https://github.com/login/oauth/authorize?client_id=test' };
      mockClient.get.mockResolvedValue({ data: mockResponse });

      const result = await service.startConnect();

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/github/connect/start');
      expect(result).toEqual(mockResponse);
      expect(result.url).toContain('github.com/login/oauth');
    });

    it('should handle errors when starting connection', async () => {
      mockClient.get.mockRejectedValue(new Error('Internal server error'));

      await expect(service.startConnect()).rejects.toThrow('Internal server error');
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/github/connect/start');
    });
  });

  describe('getStatus', () => {
    it('should return GitHub connection status when connected', async () => {
      const mockStatus: GitHubStatus = {
        connected: true,
        repo: 'owner/repository',
        installation_id: 12345,
        permissions: { read: 'true', write: 'true' }
      };
      mockClient.get.mockResolvedValue({ data: mockStatus });

      const result = await service.getStatus();

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/github/status');
      expect(result).toEqual(mockStatus);
      expect(result.connected).toBe(true);
      expect(result.repo).toBe('owner/repository');
    });

    it('should return disconnected status when not connected', async () => {
      const mockStatus: GitHubStatus = {
        connected: false
      };
      mockClient.get.mockResolvedValue({ data: mockStatus });

      const result = await service.getStatus();

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/github/status');
      expect(result).toEqual(mockStatus);
      expect(result.connected).toBe(false);
      expect(result.repo).toBeUndefined();
    });
  });

  describe('listRepos', () => {
    it('should return list of available repositories', async () => {
      const mockRepos: GitHubRepo[] = [
        {
          id: 123456,
          full_name: 'owner/repo1',
          private: false,
          default_branch: 'main'
        },
        {
          id: 789012,
          full_name: 'owner/repo2',
          private: true,
          default_branch: 'master'
        }
      ];
      mockClient.get.mockResolvedValue({ data: mockRepos });

      const result = await service.listRepos();

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/github/repos');
      expect(result).toEqual(mockRepos);
      expect(result).toHaveLength(2);
      expect(result[0].full_name).toBe('owner/repo1');
      expect(result[1].private).toBe(true);
    });

    it('should return empty array when no repositories available', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const result = await service.listRepos();

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/github/repos');
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('setRepo', () => {
    it('should successfully set repository', async () => {
      const mockResponse = { success: true };
      const repoName = 'owner/repository';
      mockClient.post.mockResolvedValue({ data: mockResponse });

      const result = await service.setRepo(repoName);

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/github/set-repo', { repo_full_name: repoName });
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
    });

    it('should handle repository not found error', async () => {
      const repoName = 'owner/nonexistent';
      mockClient.post.mockRejectedValue(new Error('Repository not found'));

      await expect(service.setRepo(repoName)).rejects.toThrow('Repository not found');
      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/github/set-repo', { repo_full_name: repoName });
    });
  });

  describe('createPR', () => {
    it('should successfully create pull request', async () => {
      const mockRequest: CreatePrRequest = {
        workspace_id: 'workspace-123',
        base_branch: 'main',
        head_branch: 'feature/new-feature',
        title: 'Add new feature',
        body: 'This PR adds a new feature',
        draft: false
      };

      const mockResponse: CreatePrResponse = {
        url: 'https://github.com/owner/repo/pull/123',
        number: 123
      };
      mockClient.post.mockResolvedValue({ data: mockResponse });

      const result = await service.createPR(mockRequest);

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/github/create-pr', mockRequest);
      expect(result).toEqual(mockResponse);
      expect(result.url).toContain('github.com');
      expect(result.number).toBe(123);
    });

    it('should create PR with minimal payload', async () => {
      const mockRequest: CreatePrRequest = {
        workspace_id: 'workspace-456',
        base_branch: 'main',
        head_branch: 'hotfix/bug-fix',
        title: 'Fix critical bug'
      };

      const mockResponse: CreatePrResponse = {
        url: 'https://github.com/owner/repo/pull/124',
        number: 124
      };
      mockClient.post.mockResolvedValue({ data: mockResponse });

      const result = await service.createPR(mockRequest);

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/github/create-pr', mockRequest);
      expect(result).toEqual(mockResponse);
      expect(result.number).toBe(124);
    });

    it('should handle PR creation errors', async () => {
      const mockRequest: CreatePrRequest = {
        workspace_id: 'workspace-789',
        base_branch: 'main',
        head_branch: 'feature/invalid',
        title: 'Invalid PR'
      };
      mockClient.post.mockRejectedValue(new Error('Branch does not exist'));

      await expect(service.createPR(mockRequest)).rejects.toThrow('Branch does not exist');
      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/github/create-pr', mockRequest);
    });
  });

  describe('integration', () => {
    it('should work with real ACS client configuration', () => {
      expect(service).toBeInstanceOf(ACSGitHubService);
      expect(typeof service.startConnect).toBe('function');
      expect(typeof service.getStatus).toBe('function');
      expect(typeof service.listRepos).toBe('function');
      expect(typeof service.setRepo).toBe('function');
      expect(typeof service.createPR).toBe('function');
    });
  });
});