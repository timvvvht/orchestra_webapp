export async function listen(_event: string, _handler: (e: any) => void): Promise<() => void> {
  console.warn("Tauri event listen called in web — returning no-op unlisten");
  return () => {};
}

export default { listen };