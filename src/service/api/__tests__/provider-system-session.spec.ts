import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/service/request', () => ({ request: vi.fn().mockResolvedValue({ data: {}, error: null }) }));
vi.mock('@/service/request/platform', () => ({ platformRequest: vi.fn() }));

import { request } from '@/service/request';
import { platformRequest } from '@/service/request/platform';
import {
  fetchGetProviderList,
  fetchSaveProvider,
  fetchUpdateProvider,
  fetchDeleteProvider,
  fetchGetProviderModels,
  fetchAddProviderModel,
  fetchUpdateProviderModel,
  fetchDeleteProviderModel,
  fetchTestProviderModel,
  fetchGetProviderModelCatalog
} from '../ai';

beforeEach(() => vi.clearAllMocks());

it('uses the ordinary authenticated client and audits every Provider operation', async () => {
  const provider = {
    providerCode: 'test',
    name: 'Test',
    apiKey: 'secret',
    baseUrl: null,
    isEnabled: true,
    config: null
  };
  const model = {
    name: 'model',
    capabilities: ['text'] as Api.Ai.ModelCapability[],
    baseUrl: null,
    isEnabled: true,
    sortOrder: 0,
    config: null
  };
  await fetchGetProviderList();
  await fetchSaveProvider(provider);
  await fetchUpdateProvider('101', { name: 'Renamed' });
  await fetchDeleteProvider('101');
  await fetchGetProviderModels('101');
  await fetchAddProviderModel('101', model);
  await fetchUpdateProviderModel('101', '201', model);
  await fetchDeleteProviderModel('101', '201');
  await fetchTestProviderModel('101', '201');
  await fetchGetProviderModelCatalog('text');
  expect(vi.mocked(request).mock.calls.map(([config]) => config.url)).toEqual([
    '/platform/ai/providers',
    '/platform/ai/providers',
    '/platform/ai/providers/101',
    '/platform/ai/providers/101',
    '/platform/ai/providers/101/models',
    '/platform/ai/providers/101/models',
    '/platform/ai/providers/101/models/201',
    '/platform/ai/providers/101/models/201',
    '/platform/ai/providers/101/test',
    '/platform/ai/providers/models'
  ]);
  for (const [config] of vi.mocked(request).mock.calls) {
    expect(config.headers).toEqual(
      expect.objectContaining({
        'X-Platform-Reason': expect.any(String),
        'X-Platform-Ticket': expect.any(String),
        'X-Correlation-ID': expect.any(String)
      })
    );
  }
  expect(platformRequest).not.toHaveBeenCalled();
});
