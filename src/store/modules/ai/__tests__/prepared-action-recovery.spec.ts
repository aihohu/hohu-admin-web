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

import { fetchGetConversationDetail } from '@/service/api';
import { fetchAiConfirm, fetchAiOperationLog } from '@/service/api/ai';
import { useAiStore } from '..';

const pendingAction: Api.Ai.PendingAction = {
  actionId: '9001',
  confirmationId: 'cid_prepared_9001',
  sourceUserMessageId: '1001',
  traceId: 'tr_prepared_9001',
  tool: 'user.import_execute',
  toolCallId: 'tc_execute_9001',
  sourceToolCallId: 'tc_preview_9001',
  interactionFlow: 'prepared',
  presentation: {
    title: 'Import 2 users',
    fields: [
      { label: 'new', value: 2 },
      { label: 'onConflict', value: 'skip' }
    ],
    warnings: []
  },
  expiresAt: '2026-08-08T12:00:00Z'
};

function detail(actions: Api.Ai.PendingAction[]) {
  return {
    data: {
      conversation: { conversationId: '1' },
      messages: [],
      pendingActions: actions
    },
    error: null
  } as any;
}

describe('prepared action recovery', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('restores a safe confirmation from conversation detail without frozen args', async () => {
    vi.mocked(fetchGetConversationDetail).mockResolvedValue(detail([pendingAction]));
    const store = useAiStore();

    await store.selectConversation('1');

    expect(store.pendingConfirmation?.actionId).toBe('9001');
    expect(store.pendingConfirmation).not.toHaveProperty('args');
    expect(store.pendingConfirmation?.presentation?.fields).toEqual([
      { label: 'new', value: 2 },
      { label: 'onConflict', value: 'skip' }
    ]);
    expect(JSON.stringify(store.pendingActionsById)).not.toContain('preview_token');
  });

  it('keeps pending state when confirm fails and removes it only after a terminal response', async () => {
    vi.mocked(fetchGetConversationDetail)
      .mockResolvedValueOnce(detail([pendingAction]))
      .mockResolvedValueOnce({ data: null, error: { message: 'offline' } } as any)
      .mockResolvedValueOnce(detail([]));
    vi.mocked(fetchAiConfirm)
      .mockResolvedValueOnce({ data: null, error: { message: 'offline' } } as any)
      .mockResolvedValueOnce({
        data: { actionId: '9001', toolCallId: 'tc_execute_9001', status: 'succeeded' },
        error: null
      } as any);
    const store = useAiStore();
    await store.selectConversation('1');

    await store.approveTool();
    expect(store.pendingConfirmation?.actionId).toBe('9001');

    await store.approveTool();
    expect(store.pendingConfirmation).toBeNull();
    expect(store.pendingActionsById).toEqual({});
  });

  it('reloads the durable terminal projection when a concurrent confirm returns running', async () => {
    vi.useFakeTimers();
    try {
      const terminalMessage = {
        messageId: '2001',
        conversationId: '1',
        parentMessageId: '1001',
        role: 'assistant',
        messageType: 'text',
        content: '',
        parts: null,
        toolCalls: [
          { tool: 'user.import_preview', tool_call_id: 'tc_preview_9001', ok: true, duration_ms: 0 },
          { tool: 'user.import_execute', tool_call_id: 'tc_execute_9001', ok: true, duration_ms: 12 }
        ],
        traceId: 'tr_prepared_9001',
        tokensInput: null,
        tokensOutput: null,
        createTime: '2026-08-08T12:00:01Z'
      } satisfies Api.Ai.Message;
      vi.mocked(fetchGetConversationDetail)
        .mockResolvedValueOnce(detail([pendingAction]))
        .mockResolvedValueOnce({
          data: {
            conversation: { conversationId: '1' },
            messages: [terminalMessage],
            pendingActions: []
          },
          error: null
        } as any);
      vi.mocked(fetchAiConfirm).mockResolvedValue({
        data: { actionId: '9001', toolCallId: 'tc_execute_9001', status: 'running' },
        error: null
      } as any);
      vi.mocked(fetchAiOperationLog).mockResolvedValue({
        data: { toolCallId: 'tc_execute_9001', status: 'success', durationMs: 12 },
        error: null
      } as any);
      const store = useAiStore();
      await store.selectConversation('1');

      await store.approveTool();
      await vi.advanceTimersByTimeAsync(1500);

      expect(store.currentMessages).toEqual([terminalMessage]);
      expect(store.pendingConfirmation).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves the action selected by a card instead of the first pending action', async () => {
    const second = {
      ...pendingAction,
      actionId: '9002',
      confirmationId: 'cid_prepared_9002',
      toolCallId: 'tc_execute_9002'
    };
    vi.mocked(fetchGetConversationDetail)
      .mockResolvedValueOnce(detail([pendingAction, second]))
      .mockResolvedValueOnce(detail([pendingAction]));
    vi.mocked(fetchAiConfirm).mockResolvedValue({
      data: { actionId: '9002', toolCallId: 'tc_execute_9002', status: 'rejected' },
      error: null
    } as any);
    const store = useAiStore();
    await store.selectConversation('1');

    await store.rejectTool('9002');

    expect(fetchAiConfirm).toHaveBeenCalledWith({
      confirmationId: 'cid_prepared_9002',
      action: 'reject'
    });
    expect(store.pendingActionsById).toHaveProperty('9001');
    expect(store.pendingActionsById).not.toHaveProperty('9002');
  });

  it('polls concurrent prepared actions independently', async () => {
    vi.useFakeTimers();
    try {
      const second = {
        ...pendingAction,
        actionId: '9002',
        confirmationId: 'cid_prepared_9002',
        toolCallId: 'tc_execute_9002'
      };
      const terminal = (action: Api.Ai.PendingAction): Api.Ai.Message => ({
        messageId: `message-${action.actionId}`,
        conversationId: '1',
        parentMessageId: action.sourceUserMessageId,
        role: 'assistant',
        messageType: 'text',
        content: '',
        parts: null,
        toolCalls: [
          { tool: action.tool, tool_call_id: action.sourceToolCallId || '', ok: true, duration_ms: 0 },
          { tool: action.tool, tool_call_id: action.toolCallId, ok: true, duration_ms: 9 }
        ],
        traceId: action.traceId,
        tokensInput: null,
        tokensOutput: null,
        createTime: '2026-08-08T12:00:01Z'
      });
      vi.mocked(fetchGetConversationDetail)
        .mockResolvedValueOnce(detail([pendingAction, second]))
        .mockResolvedValueOnce({
          data: {
            conversation: { conversationId: '1' },
            messages: [terminal(pendingAction)],
            pendingActions: [second]
          },
          error: null
        } as any)
        .mockResolvedValueOnce({
          data: {
            conversation: { conversationId: '1' },
            messages: [terminal(pendingAction), terminal(second)],
            pendingActions: []
          },
          error: null
        } as any);
      vi.mocked(fetchAiConfirm).mockImplementation(
        async ({ confirmationId }) =>
          ({
            data: {
              actionId: confirmationId.endsWith('9001') ? '9001' : '9002',
              toolCallId: confirmationId.endsWith('9001') ? 'tc_execute_9001' : 'tc_execute_9002',
              status: 'running'
            },
            error: null
          }) as any
      );
      vi.mocked(fetchAiOperationLog).mockImplementation(
        async toolCallId =>
          ({
            data: { toolCallId, status: 'success', durationMs: 9 },
            error: null
          }) as any
      );
      const store = useAiStore();
      await store.selectConversation('1');

      await Promise.all([store.approveTool('9001'), store.approveTool('9002')]);
      await vi.advanceTimersByTimeAsync(1500);

      expect(fetchAiOperationLog).toHaveBeenCalledWith('tc_execute_9001');
      expect(fetchAiOperationLog).toHaveBeenCalledWith('tc_execute_9002');
      expect(store.pendingActionsById).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });
});
