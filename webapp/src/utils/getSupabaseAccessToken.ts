// src/utils/getSupabaseAccessToken.ts
export interface TokenSelection {
  token: string | null;
  source: 'access_token' | 'provider_token' | 'id_token' | 'none';
  payload?: Record<string, unknown>;
}

function base64UrlDecode(str: string): string {
  const pad = str.length % 4 === 2 ? '==' :
              str.length % 4 === 3 ? '='  : '';
  return atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    return JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return null;
  }
}

export function getSupabaseAccessToken(session: any): TokenSelection {
  if (!session) return { token: null, source: 'none' };

  const candidates = [
    { token: session.access_token,  source: 'access_token' as const  },
    { token: session.provider_token,source: 'provider_token' as const},
    { token: session.id_token,      source: 'id_token' as const      },
  ];

  for (const { token, source } of candidates) {
    if (!token || token.length > 600) continue;  // fast reject longs
    const payload = decodeJWTPayload(token);
    if (payload?.aud === 'authenticated') {
      return { token, source, payload };
    }
  }
  return { token: session.access_token ?? null, source: 'access_token' };
}