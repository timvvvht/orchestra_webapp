// Extend Tauri invoke types for native tools
declare module '@tauri-apps/api/core' {
  export function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  
  // Native tool commands
  export function invoke(cmd: 'list_native_tools'): Promise<string[]>;
  
  // Tool-specific commands (dynamically generated)
  export function invoke(
    cmd: `tool_${string}`, 
    args: { input: Record<string, unknown> }
  ): Promise<unknown>;
}