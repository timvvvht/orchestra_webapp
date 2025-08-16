const memTokens = new Map<string, string>();

function key(token: string) {
  return `dl:${token}`;
}

export async function issueToken(env: Env, ip: string, ttlSec: number): Promise<string> {
  const token = crypto.randomUUID();
  const now = Date.now();
  const data = { ip, created: now, expires: now + ttlSec * 1000 };
  // Use KV if available, otherwise fallback to in-memory map
  // @ts-ignore Cloudflare KV type may not exist when KV is not bound
  const kv = (env as any).DOWNLOAD_TOKENS as KVNamespace | undefined;
  if (kv && typeof kv.put === "function") {
    await kv.put(key(token), JSON.stringify(data), { expirationTtl: ttlSec });
  } else {
    memTokens.set(key(token), JSON.stringify(data));
    // naive expiration cleanup
    setTimeout(() => memTokens.delete(key(token)), ttlSec * 1000).unref?.();
  }
  return token;
}

export async function validateAndConsumeToken(env: Env, token: string, ip: string): Promise<{ ok: boolean; reason?: string }> {
  const k = key(token);
  // Prefer KV if available
  // @ts-ignore KV may be absent
  const kv = (env as any).DOWNLOAD_TOKENS as KVNamespace | undefined;
  let raw: string | null = null;
  if (kv && typeof kv.get === "function") {
    raw = await kv.get(k);
    // single-use delete in KV regardless of outcome
    if (raw) await kv.delete(k);
  } else {
    raw = memTokens.get(k) ?? null;
    memTokens.delete(k);
  }
  if (!raw) return { ok: false, reason: "missing" };
  const meta = JSON.parse(raw) as { ip: string; created: number; expires: number };
  if (meta.expires < Date.now()) return { ok: false, reason: "expired" };
  if (meta.ip !== ip) return { ok: false, reason: "ip_mismatch" };
  return { ok: true };
}
