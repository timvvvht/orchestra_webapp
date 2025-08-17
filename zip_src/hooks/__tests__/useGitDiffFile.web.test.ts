import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGitDiffFile } from '../useGitDiffFile';

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useGitDiffFile in web environment', () => {
  it('returns error when called in web environment', async () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(
      () => useGitDiffFile('/some/path', 'file.txt', true),
      { wrapper }
    );

    // Wait for the query to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Git operations require desktop app');
  });
});