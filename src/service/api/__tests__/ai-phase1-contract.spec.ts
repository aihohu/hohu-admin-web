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
      url: '/platform/ai/providers/models',
      headers: expect.any(Object),
      method: 'get'
    });
  });

  it('tests the current Provider and model form through one endpoint', async () => {
    const payload: Api.Ai.ProviderModelTestRequest = {
      providerId: '101',
      providerCode: 'openai',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      config: null,
      model: { name: 'draft-model', capabilities: ['text'], baseUrl: null, isEnabled: true, sortOrder: 0, config: null }
    };
    await fetchTestProviderModel(payload);

    expect(request).toHaveBeenCalledWith({
      url: '/platform/ai/providers/test',
      headers: expect.any(Object),
      method: 'post',
      data: payload
    });
  });
});
