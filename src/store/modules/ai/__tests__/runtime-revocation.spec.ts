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

import { fetchGetConversationList } from '@/service/api';
import { fetchAiAgents, fetchAiConfirm, fetchGetChatModels } from '@/service/api/ai';
import { useAiStore } from '..';

function failed(errorCode: string) {
  return { data: null, error: { response: { data: { errorCode } } } } as never;
}

function message(content = 'private result'): Api.Ai.Message {
  return {
    messageId: 'assistant-1',
    conversationId: 'conversation-1',
    parentMessageId: 'user-1',
    role: 'assistant',
    messageType: 'text',
    content,
    parts: null,
    toolCalls: null,
    traceId: 'tr_11111111111111111111111111111111',
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-15T00:00:00Z'
  };
}

describe('AI runtime authorization revocation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.mocked(fetchGetChatModels).mockResolvedValue({
      data: [{ modelId: 'model-1', label: 'Model', providerCode: 'provider', capabilities: ['text'] }],
      error: null
    } as never);
    vi.mocked(fetchAiAgents).mockResolvedValue({
      data: [{ code: 'shared', name: 'Shared', description: '', modelPreference: null, displayOrder: 0 }],
      error: null
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears a stale conversation list when reloading fails', async () => {
    vi.mocked(fetchGetConversationList).mockResolvedValue({ data: null, error: new Error('failed') } as never);
    const store = useAiStore();
    store.conversations = [{ conversationId: 'private-conversation', title: 'private title' } as Api.Ai.Conversation];

    await store.loadConversations();

    expect(store.conversations).toEqual([]);
    expect(store.hasMoreConversations).toBe(false);
  });

  it('ignores an older authorized model response after a newer denial', async () => {
    let resolveFirst!: (value: any) => void;
    vi.mocked(fetchGetChatModels)
      .mockReturnValueOnce(new Promise(resolve => (resolveFirst = resolve)))
      .mockResolvedValueOnce(failed('AI_CHAT_PERMISSION_DENIED'));
    const store = useAiStore();

    const first = store.loadModels();
    await store.loadModels();
    resolveFirst({
      data: [{ modelId: 'stale-model', label: 'Stale', providerCode: 'provider', capabilities: ['text'] }],
      error: null
    });
    await first;

    expect(store.availableModels).toEqual([]);
    expect(store.chatAvailability).toBe('forbidden');
  });

  it('aborts active producers and clears account projections on entry denial', async () => {
    const store = useAiStore();
    await Promise.all([store.loadModels(), store.loadAgents()]);
    store.currentConversationId = 'conversation-1';
    store.currentMessages = [message()];
    store.conversations = [{ conversationId: 'conversation-1', title: 'private title' } as Api.Ai.Conversation];

    let requestSignal!: AbortSignal;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, init: RequestInit) => {
        requestSignal = init.signal as AbortSignal;
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: () =>
                new Promise((_resolve, reject) => {
                  requestSignal.addEventListener('abort', () =>
                    reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
                  );
                })
            })
          }
        });
      })
    );

    const sending = store.sendMessage('hello');
    await vi.waitFor(() => expect(requestSignal).toBeDefined());
    vi.mocked(fetchGetChatModels).mockResolvedValue(failed('AI_CHAT_PERMISSION_DENIED'));
    await store.loadModels();
    const abortedByDenial = requestSignal.aborted;
    if (!abortedByDenial) store.stopStreaming();
    await sending;

    expect(abortedByDenial).toBe(true);
    expect(store.chatAvailability).toBe('forbidden');
    expect(store.conversations).toEqual([]);
    expect(store.currentConversationId).toBeNull();
    expect(store.currentMessages).toEqual([]);
    expect(JSON.stringify(store.$state)).not.toContain('private');
  });

  it('treats an explicit Agent denial as a fail-closed runtime state', async () => {
    const store = useAiStore();
    await Promise.all([store.loadModels(), store.loadAgents()]);
    store.currentConversationId = 'conversation-1';
    store.currentMessages = [message()];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ errorCode: 'AI_AGENT_FORBIDDEN' })
      })
    );

    await store.sendMessage('hello');

    expect(store.chatAvailability).toBe('no_agents');
    expect(store.availableAgents).toEqual([]);
    expect(store.selectedAgentCode).toBe('');
    expect(store.currentMessages).toEqual([]);
  });

  it('drops cached confirmation presentation when confirm is denied', async () => {
    vi.mocked(fetchAiConfirm).mockResolvedValue(failed('AI_CHAT_PERMISSION_DENIED'));
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    store.currentMessages = [message()];
    store.pendingActionsById = {
      'action-1': {
        type: 'confirmation_required',
        actionId: 'action-1',
        confirmationId: 'confirmation-1',
        tool: 'user.list',
        toolCallId: 'tool-1',
        summary: 'private confirmation',
        presentation: { title: 'private confirmation', fields: [], warnings: [] },
        expiresAt: '2026-08-15T01:00:00Z'
      }
    };

    await store.approveTool('action-1');

    expect(store.chatAvailability).toBe('forbidden');
    expect(store.currentMessages).toEqual([]);
    expect(store.pendingActionsById).toEqual({});
    expect(JSON.stringify(store.$state)).not.toContain('private');
  });
});
