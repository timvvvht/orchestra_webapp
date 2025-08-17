import { useParams } from 'react-router-dom';
import { useSessionId } from '../context/SessionIdContext';

/**
 * Hook that intelligently retrieves the session ID from either URL parameters or context.
 * Prioritizes URL parameters (for standard chat routes) but falls back to context 
 * (for Mission Control split screen view).
 */
export const useCurrentSessionId = (): string | undefined => {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const contextSessionId = useSessionId();

  // Return URL param if available, otherwise return context value
  return paramSessionId || contextSessionId;
};