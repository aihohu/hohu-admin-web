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

import { fetchGetConversationDetail, fetchGetConversationList } from '@/service/api';
import { fetchAiAgents, fetchGetChatModels } from '@/service/api/ai';
import { useAiStore } from '..';

const traceId = 'tr_33333333333333333333333333333333';

function sensitiveAssistant(): Api.Ai.Message {
  return {
    messageId: 'assistant-1',
    conversationId: 'conversation-1',
    parentMessageId: 'user-1',
    role: 'assistant',
    messageType: 'text',
    content: 'sensitive result',
    parts: null,
    toolCalls: [
      {
        tool: 'user.list',
        tool_call_id: 'tool-1',
        ok: true,
        result: { userName: 'private' },
        ui: { viewType: 'plain_json', viewData: { userName: 'private' } }
      }
    ],
    traceId,
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-15T00:00:01Z'
  };
}

describe('AI projection revocation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchGetConversationList).mockResolvedValue({
      data: { records: [], total: 0, current: 1, size: 20 },
      error: null
    } as never);
    vi.mocked(fetchGetChatModels).mockResolvedValue({
      data: [{ modelId: '1', label: 'Provider / Model', providerCode: 'provider', capabilities: ['text'] }],
      error: null
    } as never);
    vi.mocked(fetchAiAgents).mockResolvedValue({
      data: [{ code: 'shared', name: 'Shared', description: '', modelPreference: null, displayOrder: 0 }],
      error: null
    } as never);
  });

  it('reauthorizes the cached conversation projection during chat initialization', async () => {
    vi.mocked(fetchGetConversationDetail).mockResolvedValue({
      data: {
        conversation: { conversationId: 'conversation-1' },
        messages: [
          {
            messageId: 'assistant-1',
            role: 'assistant',
            status: 'redacted',
            errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN'
          }
        ],
        pendingActions: []
      },
      error: null
    } as never);
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    store.currentMessages = [sensitiveAssistant()];

    await store.init();

    expect(fetchGetConversationDetail).toHaveBeenCalledWith('conversation-1');
    expect(JSON.stringify(store.$state)).not.toContain('private');
    expect(store.currentMessages).toEqual([expect.objectContaining({ messageId: 'assistant-1', status: 'redacted' })]);
  });

  it('replaces cached result cards and confirmation presentation with safe projections', async () => {
    vi.mocked(fetchGetConversationDetail).mockResolvedValue({
      data: {
        conversation: { conversationId: 'conversation-1' },
        messages: [
          {
            messageId: 'assistant-1',
            role: 'assistant',
            status: 'redacted',
            errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN'
          }
        ],
        pendingActions: [
          {
            confirmationId: 'confirmation-1',
            status: 'succeeded',
            errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN',
            finishedAt: '2026-08-15T00:00:02Z'
          }
        ]
      },
      error: null
    } as never);

    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    store.currentMessages = [sensitiveAssistant()];
    store.pendingActionsById = {
      'action-1': {
        type: 'confirmation_required',
        confirmationId: 'confirmation-1',
        actionId: 'action-1',
        tool: 'user.list',
        toolCallId: 'tool-1',
        summary: 'sensitive summary',
        presentation: {
          title: 'Sensitive presentation',
          fields: [{ label: 'user', value: 'private' }],
          warnings: []
        },
        expiresAt: '2026-08-15T00:05:00Z'
      }
    };
    store.streamEvents = [
      {
        type: 'tool_call_result',
        tool: 'user.list',
        toolCallId: 'tool-1',
        ok: true,
        durationMs: 1,
        result: { userName: 'private' }
      }
    ];

    expect(await store.syncStreamProjection(traceId, ['tool-1'], null)).toBe(true);
    expect(store.currentMessages).toEqual([
      {
        messageId: 'assistant-1',
        role: 'assistant',
        status: 'redacted',
        errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN'
      }
    ]);
    expect(store.messageToolCards(store.currentMessages[0])).toEqual([]);
    expect(store.pendingActionsById).toEqual({});
    expect(store.redactedPendingActions).toEqual([
      expect.objectContaining({ confirmationId: 'confirmation-1', status: 'succeeded' })
    ]);
    expect(store.streamEvents).toEqual([]);
    expect(JSON.stringify(store.$state)).not.toContain('private');
  });

  it('invalidates in-flight stream producers when a projection is revoked', async () => {
    let releaseFirstRead!: () => void;
    let releaseSecondRead!: () => void;
    const firstRead = new Promise<{ done: false; value: Uint8Array }>(resolve => {
      releaseFirstRead = () =>
        resolve({
          done: false,
          value: new TextEncoder().encode('data: {"type":"text-delta","delta":"late secret"}\n\n')
        });
    });
    const secondRead = new Promise<{ done: true; value: undefined }>(resolve => {
      releaseSecondRead = () => resolve({ done: true, value: undefined });
    });
    const read = vi
      .fn()
      .mockImplementationOnce(() => firstRead)
      .mockImplementationOnce(() => secondRead);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => ({ read }) }
      })
    );
    vi.mocked(fetchGetConversationDetail).mockResolvedValue({
      data: {
        conversation: { conversationId: 'conversation-1' },
        messages: [
          {
            messageId: 'assistant-1',
            role: 'assistant',
            status: 'redacted',
            errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN'
          }
        ],
        pendingActions: []
      },
      error: null
    } as never);
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    store.reasoningText = 'private reasoning';
    await Promise.all([store.loadModels(), store.loadAgents()]);

    const sending = store.sendMessage('hello');
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    await store.syncStreamProjection(traceId, [], null);
    releaseFirstRead();
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));

    expect(store.streamingText).toBe('');
    expect(store.reasoningText).toBe('');
    expect(JSON.stringify(store.$state)).not.toContain('late secret');

    releaseSecondRead();
    await sending;
    vi.unstubAllGlobals();
  });
});
