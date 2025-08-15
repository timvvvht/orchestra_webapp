/**
 * Utility functions for collecting template variables for system prompt substitution
 * Mirrors the functionality from orchestra-archive's session manager
 */

import { getUserName } from './userPreferences';
import { useSettingsStore } from '@/stores/settingsStore';
import { getPreference } from '@/api/settingsApi';

/**
 * Get template variables that can be used for system prompt substitution
 * These are the same variables that were used in the original orchestra-archive
 */
export async function getTemplateVariables(): Promise<Record<string, string>> {
    const templateVars: Record<string, string> = {};

    // Get user name from localStorage (same as orchestra-archive onboarding.userName)
    const userName = getUserName();
    if (userName) {
        templateVars['{{NAME}}'] = userName;
    }

    // Get vault path from settings (same as orchestra-archive vault.path)
    const settingsStore = useSettingsStore.getState();
    let vaultPath = settingsStore.settings.vault.path;

    // Fallback: try to get vault path directly from preferences if not in store
    if (!vaultPath) {
        try {
            vaultPath = await getPreference('vault.path', '');
        } catch (error) {
            console.warn('Failed to get vault path from preferences:', error);
        }
    }

    if (vaultPath) {
        templateVars['{{VAULT_PATH}}'] = vaultPath;
    }

    return templateVars;
}

/**
 * Add additional template variables for specific contexts
 * This can be extended with project-specific or context-specific variables
 */
export function addContextualTemplateVariables(
    baseVariables: Record<string, string>,
    context?: {
        projectName?: string;
        sessionId?: string;
        agentName?: string;
        currentDate?: string;
    }
): Record<string, string> {
    const variables = { ...baseVariables };

    if (context?.projectName) {
        variables['{{PROJECT_NAME}}'] = context.projectName;
    }

    if (context?.sessionId) {
        variables['{{SESSION_ID}}'] = context.sessionId;
    }

    if (context?.agentName) {
        variables['{{AGENT_NAME}}'] = context.agentName;
    }

    if (context?.currentDate) {
        variables['{{CURRENT_DATE}}'] = context.currentDate;
    } else {
        // Add current date in the same format as worker.py used to append
        variables['{{CURRENT_DATE}}'] = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    return variables;
}

/**
 * Core template variables that should always be available
 */
export interface CoreTemplateVars {
    user_id: string;
    user_name: string;
    vault_path: string;
    timestamp: string;
    // Allow additional template variables like {{NAME}}, {{PROJECT_NAME}}, etc.
    [key: string]: string;
}

/**
 * Create template variables object for ACS requests
 * This is the main function to use when sending messages to ACS
 */
export async function createACSTemplateVariables(context?: { projectName?: string; sessionId?: string; agentName?: string }): Promise<CoreTemplateVars> {
    // Lazy import to avoid circular dependency
    const { getDefaultACSClient } = await import('@/services/acs');
    
    // Get auth from the default ACS client
    const authService = getDefaultACSClient().auth;

    // Set fallback username (required for prompt templates)
    let username = authService?.user?.user_metadata?.name ?? 'User';

    if (username === 'User') {
        // Try to use explicit user_name from getUserName first
        username = getUserName() ?? 'User';

        if (username === 'User') {
            console.warn('No user name found in authService.user.user_metadata.name or getUserName(), using "User"');
        }
    }

    // Get base template variables
    const baseVariables = await getTemplateVariables();
    const contextualVars = addContextualTemplateVariables(baseVariables, context);

    // Get vault path
    const settingsStore = useSettingsStore.getState();
    let vaultPath = settingsStore.settings.vault.path;

    // Fallback: try to get vault path directly from preferences if not in store
    if (!vaultPath) {
        try {
            vaultPath = await getPreference('vault.path', '');
        } catch (error) {
            console.warn('[templateVariables] vault.path preference missing:', error);
            vaultPath = '';
        }
    }

    // Return strongly typed object
    return {
        user_id: authService.user?.id || '',
        user_name: username,
        vault_path: vaultPath,
        timestamp: new Date().toISOString(),
        ...contextualVars
    } as CoreTemplateVars;
}
