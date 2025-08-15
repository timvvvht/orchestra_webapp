/**
 * AI Edit Service
 * Proxies to Orchestra ACS backend for AI-powered text editing
 */

import { postEditText, DEFAULT_EDIT_CONFIG, type EditTextRequest } from './acsEdit';

export interface AIEditRequest {
  text: string;
  instructions: string;
}

export interface AIEditResponse {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Main AI edit function that proxies to ACS backend
 * @param original - The original text to be edited
 * @param instructions - Natural language instructions for the edit
 * @returns Promise resolving to the edited text
 */
export async function aiEdit(original: string, instructions: string): Promise<string> {
  try {
    const request: EditTextRequest = {
      text: `${original}\n\nInstructions: ${instructions}`,
      agent_config_name: DEFAULT_EDIT_CONFIG.agent_config_name,
      model_id: DEFAULT_EDIT_CONFIG.model_id,
    };

    const response = await postEditText(request);
    return response.edited_text;
  } catch (error) {
    console.error('ACS AI edit service error:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

/**
 * Mock AI edit function for development/testing
 * Simulates AI editing with simple transformations
 */
export async function mockAiEdit(original: string, instructions: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Simple mock transformations based on instructions
  const lowerInstructions = instructions.toLowerCase();
  
  if (lowerInstructions.includes('uppercase') || lowerInstructions.includes('caps')) {
    return original.toUpperCase();
  }
  
  if (lowerInstructions.includes('lowercase')) {
    return original.toLowerCase();
  }
  
  if (lowerInstructions.includes('reverse')) {
    return original.split('').reverse().join('');
  }
  
  if (lowerInstructions.includes('bold') || lowerInstructions.includes('**')) {
    return `**${original}**`;
  }
  
  if (lowerInstructions.includes('italic') || lowerInstructions.includes('*')) {
    return `*${original}*`;
  }
  
  if (lowerInstructions.includes('code') || lowerInstructions.includes('`')) {
    return `\`${original}\``;
  }
  
  if (lowerInstructions.includes('quote')) {
    return `> ${original}`;
  }
  
  if (lowerInstructions.includes('list') || lowerInstructions.includes('bullet')) {
    const lines = original.split('\n').filter(line => line.trim());
    return lines.map(line => `- ${line.trim()}`).join('\n');
  }
  
  if (lowerInstructions.includes('number') || lowerInstructions.includes('ordered')) {
    const lines = original.split('\n').filter(line => line.trim());
    return lines.map((line, index) => `${index + 1}. ${line.trim()}`).join('\n');
  }
  
  // Default: add a simple transformation
  return `${original} (edited with: ${instructions})`;
}

// Export the mock function for development use
export const isDevelopment = process.env.NODE_ENV === 'development';
export const defaultAiEdit = isDevelopment ? mockAiEdit : aiEdit;