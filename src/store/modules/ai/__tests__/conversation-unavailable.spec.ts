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

import { fetchGetConversationDetail, fetchGetConversationList } from '@/service/api';
import { fetchAiAgents, fetchGetChatModels } from '@/service/api/ai';
import { useAiStore } from '..';

describe('unavailable conversation recovery', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.mocked(fetchGetChatModels).mockResolvedValue({
      data: [{ modelId: 'm', capabilities: ['text'] }],
      error: null
    } as never);
    vi.mocked(fetchAiAgents).mockResolvedValue({ data: [{ code: 'shared' }], error: null } as never);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([403, 404])('gives a persistent recovery notice on detail %s without disabling AI', async status => {
    const store = useAiStore();
    await Promise.all([store.loadModels(), store.loadAgents()]);
    store.conversations = [{ conversationId: 'gone', title: 'private title' } as Api.Ai.Conversation];
    store.addImage('/private', 'image/png', 'private.png');
    vi.mocked(fetchGetConversationDetail).mockResolvedValue({
      data: null,
      error: { response: { status, data: {} } }
    } as never);
    await store.selectConversation('gone');
    expect(store.currentConversationId).toBeNull();
    expect(store.conversations).toEqual([]);
    expect(store.attachedImages).toEqual([]);
    expect(store.conversationNotice).toBe('unavailable');
    expect(store.chatAvailability).toBe('ready');
    store.clearCurrentConversation();
    expect(store.conversationNotice).toBeNull();
  });

  it('reports a missing conversation during send and removes stale messages', async () => {
    const store = useAiStore();
    await Promise.all([store.loadModels(), store.loadAgents()]);
    store.currentConversationId = 'gone';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ errorCode: 'AI_CONVERSATION_NOT_FOUND' }), { status: 404 }))
    );
    await store.sendMessage('继续');
    expect(store.currentMessages).toEqual([]);
    expect(store.isStreaming).toBe(false);
    expect(store.conversationNotice).toBe('unavailable');
    expect(store.chatAvailability).toBe('ready');
  });

  it('does not let delayed lists or detail repopulate state after permission denial', async () => {
    let resolveList!: (value: never) => void;
    let resolveDetail!: (value: never) => void;
    vi.mocked(fetchGetConversationList).mockReturnValue(
      new Promise(resolve => {
        resolveList = resolve;
      })
    );
    vi.mocked(fetchGetConversationDetail).mockReturnValue(
      new Promise(resolve => {
        resolveDetail = resolve;
      })
    );
    const store = useAiStore();
    const list = store.loadConversations();
    const detail = store.selectConversation('private');
    vi.mocked(fetchGetChatModels).mockResolvedValue({
      data: null,
      error: { response: { data: { errorCode: 'AI_CHAT_PERMISSION_DENIED' } } }
    } as never);
    await store.loadModels();
    resolveList({ data: { records: [{ conversationId: 'private' }] }, error: null } as never);
    resolveDetail({ data: { messages: [{ content: 'private' }] }, error: null } as never);
    await Promise.all([list, detail]);
    expect(store.conversations).toEqual([]);
    expect(store.currentMessages).toEqual([]);
    expect(store.chatAvailability).toBe('forbidden');
  });
});
