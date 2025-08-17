import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGitStage, useGitCommit, useGitStash, useGitDiscard } from '../useGitMutations';

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

describe('useGitMutations in web environment', () => {
  it('useGitStage throws error when called in web environment', async () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(() => useGitStage(), { wrapper });

    try {
      await result.current.mutateAsync({ projectRoot: '/some/path', files: ['file.txt'] });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('Git operations require desktop app');
    }
  });

  it('useGitCommit throws error when called in web environment', async () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(() => useGitCommit(), { wrapper });

    try {
      await result.current.mutateAsync({ projectRoot: '/some/path', message: 'test commit' });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('Git operations require desktop app');
    }
  });

  it('useGitStash throws error when called in web environment', async () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(() => useGitStash(), { wrapper });

    try {
      await result.current.mutateAsync({ projectRoot: '/some/path' });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('Git operations require desktop app');
    }
  });

  it('useGitDiscard throws error when called in web environment', async () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(() => useGitDiscard(), { wrapper });

    try {
      await result.current.mutateAsync({ projectRoot: '/some/path', files: ['file.txt'] });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('Git operations require desktop app');
    }
  });
});