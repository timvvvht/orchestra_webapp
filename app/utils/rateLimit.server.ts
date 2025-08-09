const memRate = new Map<string, { count: number; timeout?: any }>();

function rlKey(ip: string, windowSec: number) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSec);
  return `rl:${ip}:${bucket}`;
}

export async function checkRateLimit(env: Env, ip: string) {
  const windowSec = Number((env as any).RATE_LIMIT_WINDOW_SEC ?? 600);
  const max = Number((env as any).RATE_LIMIT_MAX_ATTEMPTS ?? 5);
  const key = rlKey(ip, windowSec);
  // Prefer KV if available, else fallback to in-memory
  // @ts-ignore KV may be absent
  const kv = (env as any).DOWNLOAD_TOKENS as KVNamespace | undefined;
  let count = 0;
  if (kv && typeof kv.get === "function") {
    const currentRaw = await kv.get(key);
    count = currentRaw ? parseInt(currentRaw, 10) : 0;
    count++;
    await kv.put(key, String(count), { expirationTtl: windowSec });
  } else {
    const entry = memRate.get(key);
    count = (entry?.count ?? 0) + 1;
    if (entry?.timeout) clearTimeout(entry.timeout);
    const timeout = setTimeout(() => memRate.delete(key), windowSec * 1000);
    // optional in Node, ignored in Workers
    (timeout as any).unref?.();
    memRate.set(key, { count, timeout });
  }
  return { allowed: count <= max, remaining: Math.max(0, max - count) };
}
