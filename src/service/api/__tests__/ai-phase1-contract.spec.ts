import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/service/request/platform', () => ({
  platformRequest: vi.fn().mockResolvedValue({ data: [], error: null })
}));
import { platformRequest } from '@/service/request/platform';

vi.mock('@/service/request', () => ({
  request: vi.fn().mockResolvedValue({ data: [], error: null })
}));

import { fetchAgentModelOptions } from '@/service/api/ai-agent';
import { fetchGetChatModels, fetchGetProviderModelCatalog, fetchTestProviderModel } from '@/service/api/ai';
import { request } from '@/service/request';

describe('AI Phase 1 endpoint contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps chat, Agent administration, and Provider model catalogs separated', async () => {
    await fetchGetChatModels();
    await fetchAgentModelOptions();
    await fetchGetProviderModelCatalog();

    expect(request).toHaveBeenNthCalledWith(1, {
      url: '/ai/chat/models',
      method: 'get'
    });
    expect(request).toHaveBeenCalledWith({
      url: '/platform/ai/agents/model-options',
      method: 'get',
      headers: expect.objectContaining({
        'X-Platform-Reason': expect.any(String),
        'X-Platform-Ticket': expect.any(String),
        'X-Correlation-ID': expect.any(String)
      })
    });
    expect(platformRequest).not.toHaveBeenCalled();
    expect(request).toHaveBeenNthCalledWith(3, {
      url: '/ai/provider/models',
      method: 'get'
    });
  });

  it('tests only a saved model belonging to a saved Provider', async () => {
    await fetchTestProviderModel('101', '201');

    expect(request).toHaveBeenCalledWith({
      url: '/ai/provider/101/test',
      method: 'post',
      data: { modelId: '201' }
    });
  });
});
