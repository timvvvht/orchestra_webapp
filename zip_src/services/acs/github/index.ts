import type { ACSClient } from '../shared/client';
import { ACS_ENDPOINTS } from '../shared/types';
import type { GitHubStatus, GitHubRepo, CreatePrRequest, CreatePrResponse } from '../shared/types';

/**
 * ACS GitHub Service
 * Provides GitHub integration functionality through ACS endpoints
 */
export class ACSGitHubService {
    constructor(private client: ACSClient) {}

    /**
     * Start GitHub OAuth connection flow
     * @returns OAuth URL to redirect user to
     */
    async startConnect(): Promise<{ url: string }> {
        const response = await this.client.get(ACS_ENDPOINTS.GITHUB_CONNECT_START);
        return response.data;
    }

    /**
     * Get current GitHub connection status
     * @returns GitHub connection status and repository info
     */
    async getStatus(): Promise<GitHubStatus> {
        const response = await this.client.get(ACS_ENDPOINTS.GITHUB_STATUS);
        return response.data;
    }

    /**
     * List available repositories for the connected GitHub account
     * @returns Array of accessible repositories
     */
    async listRepos(): Promise<GitHubRepo[]> {
        const response = await this.client.get(ACS_ENDPOINTS.GITHUB_REPOS);
        return response.data;
    }

    /**
     * Set the active repository for the current session
     * @param fullName Full repository name (owner/repo)
     * @returns Success status
     */
    async setRepo(fullName: string): Promise<{ success: boolean }> {
        const response = await this.client.post(ACS_ENDPOINTS.GITHUB_SET_REPO, { 
            repo_full_name: fullName 
        });
        return response.data;
    }

    /**
     * Create a pull request from the current workspace
     * @param payload Pull request creation parameters
     * @returns Created pull request information
     */
    async createPR(payload: CreatePrRequest): Promise<CreatePrResponse> {
        const response = await this.client.post(ACS_ENDPOINTS.GITHUB_CREATE_PR, payload);
        return response.data;
    }
}

export default ACSGitHubService;