export async function invoke(..._args: any[]): Promise<never> {
  throw new Error("Tauri invoke not available in web environment");
}

export default { invoke };