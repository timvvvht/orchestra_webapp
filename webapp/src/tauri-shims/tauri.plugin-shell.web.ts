export async function open(): Promise<never> {
  throw new Error("Tauri shell not available in web environment");
}

export default { open };