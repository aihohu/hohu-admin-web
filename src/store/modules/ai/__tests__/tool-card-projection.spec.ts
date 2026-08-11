import { describe, expect, it } from 'vitest';
import {
  messageCoversToolCalls,
  projectMessageToolCards,
  projectStreamToolCards,
  serializeToolCards
} from '../tool-card-projection';

function message(toolCalls: Api.Ai.Message['toolCalls']): Api.Ai.Message {
  return {
    messageId: 'assistant-1',
    conversationId: 'conversation-1',
    parentMessageId: 'user-1',
    role: 'assistant',
    messageType: 'text',
    content: '',
    parts: null,
    toolCalls,
    traceId: 'tr_11111111111111111111111111111111',
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-12T00:00:00Z'
  };
}

describe('per-message tool card projection', () => {
  it('keeps each message tool array order and does not turn an unfinished call into a failure', () => {
    const cards = projectMessageToolCards(
      message([
        { tool: 'user.export', tool_call_id: 'tc-1', ok: true, duration_ms: 12 },
        { tool: 'user.count', tool_call_id: 'tc-2' },
        { tool: 'user.stats', tool_call_id: 'tc-3', ok: false, error_code: 'AI_TOOL_TIMEOUT' }
      ])
    );

    expect(cards.map(card => card.started.toolCallId)).toEqual(['tc-1', 'tc-2', 'tc-3']);
    expect(cards[0].result?.ok).toBe(true);
    expect(cards[1].result).toBeNull();
    expect(cards[2].result?.errorCode).toBe('AI_TOOL_TIMEOUT');
  });

  it('pairs streaming results without changing started order', () => {
    const events: Api.Ai.AiStreamEvent[] = [
      {
        type: 'tool_call_started',
        tool: 'first',
        toolCallId: 'tc-1',
        summary: 'first',
        args: {},
        risk: 'low',
        traceId: 'tr-1'
      },
      {
        type: 'tool_call_started',
        tool: 'second',
        toolCallId: 'tc-2',
        summary: 'second',
        args: {},
        risk: 'low',
        traceId: 'tr-1'
      },
      { type: 'tool_call_result', tool: 'second', toolCallId: 'tc-2', ok: true, durationMs: 2 },
      { type: 'tool_call_result', tool: 'first', toolCallId: 'tc-1', ok: true, durationMs: 5 }
    ];

    const cards = projectStreamToolCards(events, {});
    expect(cards.map(card => card.started.toolCallId)).toEqual(['tc-1', 'tc-2']);
    expect(cards.map(card => card.result?.durationMs)).toEqual([5, 2]);
  });

  it('keeps prepared preview and pending execute in one owner group without duplicates', () => {
    const pending: Api.Ai.ConfirmationRequiredEvent = {
      type: 'confirmation_required',
      confirmationId: 'cid-1',
      actionId: 'action-1',
      sourceUserMessageId: 'user-1',
      traceId: 'tr_11111111111111111111111111111111',
      tool: 'user.import_execute',
      toolCallId: 'tc-execute',
      sourceToolCallId: 'tc-preview',
      interactionFlow: 'prepared',
      summary: 'confirm import',
      presentation: { title: 'Import users', fields: [], warnings: [] },
      expiresAt: '2026-08-12T00:05:00Z'
    };
    const cards = projectMessageToolCards(
      message([{ tool: 'user.import_preview', tool_call_id: 'tc-preview', ok: true }]),
      { 'action-1': pending }
    );

    expect(cards.map(card => card.started.toolCallId)).toEqual(['tc-preview', 'tc-execute']);
    expect(cards[1]).toMatchObject({ isPending: true, actionId: 'action-1' });
  });

  it('serializes a tool-only temp owner and verifies complete durable coverage', () => {
    const cards = projectStreamToolCards(
      [
        {
          type: 'tool_call_started',
          tool: 'user.count',
          toolCallId: 'tc-only',
          summary: 'count',
          args: {},
          risk: 'low',
          traceId: 'tr-only'
        },
        { type: 'tool_call_result', tool: 'user.count', toolCallId: 'tc-only', ok: true, durationMs: 3 }
      ],
      {}
    );
    const owner = message(serializeToolCards(cards));

    expect(owner.content).toBe('');
    expect(messageCoversToolCalls(owner, ['tc-only'])).toBe(true);
    expect(messageCoversToolCalls(owner, ['tc-only', 'tc-missing'])).toBe(false);
  });
});
