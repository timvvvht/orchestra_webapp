/**
 * JWT Decode Stub - Webapp Implementation
 * 
 * Simple implementation of jwt-decode functionality for webapp migration.
 * This avoids npm dependency issues during migration.
 */

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: any;
}

/**
 * Decode a JWT token without verification
 * This is a simple base64 decode of the payload section
 */
export function jwtDecode<T = JwtPayload>(token: string): T {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode base64
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    
    // Parse JSON
    return JSON.parse(decodedPayload) as T;
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Default export for compatibility
export default jwtDecode;