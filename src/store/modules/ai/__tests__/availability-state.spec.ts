import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/service/api', () => ({
  fetchDeleteConversation: vi.fn(),
  fetchGetConversationDetail: vi.fn(),
  fetchGetConversationList: vi.fn()
}));
vi.mock('@/service/api/ai', () => ({
  fetchAiAgents: vi.fn(),
  fetchAiConfirm: vi.fn(),
  fetchAiOperationLog: vi.fn(),
  fetchGetChatModels: vi.fn(),
  fetchRoutingFeedback: vi.fn()
}));
vi.mock('@/utils/storage', () => ({ localStg: { get: vi.fn() } }));

import { fetchGetConversationList } from '@/service/api';
import { fetchAiAgents, fetchGetChatModels } from '@/service/api/ai';
import { useAiStore } from '..';

function failed(errorCode: string) {
  return {
    data: null,
    error: { response: { data: { errorCode } } }
  } as never;
}

describe('AI chat availability', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchGetConversationList).mockResolvedValue({
      data: { records: [], total: 0, current: 1, size: 20 },
      error: null
    } as never);
  });

  it.each([
    ['AI_CHAT_PERMISSION_DENIED', 'forbidden'],
    ['AI_MODULE_DISABLED', 'module_disabled']
  ] as const)('maps %s to a stable state', async (errorCode, expected) => {
    vi.mocked(fetchGetChatModels).mockResolvedValue(failed(errorCode));
    vi.mocked(fetchAiAgents).mockResolvedValue(failed(errorCode));
    const store = useAiStore();

    await store.init();

    expect(store.chatAvailability).toBe(expected);
  });

  it('distinguishes no visible Agent from no chat-safe model', async () => {
    vi.mocked(fetchGetChatModels).mockResolvedValue({
      data: [{ modelId: '1', label: 'Provider / Model', providerCode: 'provider', capabilities: ['text'] }],
      error: null
    } as never);
    vi.mocked(fetchAiAgents).mockResolvedValue({ data: [], error: null } as never);
    const noAgentStore = useAiStore();
    await noAgentStore.init();
    expect(noAgentStore.chatAvailability).toBe('no_agents');

    setActivePinia(createPinia());
    vi.mocked(fetchGetChatModels).mockResolvedValue({ data: [], error: null } as never);
    vi.mocked(fetchAiAgents).mockResolvedValue({
      data: [{ code: 'shared', name: 'Shared', description: '', modelPreference: null, displayOrder: 0 }],
      error: null
    } as never);
    const noModelStore = useAiStore();
    await noModelStore.init();
    expect(noModelStore.chatAvailability).toBe('no_models');
  });

  it('keeps a forged or stale selected model failure distinct from an empty catalog', () => {
    const store = useAiStore();

    store.runtimeAvailabilityErrorCode = 'AI_MODEL_NOT_AVAILABLE';

    expect(store.chatAvailability).toBe('model_unavailable');
  });
});
