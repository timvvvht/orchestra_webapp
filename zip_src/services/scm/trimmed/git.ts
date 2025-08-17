/**
 * Browser-compatible Git interface for PrunedSCMManager
 * This removes all Node.js dependencies for browser compatibility
 */

import { Commit } from './types';

export interface GitOptions {
    gitPath?: string;
    userAgent?: string;
    version?: string;
    env?: { [key: string]: string };
}

export class Git {
    private gitPath: string;
    private env: { [key: string]: string };

    constructor(options: GitOptions) {
        this.gitPath = options.gitPath || 'git';
        this.env = options.env || {};
    }

    async init(repositoryRoot: string): Promise<void> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        console.log(`Git init requested for ${repositoryRoot}`);
        return Promise.resolve();
    }

    async getRepositoryDotGit(repositoryRoot: string): Promise<string> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        return `${repositoryRoot}/.git`;
    }

    open(repositoryRoot: string, dotGit?: string, realRoot?: string, logger?: any): Repository {
        return new Repository(this, repositoryRoot, dotGit, realRoot, logger);
    }
}

export class Repository {
    private git: Git;
    private repositoryRoot: string;
    private dotGit: string;

    constructor(git: Git, repositoryRoot: string, dotGit?: string, realRoot?: string, logger?: any) {
        this.git = git;
        this.repositoryRoot = repositoryRoot;
        this.dotGit = dotGit || `${repositoryRoot}/.git`;
    }

    async add(paths: string[]): Promise<void> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        console.log(`Git add requested for ${this.repositoryRoot} with paths:`, paths);
        return Promise.resolve();
    }

    async commit(message: string): Promise<void> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        console.log(`Git commit requested for ${this.repositoryRoot} with message: ${message}`);
        return Promise.resolve();
    }

    async getHEAD(): Promise<{ commit?: string }> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        console.log(`Git getHEAD requested for ${this.repositoryRoot}`);
        return Promise.resolve({ commit: 'mock-commit-hash' });
    }

    async log(): Promise<Commit[]> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        console.log(`Git log requested for ${this.repositoryRoot}`);
        return Promise.resolve([
            {
                hash: 'mock-commit-hash',
                message: 'Mock commit message',
                parents: [],
                authorName: 'Mock Author',
                authorEmail: 'mock@example.com',
                authorDate: new Date()
            }
        ]);
    }

    async diffBetween(base: string, target: string): Promise<any[]> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        console.log(`Git diffBetween requested for ${this.repositoryRoot} from ${base} to ${target}`);
        return Promise.resolve([]);
    }

    async buffer(sha: string, filePath: string): Promise<Buffer> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        console.log(`Git buffer requested for ${this.repositoryRoot} sha: ${sha}, file: ${filePath}`);
        return Promise.resolve(Buffer.from('mock file content'));
    }

    async reset(sha: string, hard: boolean = false): Promise<void> {
        // Browser-compatible stub - actual implementation will be in Rust backend
        console.log(`Git reset requested for ${this.repositoryRoot} to ${sha}, hard: ${hard}`);
        return Promise.resolve();
    }

    private mapGitStatusToEnum(status: string): number {
        // Simple mapping - in real implementation this would use the Status enum
        switch (status) {
            case 'A': return 1; // ADDED
            case 'M': return 5; // MODIFIED
            case 'D': return 6; // DELETED
            default: return 0; // UNKNOWN
        }
    }
}