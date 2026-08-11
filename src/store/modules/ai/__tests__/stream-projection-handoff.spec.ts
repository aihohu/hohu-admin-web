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
  fetchGetAvailableModels: vi.fn(),
  fetchRoutingFeedback: vi.fn()
}));
vi.mock('@/utils/storage', () => ({ localStg: { get: vi.fn() } }));

import { fetchGetConversationDetail } from '@/service/api';
import { useAiStore } from '..';

const traceId = 'tr_22222222222222222222222222222222';

function assistant(messageId = 'assistant-real'): Api.Ai.Message {
  return {
    messageId,
    conversationId: 'conversation-1',
    parentMessageId: 'user-real',
    role: 'assistant',
    messageType: 'text',
    content: '',
    parts: null,
    toolCalls: [{ tool: 'user.export', tool_call_id: 'tc-export', ok: true, duration_ms: 8 }],
    traceId,
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-12T00:00:01Z'
  };
}

function user(messageId = 'user-real'): Api.Ai.Message {
  return {
    messageId,
    conversationId: 'conversation-1',
    parentMessageId: null,
    role: 'user',
    messageType: 'text',
    content: 'export users',
    parts: null,
    traceId,
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-12T00:00:00Z'
  };
}

function detail(messages: Api.Ai.Message[], pendingActions: Api.Ai.PendingAction[] = []) {
  return {
    data: { conversation: { conversationId: 'conversation-1' }, messages, pendingActions },
    error: null
  } as any;
}

describe('stream projection handoff', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hands off by committed messageId + traceId and clears the recovery buffer', async () => {
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(detail([assistant()]));
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    store.currentMessages = [{ ...assistant('temp-assistant'), messageId: 'temp-assistant' }];
    store.streamEvents = [
      {
        type: 'tool_call_started',
        tool: 'user.export',
        toolCallId: 'tc-export',
        summary: 'export',
        args: {},
        risk: 'high',
        traceId
      }
    ];

    const synced = await store.syncStreamProjection(traceId, ['tc-export'], {
      type: 'done',
      traceId,
      messageId: 'assistant-real',
      persistence: 'committed',
      projection: 'updated'
    });

    expect(synced).toBe(true);
    expect(store.currentMessages.map(message => message.messageId)).toEqual(['assistant-real']);
    expect(store.streamEvents).toEqual([]);
    expect(store.streamHandoffPhase).toBe('persisted');
  });

  it('recovers a lost done ack by request trace and complete tool ids', async () => {
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(detail([assistant()]));
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';

    expect(await store.syncStreamProjection(traceId, ['tc-export'], null)).toBe(true);
    expect(store.currentMessages[0].messageId).toBe('assistant-real');
  });

  it('reconciles a failed assistant save to the committed source projection', async () => {
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(detail([user()]));
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    const temp = assistant('temp-assistant');
    store.currentMessages = [temp];

    expect(
      await store.syncStreamProjection(traceId, ['tc-export'], {
        type: 'done',
        traceId,
        persistence: 'failed',
        projection: 'updated'
      })
    ).toBe(true);
    expect(store.currentMessages).toEqual([user()]);
    expect(store.streamEvents).toEqual([]);
    expect(store.streamHandoffPhase).toBe('persisted');
  });

  it('keeps the temp owner and enters stale when detail is old', async () => {
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(detail([]));
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    const temp = assistant('temp-assistant');
    store.currentMessages = [temp];

    expect(await store.syncStreamProjection(traceId, ['tc-export'], null)).toBe(false);
    expect(store.currentMessages).toEqual([temp]);
    expect(store.streamHandoffPhase).toBe('stale');
  });

  it('keeps the temp owner while a durable confirmation has no terminal assistant yet', async () => {
    const pending: Api.Ai.PendingAction = {
      actionId: 'action-1',
      confirmationId: 'cid-1',
      sourceUserMessageId: 'user-real',
      traceId,
      tool: 'user.export',
      toolCallId: 'tc-export',
      sourceToolCallId: null,
      interactionFlow: 'direct',
      presentation: { title: 'Export users', fields: [], warnings: [] },
      expiresAt: '2026-08-12T00:05:00Z'
    };
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(detail([user()], [pending]));
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    const temp = assistant('temp-assistant');
    store.currentMessages = [user(), temp];
    store.streamEvents = [
      {
        type: 'tool_call_started',
        tool: 'user.export',
        toolCallId: 'tc-export',
        summary: 'export',
        args: {},
        risk: 'high',
        traceId
      }
    ];

    expect(await store.syncStreamProjection(traceId, ['tc-export'], null)).toBe(true);
    expect(store.currentMessages).toEqual([user(), temp]);
    expect(store.streamEvents).toHaveLength(1);
    expect(store.pendingActionsById).toHaveProperty('action-1');
    expect(store.streamHandoffPhase).toBe('awaiting_sync');
  });

  it('reloads history without restoring cards into the global stream buffer', async () => {
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(detail([assistant()]));
    const store = useAiStore();

    await store.selectConversation('conversation-1');

    expect(store.streamEvents).toEqual([]);
    expect(store.messageToolCards(store.currentMessages[0])[0].started.toolCallId).toBe('tc-export');
  });

  it('derives a reloaded pending card immediately after its durable source user', async () => {
    const pending: Api.Ai.PendingAction = {
      actionId: 'action-1',
      confirmationId: 'cid-1',
      sourceUserMessageId: 'user-real',
      traceId,
      tool: 'user.export',
      toolCallId: 'tc-export',
      sourceToolCallId: null,
      interactionFlow: 'direct',
      presentation: { title: 'Export users', fields: [], warnings: [] },
      expiresAt: '2026-08-12T00:05:00Z'
    };
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(detail([user()], [pending]));
    const store = useAiStore();

    await store.selectConversation('conversation-1');

    expect(store.pendingToolCardsAfterMessage(store.currentMessages[0])).toMatchObject([
      { isPending: true, actionId: 'action-1', started: { toolCallId: 'tc-export' } }
    ]);
    expect(store.streamEvents).toEqual([]);
  });

  it('blocks a new command while the previous projection is stale', async () => {
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';
    store.streamHandoffPhase = 'stale';

    await store.sendMessage('next command');

    expect(store.currentMessages).toEqual([]);
  });

  it('drops late chunks from a stream after switching conversations', async () => {
    let releaseRead!: (value: { done: boolean; value?: Uint8Array }) => void;
    const read = vi
      .fn()
      .mockImplementationOnce(() => new Promise(resolve => (releaseRead = resolve)))
      .mockResolvedValue({ done: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => ({ read }) } }));
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(
      detail([
        {
          ...user('conversation-2-user'),
          conversationId: 'conversation-2',
          content: 'new conversation'
        }
      ])
    );
    const store = useAiStore();
    store.currentConversationId = 'conversation-1';

    const sending = store.sendMessage('old conversation');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await store.selectConversation('conversation-2');
    releaseRead({
      done: false,
      value: new TextEncoder().encode('data: {"type":"text-delta","delta":"late"}\n\n')
    });
    await sending;

    expect(store.currentConversationId).toBe('conversation-2');
    expect(store.currentMessages.map(message => message.content)).toEqual(['new conversation']);
    expect(store.streamingText).toBe('');
    expect(store.streamEvents).toEqual([]);
  });
});
