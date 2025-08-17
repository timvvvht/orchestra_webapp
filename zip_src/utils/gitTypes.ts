export interface RepoStatusEntry {
  status: string; // e.g. "M", "A", "D", "??"
  path: string;   // relative file path from repo root
}