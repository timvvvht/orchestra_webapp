/**
 * ACS Edit Text API Client
 * Integrates with Orchestra ACS backend for AI-powered text editing
 */

const ACS_BASE_URL = 'https://orchestra-acs-web.fly.dev';
const EDIT_TEXT_ENDPOINT = '/api/v1/acs/edit-text';

export interface EditTextRequest {
    text: string;
    agent_config_name: string;
    model_id: string;
    user_id?: string;
}

export interface EditTextResponse {
    edited_text: string;
    model_id: string;
    provider: string;
    agent_config: string;
}

export interface EditTextError {
    error: string;
    details?: any;
}

/**
 * Posts text to ACS edit-text endpoint for AI-powered editing
 */
export async function postEditText(request: EditTextRequest): Promise<EditTextResponse> {
    const url = `${ACS_BASE_URL}${EDIT_TEXT_ENDPOINT}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            let errorDetails = null;

            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                    errorDetails = errorData.details;
                }
            } catch {
                // If we can't parse error JSON, use the HTTP status
            }

            throw new Error(`ACS Edit API Error: ${errorMessage}${errorDetails ? ` (${JSON.stringify(errorDetails)})` : ''}`);
        }

        const data = await response.json();

        // Basic response validation
        if (!data.edited_text) {
            throw new Error('ACS Edit API Error: Response missing edited_text field');
        }

        return {
            edited_text: data.edited_text,
            model_id: data.model_id || request.model_id,
            provider: data.provider || 'unknown',
            agent_config: data.agent_config || request.agent_config_name
        };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`ACS Edit API Error: ${String(error)}`);
    }
}

/**
 * Default configuration for Magic Wand
 */
export const DEFAULT_EDIT_CONFIG = {
    agent_config_name: 'writer',
    model_id: 'gemini-2.5-flash-lite'
} as const;
