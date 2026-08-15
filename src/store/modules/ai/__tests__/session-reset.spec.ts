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

vi.mock('@/utils/storage', () => ({
  localStg: { get: vi.fn() }
}));

import { fetchGetConversationList } from '@/service/api';
import { useAiStore } from '..';

describe('AI account session reset', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('clears every account-scoped projection when the login session ends', () => {
    const store = useAiStore();
    store.conversations = [{ conversationId: 'old-conversation', title: 'private' } as Api.Ai.Conversation];
    store.currentConversationId = 'old-conversation';
    store.currentMessages = [{ content: 'private message' } as Api.Ai.Message];
    store.availableAgents = [{ code: 'private-agent' } as Api.Ai.Agent];
    store.selectedAgentCode = 'private-agent';
    store.availableModels = [{ modelId: 'private-model' } as Api.Ai.ModelOption];
    store.selectedModelId = 'private-model';
    store.attachedFiles = [{ fileId: 'private-file' } as Api.Ai.AttachedFile];
    store.pendingActionsById = {
      'private-action': { actionId: 'private-action' } as Api.Ai.ConfirmationRequiredEvent
    };

    store.resetStore();

    expect(store.conversations).toEqual([]);
    expect(store.currentConversationId).toBeNull();
    expect(store.currentMessages).toEqual([]);
    expect(store.availableAgents).toEqual([]);
    expect(store.selectedAgentCode).toBe('');
    expect(store.availableModels).toEqual([]);
    expect(store.selectedModelId).toBe('');
    expect(store.attachedFiles).toEqual([]);
    expect(store.pendingActionsById).toEqual({});
  });

  it('ignores a conversation list response from the previous login session', async () => {
    let resolveRequest!: (value: any) => void;
    vi.mocked(fetchGetConversationList).mockReturnValue(
      new Promise(resolve => {
        resolveRequest = resolve;
      })
    );
    const store = useAiStore();

    const loading = store.loadConversations();
    store.resetStore();
    resolveRequest({
      data: {
        records: [{ conversationId: 'old-conversation', title: 'private' }],
        total: 1,
        current: 1,
        size: 20
      },
      error: null
    });
    await loading;

    expect(store.conversations).toEqual([]);
    expect(store.loading).toBe(false);
  });
});
