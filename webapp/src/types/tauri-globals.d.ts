declare module "@tauri-apps/api/core" {
  export function invoke<T = any>(cmd: string, args?: any): Promise<T>;
  const _default: { invoke: typeof invoke };
  export default _default;
}
declare module "@tauri-apps/api/event" {
  export function listen(event: string, handler: (e: any) => void): Promise<() => void>;
  const _default: { listen: typeof listen };
  export default _default;
}
declare module "@tauri-apps/plugin-dialog" { export function open(...args: any[]): Promise<any>; }
declare module "@tauri-apps/plugin-shell" { export function open(...args: any[]): Promise<any>; }
declare module "@tauri-apps/api/webviewWindow" { export function getCurrentWebviewWindow(): any; }