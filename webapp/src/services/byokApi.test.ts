import { vi, describe, it, expect } from 'vitest';
import { storeApiKey, listApiKeys, deleteApiKey } from './byokApi';
import { getDefaultACSClient } from '@/services/acs';

vi.mock('@/services/acs');

describe('BYOK API helpers', () => {
  const mockModels = {
    storeAPIKey: vi.fn(),
    listAPIKeys: vi.fn(),
    deleteAPIKey: vi.fn()
  };

  // Mock default client to return our stub
  (getDefaultACSClient as unknown as vi.Mock).mockReturnValue({ models: mockModels });

  it('storeApiKey returns true on success', async () => {
    mockModels.storeAPIKey.mockResolvedValue({ data: { success: true } });
    expect(await storeApiKey('openai', 'sk-test')).toBe(true);
  });

  it('listApiKeys returns array on success', async () => {
    const providers = [{ provider_name: 'openai', has_key: true }];
    mockModels.listAPIKeys.mockResolvedValue({ data: providers });
    expect(await listApiKeys()).toEqual(providers);
  });

  it('deleteApiKey propagates success', async () => {
    mockModels.deleteAPIKey.mockResolvedValue({ data: { success: true } });
    expect(await deleteApiKey('openai')).toBe(true);
  });
});
