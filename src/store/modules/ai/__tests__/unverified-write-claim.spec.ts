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

describe('unverified write claim handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchGetChatModels).mockResolvedValue({
      data: [{ modelId: 'model-1', label: 'Model', providerCode: 'provider', capabilities: ['text'] }],
      error: null
    } as never);
    vi.mocked(fetchAiAgents).mockResolvedValue({
      data: [{ code: 'dept_mgmt', name: 'Department', description: '', modelPreference: null, displayOrder: 0 }],
      error: null
    } as never);
    vi.mocked(fetchGetConversationDetail).mockResolvedValue({
      data: {
        conversation: { conversationId: 'conversation-1' },
        messages: [],
        pendingActions: []
      },
      error: null
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes an already streamed write claim when the server cannot ground it', async () => {
    let finishRead!: (value: { done: boolean; value?: Uint8Array }) => void;
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: new TextEncoder().encode(
          'data: {"type":"text-delta","delta":"部门已成功创建"}\n\n' +
            'data: {"type":"ai_error","errorCode":"AI_UNVERIFIED_WRITE_CLAIM","message":"unverified"}\n\n'
        )
      })
      .mockImplementationOnce(() => new Promise(resolve => (finishRead = resolve)));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => ({ read }) } }));
    const store = useAiStore();
    await Promise.all([store.loadModels(), store.loadAgents()]);
    store.currentConversationId = 'conversation-1';

    const sending = store.sendMessage('创建一个部门');
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));

    expect(store.streamingText).toBe('');

    finishRead({ done: true });
    await sending;
  });

  it('suppresses provider text after an import field error', async () => {
    let finishRead!: (value: { done: boolean; value?: Uint8Array }) => void;
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: new TextEncoder().encode(
          'data: {"type":"text-delta","delta":"private-invalid@example"}\n\n' +
            'data: {"type":"tool_call_result","tool":"user.import_preview","toolCallId":"tc_import","ok":false,"durationMs":3,"errorCode":"AI_IMPORT_FIELD_ERRORS","errorMsg":"row 2, user_email"}\n\n' +
            'data: {"type":"text-delta","delta":"x, 华东-销售组, 1"}\n\n' +
            'data: {"type":"reasoning-delta","delta":"private-invalid@example"}\n\n'
        )
      })
      .mockImplementationOnce(() => new Promise(resolve => (finishRead = resolve)));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => ({ read }) } }));
    const store = useAiStore();
    await Promise.all([store.loadModels(), store.loadAgents()]);
    store.currentConversationId = 'conversation-1';

    const sending = store.sendMessage('导入这个文件');
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));

    expect(store.streamingText).toBe('');
    expect(store.reasoningText).toBe('');

    finishRead({ done: true });
    await sending;
  });

  it('persists the protected file ID in structured message parts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true })
        })
      }
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = useAiStore();
    await Promise.all([store.loadModels(), store.loadAgents()]);
    store.currentConversationId = 'conversation-1';
    store.addFile('7499337221737025536', 'users.csv', 'text/csv', 128);

    await store.sendMessage('Import this file');

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.messages.at(-1).parts).toContainEqual(
      expect.objectContaining({
        type: 'file',
        fileId: '7499337221737025536',
        mediaType: 'text/csv'
      })
    );
  });
});
