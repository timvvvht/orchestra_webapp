// acsResultPoster.ts – reusable helper to POST job_outcome back to ACS
import { JobOutcome } from './types';

/**
 * Posts job outcome back to ACS
 * @param acsBaseUrl - Base URL for ACS API (e.g., 'https://api.example.com')
 * @param sessionId - Session ID for the job
 * @param jobOutcome - The job outcome to post
 */
export async function postResultToACS(acsBaseUrl: string, sessionId: string, jobOutcome: JobOutcome): Promise<void> {
    console.log('📤 [acsResultPoster] 🚀 POSTING TOOL RESULT TO ACS SERVER:', {
        acsBaseUrl,
        sessionId,
        jobId: jobOutcome.job_id,
        status: jobOutcome.status,
        hasResultPayload: !!jobOutcome.result_payload,
        errorMessage: jobOutcome.error_message,
        endpoint: `${acsBaseUrl}/acs/local-tool/result`
    });

    try {
        const payload = {
            session_id: sessionId,
            job_outcome: jobOutcome
        };

        console.log('📤 [acsResultPoster] 🚀 HTTP POST request payload:', {
            url: `${acsBaseUrl}/acs/local-tool/result`,
            method: 'POST',
            payloadPreview: JSON.stringify(payload).substring(0, 200) + '...'
        });

        const response = await fetch(`${acsBaseUrl}/acs/local-tool/result`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'include', // keep cookies if present
            body: JSON.stringify(payload)
        });

        console.log('📥 [acsResultPoster] 🚀 ACS server response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            jobId: jobOutcome.job_id
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [acsResultPoster] 🚀 ACS server error response:', {
                status: response.status,
                statusText: response.statusText,
                errorText,
                jobId: jobOutcome.job_id
            });
            throw new Error(`ACS ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ [acsResultPoster] 🚀 Tool result posted to ACS successfully:', {
            jobId: jobOutcome.job_id,
            sessionId,
            acsResponse: result
        });
    } catch (error) {
        console.error('❌ [acsResultPoster] 🚀 Failed to post result to ACS:', {
            jobId: jobOutcome.job_id,
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}
