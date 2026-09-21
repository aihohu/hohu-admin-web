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
import { fetchAiAgents, fetchAiConfirm, fetchAiOperationLog, fetchGetChatModels } from '@/service/api/ai';
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
  it.each([false, true])('preserves the file picker during focus refresh, revoked=%s', async revoked => {
    const store = useAiStore();
    await Promise.all([store.loadModels(), store.loadAgents()]);
    store.addImage('/private.png', 'image/png', 'draft.png');
    const revision = store.contextRevision;
    let finish!: (value: never) => void;
    vi.mocked(fetchAiAgents).mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const refresh = store.revalidateAccess();
    // Loading would unmount ChatInput while its native picker is returning files.
    expect(store.chatAvailability).toBe('ready');
    expect(store.contextRevision).toBe(revision);
    finish(
      revoked
        ? failed('AI_CHAT_PERMISSION_DENIED')
        : ({
            data: [{ code: 'shared', name: 'Shared', description: '', modelPreference: null, displayOrder: 0 }],
            error: null
          } as never)
    );
    await refresh;
    expect(store.chatAvailability).toBe(revoked ? 'forbidden' : 'ready');
    expect(store.attachedImages).toHaveLength(revoked ? 0 : 1);
    if (revoked) expect(store.contextRevision).toBeGreaterThan(revision);
  });

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
    vi.useRealTimers();
  });

  it('does not resume polling when an old confirmation returns after logout', async () => {
    vi.useFakeTimers();
    let finish!: (value: never) => void;
    vi.mocked(fetchAiConfirm).mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const store = useAiStore();
    store.currentConversationId = 'old';
    store.pendingConfirmation = {
      confirmationId: 'old-confirmation',
      toolCallId: 'old-tool'
    } as Api.Ai.ConfirmationRequiredEvent;
    const confirming = store.approveTool();
    store.resetStore();
    finish({ data: { status: 'pending', toolCallId: 'old-tool' }, error: null } as never);
    await confirming;
    await vi.advanceTimersByTimeAsync(1600);
    expect(fetchAiOperationLog).not.toHaveBeenCalled();
  });

  it('clears a stale conversation list when reloading fails', async () => {
    vi.mocked(fetchGetConversationList).mockResolvedValue({ data: null, error: new Error('failed') } as never);
    const store = useAiStore();
    store.conversations = [{ conversationId: 'private-conversation', title: 'private title' } as Api.Ai.Conversation];

    await store.loadConversations();

    expect(store.conversations).toEqual([]);
    expect(store.hasMoreConversations).toBe(false);
  });

  it('does not reopen recovery endpoints via search or stale sidebar clicks after entry denial', async () => {
    const store = useAiStore();
    vi.mocked(fetchGetChatModels).mockResolvedValue(failed('AI_CHAT_PERMISSION_DENIED'));
    await store.loadModels();
    await store.loadConversations('private');
    await store.selectConversation('private');
    expect(fetchGetConversationList).not.toHaveBeenCalled();
    expect(fetchGetConversationDetail).not.toHaveBeenCalled();
    expect(store.currentConversationId).toBeNull();
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

  it('aborts active producers and clears every cached projection on entry denial', async () => {
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
  });

  it.each([false, true])(
    'stops a stranded stream but retains confirmation after transport failure, throws=%s',
    async throws => {
      const store = useAiStore();
      await Promise.all([store.loadModels(), store.loadAgents()]);
      store.currentConversationId = 'conversation-1';
      let signal!: AbortSignal;
      let traceId = '';
      let reading = false;
      vi.stubGlobal(
        'fetch',
        vi.fn((_url, init: RequestInit) => {
          signal = init.signal as AbortSignal;
          traceId = JSON.parse(init.body as string).traceId;
          return Promise.resolve({
            ok: true,
            body: {
              getReader: () => ({
                read: () =>
                  new Promise((_resolve, reject) => {
                    reading = true;
                    signal.addEventListener('abort', () =>
                      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
                    );
                  })
              })
            }
          });
        })
      );
      const sending = store.sendMessage('update my test account');
      await vi.waitFor(() => expect(reading).toBe(true));
      store.pendingActionsById = {
        'action-1': {
          type: 'confirmation_required',
          actionId: 'action-1',
          confirmationId: 'confirmation-1',
          tool: 'user.update',
          toolCallId: 'tool-1',
          sourceToolCallId: 'source-1',
          traceId,
          summary: 'test change',
          expiresAt: new Date(Date.now() + 300000).toISOString()
        }
      };
      store.streamEvents = [
        {
          type: 'tool_call_started',
          tool: 'user.update',
          toolCallId: 'source-1',
          summary: 'test change',
          args: {},
          risk: 'high',
          traceId,
          chipTarget: null
        },
        store.pendingActionsById['action-1']
      ];
      vi.mocked(fetchGetConversationDetail).mockResolvedValue({ data: null, error: new Error('network') } as never);
      if (throws) vi.mocked(fetchAiConfirm).mockRejectedValue(new TypeError('Failed to fetch'));
      else vi.mocked(fetchAiConfirm).mockResolvedValue({ data: null, error: new Error('network') } as never);
      await store.approveTool('action-1');
      const abortedAfterFailure = signal.aborted;
      const streamingAfterFailure = store.isStreaming;
      const pendingAfterFailure = store.pendingActionsById['action-1']?.confirmationId;
      const cardsAfterFailure = store.currentMessages.flatMap(item => store.messageToolCards(item));
      // Release the pre-fix dangling reader so a red assertion never hangs tests.
      if (!abortedAfterFailure) store.stopStreaming();
      await sending;
      store.resetStore();
      expect(abortedAfterFailure).toBe(true);
      expect(streamingAfterFailure).toBe(false);
      expect(pendingAfterFailure).toBe('confirmation-1');
      expect(cardsAfterFailure.map(card => card.started.toolCallId)).toEqual(['tool-1']);
      expect(cardsAfterFailure[0].pendingExpiresAt).toBeTruthy();
      expect(fetchAiConfirm).toHaveBeenCalledTimes(1);
    }
  );

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
    expect(JSON.stringify(store.$state)).not.toContain('private confirmation');
  });
});
