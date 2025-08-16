/**
 * MCP Process Launch Utility
 * 
 * Handles spawning MCP server processes and discovering their listening ports
 * by parsing stdout for port information.
 */

import { Command } from '@tauri-apps/plugin-shell';

export interface LaunchResult {
  pid: number;
  port?: number;
  process: any; // The spawned process handle
}

export interface LaunchOptions {
  execPath: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number; // Timeout in milliseconds to wait for port discovery
}

/**
 * Launch an MCP server process and discover its listening port
 */
export async function launchMcpProcess(options: LaunchOptions): Promise<LaunchResult> {
  const { execPath, args = [], env = {}, timeout = 30000 } = options;
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    let discoveredPort: number | undefined;
    let processHandle: any;
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Timeout waiting for MCP server to start (${timeout}ms)`));
      }
    }, timeout);
    
    try {
      // Create the command
      const command = new Command(execPath, args, {
        env: {
          ...process.env,
          ...env
        }
      });
      
      // Spawn the process
      command.spawn().then((child) => {
        processHandle = child;
        const pid = child.pid;
        
        // Listen for stdout to detect port
        child.stdout.on('data', (data: string) => {
          console.log(`MCP Server stdout: ${data}`);
          
          if (!discoveredPort) {
            const port = parsePortFromOutput(data);
            if (port) {
              discoveredPort = port;
              console.log(`Discovered MCP server port: ${port}`);
              
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve({
                  pid,
                  port: discoveredPort,
                  process: processHandle
                });
              }
            }
          }
        });
        
        // Listen for stderr
        child.stderr.on('data', (data: string) => {
          console.error(`MCP Server stderr: ${data}`);
          
          // Some servers might output port info to stderr
          if (!discoveredPort) {
            const port = parsePortFromOutput(data);
            if (port) {
              discoveredPort = port;
              console.log(`Discovered MCP server port from stderr: ${port}`);
              
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve({
                  pid,
                  port: discoveredPort,
                  process: processHandle
                });
              }
            }
          }
        });
        
        // Handle process exit
        child.on('close', (code: number) => {
          console.log(`MCP Server process exited with code: ${code}`);
          
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            
            if (code === 0) {
              // Process exited successfully but we didn't find a port
              resolve({
                pid,
                port: discoveredPort,
                process: processHandle
              });
            } else {
              reject(new Error(`MCP Server process exited with code ${code}`));
            }
          }
        });
        
        child.on('error', (error: Error) => {
          console.error(`MCP Server process error:`, error);
          
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            reject(error);
          }
        });
        
        // If no port is discovered within a shorter timeframe, resolve anyway
        // This handles cases where the server doesn't output port info
        setTimeout(() => {
          if (!resolved && !discoveredPort) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({
              pid,
              port: undefined, // No port discovered
              process: processHandle
            });
          }
        }, 5000); // 5 second grace period for port discovery
        
      }).catch((error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      });
      
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        reject(error);
      }
    }
  });
}

/**
 * Parse port number from process output
 * Looks for common patterns like:
 * - "Listening on http://localhost:3000"
 * - "Server started on port 3000"
 * - "PORT=3000"
 * - "Listening on 127.0.0.1:3000"
 */
function parsePortFromOutput(output: string): number | undefined {
  // Common patterns for port detection
  const patterns = [
    // "Listening on http://localhost:3000" or "Listening on https://localhost:3000"
    /Listening on (?:http|https):\/\/(?:localhost|127\.0\.0\.1):(\d+)/i,
    
    // "Server started on port 3000"
    /Server started on port (\d+)/i,
    
    // "Listening on port 3000"
    /Listening on port (\d+)/i,
    
    // "PORT=3000"
    /PORT=(\d+)/i,
    
    // "Listening on 127.0.0.1:3000" or "Listening on localhost:3000"
    /Listening on (?:localhost|127\.0\.0\.1):(\d+)/i,
    
    // "Started server on :3000"
    /Started server on :(\d+)/i,
    
    // "Running on port 3000"
    /Running on port (\d+)/i,
    
    // Generic ":3000" pattern (be careful with this one)
    /:(\d{4,5})\b/
  ];
  
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match && match[1]) {
      const port = parseInt(match[1], 10);
      // Validate port range (common server ports)
      if (port >= 1000 && port <= 65535) {
        return port;
      }
    }
  }
  
  return undefined;
}

/**
 * Kill an MCP server process
 */
export async function killMcpProcess(processHandle: any): Promise<void> {
  try {
    if (processHandle && typeof processHandle.kill === 'function') {
      await processHandle.kill();
    }
  } catch (error) {
    console.error('Failed to kill MCP process:', error);
    throw error;
  }
}

/**
 * Check if an MCP server process is still running
 */
export async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    // On Unix systems, sending signal 0 checks if process exists
    const command = new Command('kill', ['-0', pid.toString()]);
    const result = await command.execute();
    return result.code === 0;
  } catch (error) {
    // If kill command fails, process is likely not running
    return false;
  }
}

/**
 * Get process information for debugging
 */
export async function getProcessInfo(pid: number): Promise<any> {
  try {
    const command = new Command('ps', ['-p', pid.toString(), '-o', 'pid,ppid,cmd']);
    const result = await command.execute();
    return {
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    console.error('Failed to get process info:', error);
    return null;
  }
}