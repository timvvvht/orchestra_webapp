export function sanitizeCode(input: string): string | null {
  const code = (input ?? "").trim();
  if (!code) return null;
  if (code.length < 6 || code.length > 64) return null;
  if (!/^[a-zA-Z0-9\-_:]+$/.test(code)) return null;
  return code;
}

export async function hashCode(code: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function getClientIp(request: Request): string {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "0.0.0.0";
  return ip.split(",")[0].trim();
}

// [SYMBOL-TEST] single insert after getClientIp

// [SYMBOL-TEST] single insert after getClientIp
