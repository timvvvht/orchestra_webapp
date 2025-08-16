import React from 'react';

// Create a context to hold the session ID
export const SessionIdContext = React.createContext<string | undefined>(undefined);

// Custom hook to consume the SessionIdContext
export const useSessionId = (): string | undefined => {
  return React.useContext(SessionIdContext);
};