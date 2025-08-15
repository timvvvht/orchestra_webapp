/**
 * Test authentication helpers
 * Stub implementation for web app testing
 */

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthTestContext {
  user: TestUser;
  token: string;
}

/**
 * Create a test authentication context
 */
export function createTestAuthContext(): AuthTestContext {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User'
    },
    token: 'test-auth-token'
  };
}

/**
 * Mock authentication for tests
 */
export function mockAuth(): void {
  console.warn('[AuthHelpers] Stub implementation - mockAuth not functional in web app tests');
}

/**
 * Clean up authentication mocks
 */
export function cleanupAuth(): void {
  console.warn('[AuthHelpers] Stub implementation - cleanupAuth not functional in web app tests');
}

/**
 * Get test authentication headers
 */
export function getTestAuthHeaders(context?: AuthTestContext): Record<string, string> {
  const ctx = context || createTestAuthContext();
  return {
    'Authorization': `Bearer ${ctx.token}`,
    'Content-Type': 'application/json'
  };
}