import { getDefaultACSClient } from '@/services/acs';

export interface PathSuggestRequest {
  text: string;
  tree_listing: string;
}

export interface PathSuggestResponse {
  path: string;
  reasoning?: string;
}

/**
 * Suggest a path for saving content to the vault using ACS
 * @param text - The content to be saved
 * @param treeListing - The output from `tree -L 1` command
 * @returns Promise with suggested path and optional reasoning
 */
export async function suggestPath(text: string, treeListing: string): Promise<PathSuggestResponse> {
  const acsClient = getDefaultACSClient();
  const httpClient = acsClient.getClient();
  
  const requestBody: PathSuggestRequest = {
    text,
    tree_listing: treeListing
  };
  
  try {
    const response = await httpClient.post('/api/v1/acs/suggest-path', requestBody);
    
    if (!response.data || !response.data.path) {
      throw new Error('Invalid response: missing path');
    }
    
    return response.data as PathSuggestResponse;
  } catch (error) {
    console.error('[PathSuggest] Failed to get path suggestion:', error);
    throw new Error(`Path suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}