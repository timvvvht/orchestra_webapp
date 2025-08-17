#!/usr/bin/env node

/**
 * CLI wrapper for PrunedSCMManager
 * This allows the Rust backend to call SCM operations via Tauri's shell command API
 */

import { PrunedSCMManager } from './PrunedSCMManager';
import * as path from 'path';

interface CLIResult {
    success: boolean;
    data?: any;
    error?: string;
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.error(JSON.stringify({
            success: false,
            error: 'Usage: node cli.js <command> <cwd> [args...]'
        }));
        process.exit(1);
    }

    const command = args[0];
    const cwd = path.resolve(args[1]);
    
    const manager = new PrunedSCMManager({});
    
    try {
        let result: CLIResult;
        
        switch (command) {
            case 'checkpoint': {
                const message = args[2] || 'Checkpoint';
                const commitHash = await manager.checkpoint(cwd, message);
                result = {
                    success: true,
                    data: { commitHash }
                };
                break;
            }
            
            case 'getHistory': {
                const history = await manager.getHistory(cwd);
                result = {
                    success: true,
                    data: { history }
                };
                break;
            }
            
            case 'diffBetween': {
                if (args.length < 4) {
                    result = {
                        success: false,
                        error: 'diffBetween requires baseSha and targetSha arguments'
                    };
                    break;
                }
                const baseSha = args[2];
                const targetSha = args[3];
                const diff = await manager.diffBetween(cwd, baseSha, targetSha);
                result = {
                    success: true,
                    data: { diff }
                };
                break;
            }
            
            case 'revert': {
                if (args.length < 3) {
                    result = {
                        success: false,
                        error: 'revert requires sha argument'
                    };
                    break;
                }
                const sha = args[2];
                await manager.revert(cwd, sha);
                result = {
                    success: true,
                    data: { reverted: true }
                };
                break;
            }
            
            case 'getFileAtCommit': {
                if (args.length < 4) {
                    result = {
                        success: false,
                        error: 'getFileAtCommit requires sha and filePath arguments'
                    };
                    break;
                }
                const sha = args[2];
                const filePath = args[3];
                const content = await manager.getFileAtCommit(cwd, sha, filePath);
                result = {
                    success: true,
                    data: { content }
                };
                break;
            }
            
            default:
                result = {
                    success: false,
                    error: `Unknown command: ${command}`
                };
        }
        
        console.log(JSON.stringify(result));
        process.exit(result.success ? 0 : 1);
        
    } catch (error) {
        const result: CLIResult = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
        console.log(JSON.stringify(result));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}