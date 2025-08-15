import { describe, it, expect } from 'vitest';
import { getSupabaseAccessToken, type TokenSelection } from '../getSupabaseAccessToken';

// Helper to create a mock JWT token
function createMockJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const signature = 'mock_signature';
  return `${headerB64}.${payloadB64}.${signature}`;
}

// Helper to create a long token (>600 chars)
function createLongToken(): string {
  return 'ey' + 'a'.repeat(700); // Simulate a very long token
}

describe('getSupabaseAccessToken', () => {
  describe('Normal session scenarios', () => {
    it('should return access_token when it has aud=authenticated and is short', () => {
      const session = {
        access_token: createMockJWT({ aud: 'authenticated', sub: 'user123' }),
        provider_token: null,
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('access_token');
      expect(result.token).toBe(session.access_token);
      expect(result.payload?.aud).toBe('authenticated');
    });

    it('should return null token and none source when session is null', () => {
      const result = getSupabaseAccessToken(null);

      expect(result.source).toBe('none');
      expect(result.token).toBeNull();
      expect(result.payload).toBeUndefined();
    });

    it('should return null token and none source when session is undefined', () => {
      const result = getSupabaseAccessToken(undefined);

      expect(result.source).toBe('none');
      expect(result.token).toBeNull();
      expect(result.payload).toBeUndefined();
    });
  });

  describe('Google OAuth scenarios', () => {
    it('should return provider_token when access_token is long but provider_token is short and valid', () => {
      const session = {
        access_token: createLongToken(), // Long token (>600 chars)
        provider_token: createMockJWT({ aud: 'authenticated', sub: 'user123', iss: 'google' }),
        id_token: createLongToken()
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('provider_token');
      expect(result.token).toBe(session.provider_token);
      expect(result.payload?.aud).toBe('authenticated');
    });

    it('should return id_token when access_token and provider_token are long but id_token is short and valid', () => {
      const session = {
        access_token: createLongToken(),
        provider_token: createLongToken(),
        id_token: createMockJWT({ aud: 'authenticated', sub: 'user123' })
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('id_token');
      expect(result.token).toBe(session.id_token);
      expect(result.payload?.aud).toBe('authenticated');
    });

    it('should fallback to access_token when all tokens are long', () => {
      const session = {
        access_token: createLongToken(),
        provider_token: createLongToken(),
        id_token: createLongToken()
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('access_token');
      expect(result.token).toBe(session.access_token);
      expect(result.payload).toBeUndefined();
    });
  });

  describe('Token validation scenarios', () => {
    it('should reject tokens without aud=authenticated', () => {
      const session = {
        access_token: createMockJWT({ aud: 'different_audience', sub: 'user123' }),
        provider_token: createMockJWT({ aud: 'authenticated', sub: 'user123' }),
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('provider_token');
      expect(result.token).toBe(session.provider_token);
      expect(result.payload?.aud).toBe('authenticated');
    });

    it('should handle malformed JWT tokens gracefully', () => {
      const session = {
        access_token: 'not.a.valid.jwt.token',
        provider_token: createMockJWT({ aud: 'authenticated', sub: 'user123' }),
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('provider_token');
      expect(result.token).toBe(session.provider_token);
      expect(result.payload?.aud).toBe('authenticated');
    });

    it('should handle tokens with missing payload', () => {
      const session = {
        access_token: 'header.', // Missing payload
        provider_token: createMockJWT({ aud: 'authenticated', sub: 'user123' }),
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('provider_token');
      expect(result.token).toBe(session.provider_token);
    });

    it('should handle tokens with invalid JSON payload', () => {
      const session = {
        access_token: 'header.invalid_json.signature',
        provider_token: createMockJWT({ aud: 'authenticated', sub: 'user123' }),
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('provider_token');
      expect(result.token).toBe(session.provider_token);
    });
  });

  describe('Edge cases', () => {
    it('should handle session with all null tokens', () => {
      const session = {
        access_token: null,
        provider_token: null,
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('access_token');
      expect(result.token).toBeNull();
    });

    it('should handle session with empty string tokens', () => {
      const session = {
        access_token: '',
        provider_token: createMockJWT({ aud: 'authenticated', sub: 'user123' }),
        id_token: ''
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('provider_token');
      expect(result.token).toBe(session.provider_token);
    });

    it('should handle session with missing token properties', () => {
      const session = {
        // Missing access_token, provider_token, id_token
        user: { id: 'user123' }
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('access_token');
      expect(result.token).toBeNull();
    });

    it('should prioritize access_token when multiple tokens are valid and short', () => {
      const session = {
        access_token: createMockJWT({ aud: 'authenticated', sub: 'user123', priority: 1 }),
        provider_token: createMockJWT({ aud: 'authenticated', sub: 'user123', priority: 2 }),
        id_token: createMockJWT({ aud: 'authenticated', sub: 'user123', priority: 3 })
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('access_token');
      expect(result.token).toBe(session.access_token);
      expect(result.payload?.priority).toBe(1);
    });
  });

  describe('Token length validation', () => {
    it('should accept tokens exactly at 600 characters', () => {
      const token600 = createMockJWT({ aud: 'authenticated' });
      // Pad to exactly 600 chars
      const paddedToken = token600 + 'x'.repeat(Math.max(0, 600 - token600.length));
      
      const session = {
        access_token: paddedToken,
        provider_token: null,
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('access_token');
      expect(result.token).toBe(paddedToken);
    });

    it('should reject tokens over 600 characters', () => {
      const longToken = createMockJWT({ aud: 'authenticated' }) + 'x'.repeat(700);
      const shortToken = createMockJWT({ aud: 'authenticated', sub: 'user123' });
      
      const session = {
        access_token: longToken,
        provider_token: shortToken,
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.source).toBe('provider_token');
      expect(result.token).toBe(shortToken);
    });
  });

  describe('JWT payload decoding', () => {
    it('should correctly decode and return JWT payload', () => {
      const expectedPayload = {
        aud: 'authenticated',
        sub: 'user123',
        email: 'test@example.com',
        exp: 1234567890
      };
      
      const session = {
        access_token: createMockJWT(expectedPayload),
        provider_token: null,
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.payload).toEqual(expectedPayload);
      expect(result.payload?.sub).toBe('user123');
      expect(result.payload?.email).toBe('test@example.com');
    });

    it('should handle base64url padding correctly', () => {
      // Create a payload that will need padding when base64url decoded
      const payload = { aud: 'authenticated', test: 'a' }; // Short payload
      const token = createMockJWT(payload);
      
      const session = {
        access_token: token,
        provider_token: null,
        id_token: null
      };

      const result = getSupabaseAccessToken(session);

      expect(result.payload?.aud).toBe('authenticated');
      expect(result.payload?.test).toBe('a');
    });
  });
});