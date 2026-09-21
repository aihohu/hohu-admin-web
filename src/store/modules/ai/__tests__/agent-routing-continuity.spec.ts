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

interface ChatRequest {
  modelId?: string;
  traceId: string;
  agentCode?: string;
  messages: Array<{ role: string; parts: Array<{ type: string; text: string }> }>;
}

describe('AI chat routing requests', () => {
  let requests: ChatRequest[];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    requests = [];
    const persisted: Api.Ai.Message[] = [];
    vi.mocked(fetchGetChatModels).mockResolvedValue({
      data: [{ modelId: '1', label: 'Model', providerCode: 'provider', capabilities: ['text'] }],
      error: null
    } as never);
    vi.mocked(fetchAiAgents).mockResolvedValue({
      data: [{ code: 'user_mgmt', name: 'Users', description: '', modelPreference: null, displayOrder: 1 }],
      error: null
    } as never);
    vi.mocked(fetchGetConversationDetail).mockImplementation(
      async () =>
        ({
          data: { conversation: { conversationId: '1' }, messages: [...persisted], pendingActions: [] },
          error: null
        }) as never
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options: RequestInit) => {
        const request = JSON.parse(String(options.body)) as ChatRequest;
        requests.push(request);
        const source = request.messages.at(-1)!;
        const assistantId = `assistant-${requests.length}`;
        for (const role of ['user', 'assistant'] as const) {
          persisted.push({
            messageId: role === 'assistant' ? assistantId : `user-${requests.length}`,
            conversationId: '1',
            parentMessageId: null,
            role,
            messageType: 'text',
            content: role === 'user' ? source.parts[0].text : 'answer',
            parts: null,
            traceId: request.traceId,
            tokensInput: null,
            tokensOutput: null,
            createTime: ''
          });
        }
        return new Response(
          `data: ${JSON.stringify({
            type: 'done',
            traceId: request.traceId,
            messageId: assistantId,
            persistence: 'committed',
            projection: 'updated'
          })}\n\n`,
          { status: 200 }
        );
      })
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  async function readyStore() {
    const store = useAiStore();
    await Promise.all([store.loadAgents(), store.loadModels()]);
    await store.selectConversation('1');
    return store;
  }

  it('uses an authorized vision model for a newly attached image', async () => {
    const store = await readyStore();
    store.availableModels.push({
      modelId: 'vision',
      label: 'Vision',
      providerCode: 'provider',
      capabilities: ['text', 'vision']
    });
    store.addImage('/uploads/tenant-0/image.png', 'image/png', 'image.png');
    await store.sendMessage('图里有什么');
    expect(requests[0].modelId).toBe('vision');
    expect(requests[0].agentCode).toBe('auto');
  });

  it('keeps an attachment unsent when no authorized vision model exists', async () => {
    const store = await readyStore();
    store.addImage('/uploads/tenant-0/image.png', 'image/png', 'image.png');
    await store.sendMessage('图里有什么');
    expect(requests).toHaveLength(0);
    expect(store.attachedImages).toHaveLength(1);
  });

  it('selects vision for a restored image follow-up', async () => {
    const store = await readyStore();
    store.availableModels.push({
      modelId: 'vision',
      label: 'Vision',
      providerCode: 'provider',
      capabilities: ['text', 'vision']
    });
    store.currentMessages = [
      {
        messageId: 'old',
        role: 'user',
        content: '看图',
        parts: [{ type: 'file', mediaType: 'image/png', url: '/uploads/tenant-0/image.png' }]
      } as Api.Ai.Message
    ];
    await store.sendMessage('左边是什么颜色');
    expect(requests[0].modelId).toBe('vision');
  });

  it('reroutes greetings, topic changes and ellipsis, including after reopening history', async () => {
    const store = await readyStore();
    for (const text of ['你好', '当前有多少用户', '都是哪些']) await store.sendMessage(text);
    await store.selectConversation('1');
    await store.sendMessage('当前有多少角色');
    await store.sendMessage('都是哪些');

    expect(requests).toHaveLength(5);
    expect(requests.map(request => request.agentCode)).toEqual(Array(5).fill('auto'));
    expect(
      requests[2].messages.filter(message => message.role === 'user').map(message => message.parts[0].text)
    ).toEqual(['你好', '当前有多少用户', '都是哪些']);
  });

  it('shows a pending step once when stream and persisted projections overlap', async () => {
    const store = await readyStore();
    const action = {
      type: 'confirmation_required' as const,
      actionId: 'action-2',
      confirmationId: 'cid-2',
      tool: 'user.update',
      toolCallId: 'tc-2',
      summary: '修改第二人',
      expiresAt: '2099-01-01T00:00:00Z',
      traceId: 'tr-1',
      sourceUserMessageId: 'user-1'
    };
    const source = { messageId: 'user-1', role: 'user', content: '调整两个人' } as Api.Ai.Message;
    store.currentMessages = [source];
    store.pendingActionsById = { 'action-2': action };
    store.streamEvents = [action];
    store.isStreaming = true;
    expect(store.pendingToolCardsAfterMessage(source)).toHaveLength(0);
    expect(store.streamToolCards()).toHaveLength(1);
    const persisted = {
      messageId: 'assistant-1',
      role: 'assistant',
      traceId: 'tr-1',
      toolCalls: [{ tool: 'user.update', tool_call_id: 'tc-1', ok: true }]
    } as Api.Ai.Message;
    store.currentMessages.push(persisted);
    expect(store.messageToolCards(persisted).map(card => card.started.toolCallId)).toEqual(['tc-1', 'tc-2']);
    expect(store.streamToolCards()).toHaveLength(0);
  });

  it('preserves explicit manual choices and resumes automatic routing on every subsequent turn', async () => {
    const store = await readyStore();
    store.selectAgent('user_mgmt');
    await store.sendMessage('当前有多少用户');
    await store.sendMessage('都是哪些');
    store.selectAgent('auto');
    await store.sendMessage('当前有多少角色');
    await store.sendMessage('都是哪些');

    expect(requests.map(request => request.agentCode)).toEqual(['user_mgmt', 'user_mgmt', 'auto', 'auto']);
  });

  it('retains the question through stateless clarification and retries that user question', async () => {
    const store = await readyStore();
    vi.mocked(fetch).mockImplementationOnce(
      async () =>
        new Response(
          'data: {"type":"clarification_required","candidates":[{"agentCode":"user_mgmt","name":"用户管理"}],"message":"请选择"}\n\n' +
            'data: {"type":"done","persistence":"not_applicable","projection":"unchanged"}\n\n',
          { status: 200 }
        )
    );
    await store.sendMessage('请帮我查一下员工');
    await store.pickClarificationAgent('user_mgmt');

    expect(requests).toHaveLength(1);
    expect(requests[0].messages.at(-1)).toMatchObject({
      role: 'user',
      parts: [{ type: 'text', text: '请帮我查一下员工' }]
    });
  });

  it('shows the final tool step answer without retaining an earlier future plan', async () => {
    const store = await readyStore();
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    vi.mocked(fetch).mockImplementationOnce(
      async () =>
        new Response(
          new ReadableStream({
            start(value) {
              controller = value;
            }
          })
        )
    );
    const sending = store.sendMessage('修改测试账号');
    await vi.waitFor(() => expect(controller).toBeDefined());
    const encoder = new TextEncoder();
    controller.enqueue(
      encoder.encode('data: {"type":"start-step"}\n\ndata: {"type":"text-delta","delta":"I will look it up."}\n\n')
    );
    await vi.waitFor(() => expect(store.streamingText).toBe('I will look it up.'));
    controller.enqueue(
      encoder.encode('data: {"type":"start-step"}\n\ndata: {"type":"text-delta","delta":"已完成修改。"}\n\n')
    );
    await vi.waitFor(() => expect(store.streamingText).toBe('已完成修改。'));
    controller.enqueue(
      encoder.encode('data: {"type":"done","persistence":"not_applicable","projection":"unchanged"}\n\n')
    );
    controller.close();
    await sending;
  });

  it('does not let a late previous-turn snapshot erase a newly completed question', async () => {
    const store = await readyStore();
    let resolveOld!: (value: never) => void;
    vi.mocked(fetchGetConversationDetail).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve;
        })
    );
    const oldSync = store.syncStreamProjection('tr_previous', [], {
      type: 'done',
      persistence: 'not_applicable',
      projection: 'unchanged'
    });
    await store.sendMessage('当前有多少用户');
    resolveOld({
      data: { conversation: { conversationId: '1' }, messages: [], pendingActions: [] },
      error: null
    } as never);
    await oldSync;

    expect(store.currentMessages).toHaveLength(2);
    expect(store.currentMessages[0]).toMatchObject({ content: '当前有多少用户', role: 'user' });
  });
});
