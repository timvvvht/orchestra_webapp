import { describe, it, expect } from 'vitest';
import { 
  ACS_ENDPOINTS, 
  GitHubStatus, 
  GitHubRepo, 
  CreatePrRequest, 
  CreatePrResponse 
} from '../types';

describe('GitHub ACS Types', () => {
  it('should have all GitHub endpoints defined in ACS_ENDPOINTS', () => {
    expect(ACS_ENDPOINTS.GITHUB_CONNECT_START).toBe('/api/v1/github/connect/start');
    expect(ACS_ENDPOINTS.GITHUB_CONNECT_CALLBACK).toBe('/api/v1/github/connect/callback');
    expect(ACS_ENDPOINTS.GITHUB_REPOS).toBe('/api/v1/github/repos');
    expect(ACS_ENDPOINTS.GITHUB_INSTALLATIONS).toBe('/api/v1/github/installations');
    expect(ACS_ENDPOINTS.GITHUB_SET_REPO).toBe('/api/v1/github/set-repo');
    expect(ACS_ENDPOINTS.GITHUB_STATUS).toBe('/api/v1/github/status');
    expect(ACS_ENDPOINTS.GITHUB_CREATE_PR).toBe('/api/v1/github/create-pr');
  });

  it('should have no duplicate keys in ACS_ENDPOINTS', () => {
    const endpoints = Object.values(ACS_ENDPOINTS);
    const uniqueEndpoints = new Set(endpoints);
    
    expect(endpoints.length).toBe(uniqueEndpoints.size);
  });

  it('should properly type GitHubStatus interface', () => {
    const status: GitHubStatus = {
      connected: true,
      repo: 'owner/repo',
      installation_id: 12345,
      permissions: { read: 'true', write: 'true' }
    };

    expect(status.connected).toBe(true);
    expect(status.repo).toBe('owner/repo');
    expect(status.installation_id).toBe(12345);
    expect(status.permissions).toEqual({ read: 'true', write: 'true' });
  });

  it('should properly type GitHubRepo interface', () => {
    const repo: GitHubRepo = {
      id: 123456,
      full_name: 'owner/repository',
      private: false,
      default_branch: 'main'
    };

    expect(repo.id).toBe(123456);
    expect(repo.full_name).toBe('owner/repository');
    expect(repo.private).toBe(false);
    expect(repo.default_branch).toBe('main');
  });

  it('should properly type CreatePrRequest interface', () => {
    const request: CreatePrRequest = {
      workspace_id: 'workspace-123',
      base_branch: 'main',
      head_branch: 'feature/new-feature',
      title: 'Add new feature',
      body: 'This PR adds a new feature',
      draft: false
    };

    expect(request.workspace_id).toBe('workspace-123');
    expect(request.base_branch).toBe('main');
    expect(request.head_branch).toBe('feature/new-feature');
    expect(request.title).toBe('Add new feature');
    expect(request.body).toBe('This PR adds a new feature');
    expect(request.draft).toBe(false);
  });

  it('should properly type CreatePrResponse interface', () => {
    const response: CreatePrResponse = {
      url: 'https://github.com/owner/repo/pull/123',
      number: 123
    };

    expect(response.url).toBe('https://github.com/owner/repo/pull/123');
    expect(response.number).toBe(123);
  });

  it('should allow optional fields in interfaces', () => {
    // GitHubStatus with minimal fields
    const minimalStatus: GitHubStatus = {
      connected: false
    };
    expect(minimalStatus.connected).toBe(false);

    // CreatePrRequest with minimal fields
    const minimalRequest: CreatePrRequest = {
      workspace_id: 'workspace-123',
      base_branch: 'main',
      head_branch: 'feature/test',
      title: 'Test PR'
    };
    expect(minimalRequest.workspace_id).toBe('workspace-123');
  });
});