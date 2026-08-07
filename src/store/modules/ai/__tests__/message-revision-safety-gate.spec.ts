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
  fetchGetAvailableModels: vi.fn(),
  fetchRoutingFeedback: vi.fn()
}));

vi.mock('@/utils/storage', () => ({
  localStg: { get: vi.fn() }
}));

import { useAiStore } from '..';

function message(messageId: string, role: Api.Ai.Message['role'], content: string): Api.Ai.Message {
  return {
    messageId,
    conversationId: 'conversation-1',
    parentMessageId: null,
    role,
    messageType: 'text',
    content,
    parts: null,
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-07T00:00:00Z'
  };
}

describe('AI message revision safety gate', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('regenerate fails closed without removing or replaying messages', async () => {
    const store = useAiStore();
    const original = [message('user-1', 'user', 'original'), message('assistant-1', 'assistant', 'answer')];
    store.currentMessages = [...original];

    const result = await store.regenerate();

    expect(result).toBe(false);
    expect(store.currentMessages).toEqual(original);
  });

  it('editAndResend fails closed without truncating messages or clearing attachments', async () => {
    const store = useAiStore();
    const original = [message('user-1', 'user', 'original'), message('assistant-1', 'assistant', 'answer')];
    store.currentMessages = [...original];
    store.addFile('file-1', 'users.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 128);

    const result = await store.editAndResend(0, 'replacement');

    expect(result).toBe(false);
    expect(store.currentMessages).toEqual(original);
    expect(store.attachedFiles).toHaveLength(1);
  });
});
