function rlKey(ip: string, windowSec: number) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSec);
  return `rl:${ip}:${bucket}`;
}

export async function checkRateLimit(env: Env, ip: string) {
  const windowSec = Number((env as any).RATE_LIMIT_WINDOW_SEC ?? 600);
  const max = Number((env as any).RATE_LIMIT_MAX_ATTEMPTS ?? 5);
  const key = rlKey(ip, windowSec);
  // @ts-ignore KV
  const currentRaw = await env.DOWNLOAD_TOKENS.get(key);
  let count = currentRaw ? parseInt(currentRaw, 10) : 0;
  count++;
  // @ts-ignore KV
  await env.DOWNLOAD_TOKENS.put(key, String(count), { expirationTtl: windowSec });
  return { allowed: count <= max, remaining: Math.max(0, max - count) };
}
