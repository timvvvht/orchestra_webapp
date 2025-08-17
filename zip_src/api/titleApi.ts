import type { ChatMessage, RichContentPart } from '@/types/chatTypes';

/**
 * Flattens chat messages into a single text string for title generation
 */
const flattenMessagesToText = (messages: ChatMessage[]): string => {
  const textParts: string[] = [];
  
  messages.forEach(message => {
    // Extract text content from each message
    const messageTexts = message.content
      .filter((part: RichContentPart) => part.type === 'text')
      .map((part: any) => part.text)
      .filter(text => text && text.trim().length > 0);
    
    if (messageTexts.length > 0) {
      // Add role prefix for context
      const rolePrefix = message.role === 'user' ? 'User: ' : 'Assistant: ';
      textParts.push(rolePrefix + messageTexts.join(' '));
    }
  });
  
  return textParts.join('\n\n');
};

/**
 * Generates a session title using your deployed Lambda API
 */
export async function generateSessionTitle(messages: ChatMessage[]): Promise<string> {
  try {
    // Take first 4 messages for context (user + assistant + user + assistant)
    const relevantMessages = messages.slice(0, 4);
    const flattenedContent = flattenMessagesToText(relevantMessages);
    
    if (!flattenedContent.trim()) {
      return 'New Chat';
    }
    
    const response = await fetch('https://f62tqywu4f.execute-api.us-east-1.amazonaws.com/prod/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'lqDnWteaPu7II6NhUPuQv7bT13wG4PoDjQqvNx60'
      },
      body: JSON.stringify({
        content: flattenedContent,
        max_words: 6 // Keep titles concise
      })
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Extract title from response (adjust based on your API's response format)
    const title = result.summary || result.title || result.content || 'New Chat';
    
    console.log('[titleApi] Generated title:', title);
    return title;
    
  } catch (error) {
    console.error('[titleApi] Error generating title:', error);
    // Fallback to a simple title based on first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const firstText = firstUserMessage.content
        .find(p => p.type === 'text')?.text || '';
      return firstText.slice(0, 50) + (firstText.length > 50 ? '...' : '') || 'New Chat';
    }
    return 'New Chat';
  }
}