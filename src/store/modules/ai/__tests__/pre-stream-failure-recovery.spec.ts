import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

import { fetchGetConversationDetail } from '@/service/api';
import { fetchAiAgents, fetchGetChatModels } from '@/service/api/ai';
import { useAiStore } from '..';

function upstreamFailure(): Response {
  return new Response(
    JSON.stringify({ code: 502, msg: 'Provider 暂时不可用，请稍后重试', errorCode: 'AI_PROVIDER_UPSTREAM_ERROR' }),
    { status: 502 }
  );
}

describe('pre-stream failure recovery', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchGetChatModels).mockResolvedValue({
      data: [{ modelId: '1', label: 'Provider / Model', providerCode: 'provider', capabilities: ['text'] }],
      error: null
    } as never);
    vi.mocked(fetchAiAgents).mockResolvedValue({
      data: [{ code: 'shared', name: 'Shared', description: '', modelPreference: null, displayOrder: 0 }],
      error: null
    } as never);
    vi.mocked(fetchGetConversationDetail).mockResolvedValue({
      data: { conversation: { conversationId: '1' }, messages: [], pendingActions: [] },
      error: null
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rolls back the optimistic user message and stays sendable after a pre-stream HTTP failure', async () => {
    const chatFetch = vi.fn().mockResolvedValue(upstreamFailure());
    vi.stubGlobal('fetch', chatFetch);
    const store = useAiStore();
    await store.init();
    store.currentConversationId = '1';

    await store.sendMessage('hello');

    expect(store.isStreaming).toBe(false);
    expect(store.streamHandoffPhase).toBe('idle');
    expect(store.currentMessages.some(message => message.messageId.startsWith('temp-'))).toBe(false);

    await store.sendMessage('hello again');
    expect(chatFetch).toHaveBeenCalledTimes(2);
    expect(fetchGetConversationDetail).not.toHaveBeenCalled();
  });

  it('keeps the reused question when a clarification retry fails before the stream starts', async () => {
    const chatFetch = vi.fn().mockResolvedValue(upstreamFailure());
    vi.stubGlobal('fetch', chatFetch);
    const store = useAiStore();
    await store.init();
    store.currentConversationId = '1';
    store.currentMessages = [
      {
        messageId: 'temp-existing',
        conversationId: '1',
        parentMessageId: null,
        role: 'user',
        messageType: 'text',
        content: 'original question',
        parts: null,
        tokensInput: null,
        tokensOutput: null,
        createTime: '2026-09-19T00:00:00Z'
      }
    ];

    await store.pickClarificationAgent('shared');

    expect(store.streamHandoffPhase).toBe('idle');
    expect(store.currentMessages.map(message => message.messageId)).toEqual(['temp-existing']);
  });
});
