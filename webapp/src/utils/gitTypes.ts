export interface RepoStatusEntry {
  status: string; // e.g. "M", "A", "D", "??"
  path: string;   // relative file path from repo root
}

// TypeScript type-only exports vanish at runtime.
// Add a dummy export to keep the module "alive" for ESM importers.
export const __KEEP_MODULE__ = true;