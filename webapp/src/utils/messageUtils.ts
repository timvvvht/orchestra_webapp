export function sanitizeMessageContent(content: string): string {
  if (!content) return content;

  const lines = content.split(/\r?\n/);

  // Remove bracketed system diagnostics
  const filtered = lines.filter((line) => !/^\[SYSTEM:.*\]$/.test(line.trim()));

  // Remove <instructions> blocks
  const joined = filtered
    .join("\n")
    .replace(/<instructions>[\s\S]*?<\/instructions>/g, "");

  return joined.trim();
}
