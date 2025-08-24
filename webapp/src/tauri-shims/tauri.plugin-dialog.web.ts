export async function open(): Promise<never> {
  throw new Error("Tauri dialog not available in web environment");
}

export default { open };