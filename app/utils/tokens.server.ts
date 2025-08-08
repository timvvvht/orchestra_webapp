function key(token: string) {
  return `dl:${token}`;
}

export async function issueToken(env: Env, ip: string, ttlSec: number): Promise<string> {
  const token = crypto.randomUUID();
  const now = Date.now();
  const data = { ip, created: now, expires: now + ttlSec * 1000 };
  // @ts-ignore Cloudflare KV type in Pages
  await env.DOWNLOAD_TOKENS.put(key(token), JSON.stringify(data), { expirationTtl: ttlSec });
  return token;
}

export async function validateAndConsumeToken(env: Env, token: string, ip: string): Promise<{ ok: boolean; reason?: string }> {
  const k = key(token);
  // @ts-ignore KV
  const raw = await env.DOWNLOAD_TOKENS.get(k);
  if (!raw) return { ok: false, reason: "missing" };
  const meta = JSON.parse(raw) as { ip: string; created: number; expires: number };
  // single-use: delete regardless of outcome to prevent replay
  // @ts-ignore KV
  await env.DOWNLOAD_TOKENS.delete(k);
  if (meta.expires < Date.now()) return { ok: false, reason: "expired" };
  if (meta.ip !== ip) return { ok: false, reason: "ip_mismatch" };
  return { ok: true };
}
