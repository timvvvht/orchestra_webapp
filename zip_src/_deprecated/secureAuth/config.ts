// Secure Authentication Configuration
// Environment-based configuration for enterprise authentication

import { AuthConfig } from './types';

// Environment variable validation
const getEnvVar = (name: string, defaultValue?: string): string => {
    const value = import.meta.env[name] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

// Development vs Production configuration
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

// Base URLs
const ACS_BASE_URL = getEnvVar('VITE_ACS_BASE_URL', 'https://orchestra-acs.fly.dev');
const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', '');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', '');

// OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

// Redirect URIs for different environments
const getRedirectUri = (provider: string): string => {
    if (isDevelopment) {
        return `http://localhost:3000/auth/callback`;
    }
    return `https://orchestra.app/auth/callback`;
};

// Tauri deep link URIs
const getTauriRedirectUri = (provider: string): string => {
    return `orchestra://auth/callback/${provider}`;
};

// Check if running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export const authConfig: AuthConfig = {
    // API endpoints
    baseUrl: ACS_BASE_URL,
    endpoints: {
        login: '/api/v1/auth/login',
        register: '/api/v1/auth/register',
        refresh: '/api/v1/auth/refresh',
        logout: '/api/v1/auth/logout',
        me: '/api/v1/auth/me',
        revoke: '/api/v1/auth/revoke'
    },

    // OAuth providers
    oauth: {
        ...(GOOGLE_CLIENT_ID && {
            google: {
                name: 'google',
                clientId: GOOGLE_CLIENT_ID,
                redirectUri: isTauri ? getTauriRedirectUri('google') : getRedirectUri('google')
            }
        }),
        ...(GITHUB_CLIENT_ID && {
            github: {
                name: 'github',
                clientId: GITHUB_CLIENT_ID,
                redirectUri: isTauri ? getTauriRedirectUri('github') : getRedirectUri('github')
            }
        })
    },

    // Security settings
    security: {
        tokenRefreshBuffer: 5 * 60 * 1000, // 5 minutes
        maxRetries: 3,
        csrfEnabled: true,
        secureCookies: isProduction,
        sameSite: isProduction ? 'strict' : 'lax'
    },

    // Supabase integration (optional)
    ...(SUPABASE_URL &&
        SUPABASE_ANON_KEY && {
            supabase: {
                url: SUPABASE_URL,
                anonKey: SUPABASE_ANON_KEY,
                enabled: true
            }
        })
};

// Cookie configurations
export const cookieConfig = {
    accessToken: {
        name: 'orch_access_token',
        httpOnly: true,
        secure: isProduction,
        sameSite: authConfig.security.sameSite,
        maxAge: 15 * 60, // 15 minutes
        path: '/'
    },
    refreshToken: {
        name: 'orch_refresh_token',
        httpOnly: true,
        secure: isProduction,
        sameSite: authConfig.security.sameSite,
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
    },
    csrfToken: {
        name: 'orch_csrf_token',
        httpOnly: false, // Needs to be readable by JS
        secure: isProduction,
        sameSite: authConfig.security.sameSite,
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
    },
    sessionId: {
        name: 'orch_session_id',
        httpOnly: true,
        secure: isProduction,
        sameSite: authConfig.security.sameSite,
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
    }
} as const;

// Security headers
export const securityHeaders = {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json'
} as const;

// Validation functions
export const validateConfig = (): void => {
    if (!authConfig.baseUrl) {
        throw new Error('ACS base URL is required');
    }

    if (authConfig.security.csrfEnabled && isProduction) {
        console.warn('CSRF protection is enabled in production');
    }

    if (!authConfig.security.secureCookies && isProduction) {
        console.warn('Secure cookies should be enabled in production');
    }
};

// Export environment helpers
export const env = {
    isDevelopment,
    isProduction,
    isTauri,
    baseUrl: ACS_BASE_URL
};

// Initialize and validate configuration
validateConfig();
