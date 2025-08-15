/**
 * MCP Server Installation Helper
 *
 * Handles automatic installation of MCP servers via npm or Docker
 * before they can be started by the McpServerManager.
 *
 * Uses Tauri shell plugin instead of Node.js child_process for renderer compatibility.
 */

import { Command } from '@tauri-apps/plugin-shell';
import { McpServerConfig } from './types';

/**
 * Helper function to run shell commands using Tauri shell plugin
 */
export async function run(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    const cmd = new Command(command, args);
    const result = await cmd.execute();

    if (result.code !== 0) {
        throw new Error(`Command failed with exit code ${result.code}: ${result.stderr}`);
    }

    return {
        stdout: result.stdout,
        stderr: result.stderr
    };
}

/**
 * Ensures an MCP server is installed and ready to run.
 *
 * For npm packages: Attempts to run the package with --help to verify it's available
 * For Docker images: Checks if image exists locally, pulls if needed
 *
 * @param config - The MCP server configuration
 * @throws Error if installation fails
 */
export async function ensureMcpInstalled(config: McpServerConfig): Promise<void> {
    console.log(`🔧 [MCP Install] Ensuring ${config.name} is installed...`);

    try {
        if (config.execPath === 'npx') {
            await ensureNpmPackageInstalled(config);
        } else if (config.execPath === 'docker') {
            await ensureDockerImageAvailable(config);
        } else {
            // For other executables, assume they're already available
            console.log(`✅ [MCP Install] Assuming ${config.execPath} is available`);
        }
    } catch (installError) {
        console.error('Installation failed:', installError);
        throw installError;
    }
}

/**
 * Ensures an npm package is available via npx
 */
async function ensureNpmPackageInstalled(config: McpServerConfig): Promise<void> {
    if (!config.args || config.args.length === 0) {
        throw new Error('Package args not specified for npm installation');
    }

    // Extract package name from args (remove flags like -y)
    const packageName = config.args.find(arg => !arg.startsWith('-')) || config.args[0];

    if (!packageName) {
        throw new Error('Package name not found in args');
    }

    console.log(`📦 [MCP Install] Verifying npm package: ${packageName}`);

    try {
        // Try to run the package with --help to verify it's available
        await run('npx', ['--yes', packageName, '--help']);
        console.log('Package installation verified');
    } catch {
        console.log(`📥 [MCP Install] Package ${packageName} not available, npx will install on first run`);
    }
}

/**
 * Ensures a Docker image is available locally
 */
async function ensureDockerImageAvailable(config: McpServerConfig): Promise<void> {
    if (!config.args || config.args.length === 0) {
        throw new Error('Docker image name not specified in args');
    }

    const imageName = config.args[0];
    console.log(`🐳 [MCP Install] Checking Docker image: ${imageName}`);

    try {
        // Check if image exists locally
        await run('docker', ['image', 'inspect', imageName]);
        console.log(`✅ [MCP Install] Docker image already available: ${imageName}`);
    } catch {
        // Image doesn't exist, try to pull it
        console.log(`Docker image ${imageName} not found, attempting to pull...`);
        await run('docker', ['pull', imageName]);
        console.log('Docker pull completed');
    }
}
