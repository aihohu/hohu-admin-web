export type ToolCallCardProjection = {
  started: Api.Ai.ToolCallStartedEvent;
  result: Api.Ai.ToolCallResultEvent | null;
  isPending: boolean;
  pendingExpiresAt?: string;
  actionId?: string;
  reconciliationRequired?: boolean;
};

export function isReconciliationCode(code?: string | null): boolean {
  return code === 'AI_EXECUTION_OUTCOME_UNKNOWN' || code === 'AI_EXECUTION_RECONCILIATION_REQUIRED';
}

function requiresReconciliation(content: string | null | undefined, callId: string): boolean {
  return (content || '')
    .split('\n')
    .some(line =>
      ['AI_EXECUTION_OUTCOME_UNKNOWN', 'AI_EXECUTION_RECONCILIATION_REQUIRED'].some(
        code => line.trim() === `[${code}] toolCallId=${callId}`
      )
    );
}

function markReconciliation(card: ToolCallCardProjection) {
  card.reconciliationRequired = true;
  card.result = null;
  card.isPending = false;
  card.pendingExpiresAt = undefined;
  card.actionId = undefined;
}

type PendingProjection = Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent;

export function isMessageTombstone(message: Api.Ai.MessageProjection): message is Api.Ai.MessageTombstone {
  return 'status' in message && message.status === 'redacted';
}

export function isPendingActionStatus(action: Api.Ai.PendingActionProjection): action is Api.Ai.PendingActionStatus {
  return 'status' in action && !('actionId' in action);
}

function pendingForTool(
  pendingActions: Record<string, PendingProjection>,
  toolCallId: string
): PendingProjection | undefined {
  return Object.values(pendingActions).find(item => item.toolCallId === toolCallId);
}

function startedFromPending(pending: PendingProjection): Api.Ai.ToolCallStartedEvent {
  return {
    type: 'tool_call_started',
    tool: pending.tool,
    toolCallId: pending.toolCallId,
    summary: pending.presentation?.summary || pending.presentation?.title || pending.summary,
    args: pending.presentation || {},
    risk: 'high',
    traceId: pending.traceId || '',
    chipTarget: null
  };
}

function resultFromMessageToolCall(toolCall: NonNullable<Api.Ai.Message['toolCalls']>[number]) {
  const hasTerminalResult =
    toolCall.ok !== undefined ||
    toolCall.result !== undefined ||
    toolCall.error_code !== undefined ||
    toolCall.duration_ms !== undefined;
  if (!hasTerminalResult) return null;
  return {
    type: 'tool_call_result' as const,
    tool: toolCall.tool,
    toolCallId: toolCall.tool_call_id,
    ok: toolCall.ok ?? false,
    durationMs: toolCall.duration_ms ?? 0,
    result: toolCall.result,
    affectedRows: toolCall.affected_rows ?? null,
    errorCode: toolCall.error_code,
    errorMsg: toolCall.error_msg,
    ui: toolCall.ui
  };
}

/** Build the durable cards owned by one assistant message. */
export function projectMessageToolCards(
  message: Api.Ai.MessageProjection,
  pendingActions: Record<string, PendingProjection> = {}
): ToolCallCardProjection[] {
  if (isMessageTombstone(message) || message.role !== 'assistant') return [];
  const cards: ToolCallCardProjection[] = (message.toolCalls || [])
    .filter(toolCall => Boolean(toolCall.tool && toolCall.tool_call_id))
    .map(toolCall => {
      const pending = pendingForTool(pendingActions, toolCall.tool_call_id);
      const card: ToolCallCardProjection = {
        started: {
          type: 'tool_call_started' as const,
          tool: toolCall.tool,
          toolCallId: toolCall.tool_call_id,
          summary: toolCall.summary ?? '',
          args: toolCall.args ?? {},
          risk: toolCall.risk ?? (pending ? 'high' : undefined),
          traceId: toolCall.trace_id ?? message.traceId ?? '',
          chipTarget: toolCall.chip_target ?? null
        },
        result: resultFromMessageToolCall(toolCall),
        isPending: Boolean(pending),
        pendingExpiresAt: pending?.expiresAt,
        actionId: pending?.actionId
      } satisfies ToolCallCardProjection;
      if (requiresReconciliation(message.content, toolCall.tool_call_id) || isReconciliationCode(toolCall.error_code)) {
        markReconciliation(card);
      }
      return card;
    });

  // A prepared preview may already be durable while its execute action is still
  // pending. Keep both cards in the same assistant owner group.
  for (const pending of Object.values(pendingActions)) {
    if (!pending.traceId || pending.traceId !== message.traceId) continue;
    if (cards.some(card => card.started.toolCallId === pending.toolCallId)) continue;
    cards.push({
      started: startedFromPending(pending),
      result: null,
      isPending: true,
      pendingExpiresAt: pending.expiresAt,
      actionId: pending.actionId
    });
  }
  return cards;
}

/** Build the transient cards for the currently open SSE stream only. */
export function projectStreamToolCards(
  events: Api.Ai.AiStreamEvent[],
  pendingActions: Record<string, PendingProjection>
): ToolCallCardProjection[] {
  const cards: ToolCallCardProjection[] = [];
  const positions = new Map<string, number>();

  const ensureCard = (started: Api.Ai.ToolCallStartedEvent) => {
    const existing = positions.get(started.toolCallId);
    if (existing !== undefined) {
      const card = cards[existing];
      if (card.started.risk === undefined && started.risk !== undefined) card.started = started;
      return card;
    }
    const pending = pendingForTool(pendingActions, started.toolCallId);
    const card: ToolCallCardProjection = {
      started,
      result: null,
      isPending: Boolean(pending),
      pendingExpiresAt: pending?.expiresAt,
      actionId: pending?.actionId
    };
    positions.set(started.toolCallId, cards.length);
    cards.push(card);
    return card;
  };

  for (const event of events) {
    if (event.type === 'tool_call_started') {
      ensureCard(event).started = event;
      continue;
    }
    if (event.type === 'tool_call_result') {
      const card = ensureCard({
        type: 'tool_call_started',
        tool: event.tool,
        toolCallId: event.toolCallId,
        summary: event.tool,
        args: {},
        risk: undefined,
        traceId: '',
        chipTarget: null
      });
      if (card.reconciliationRequired || isReconciliationCode(event.errorCode)) {
        markReconciliation(card);
        continue;
      }
      card.result = event;
      card.isPending = false;
      card.pendingExpiresAt = undefined;
      continue;
    }
    if (event.type === 'confirmation_required' || event.type === 'confirmation_resumed') {
      const pending = pendingForTool(pendingActions, event.toolCallId) || event;
      const card = ensureCard(startedFromPending(pending));
      if (card.reconciliationRequired) continue;
      card.isPending = true;
      card.pendingExpiresAt = pending.expiresAt;
      card.actionId = pending.actionId;
    }
    if (event.type === 'ai_error' && isReconciliationCode(event.errorCode)) {
      for (const card of cards) {
        if (
          !card.result &&
          (!event.message.includes('toolCallId=') || requiresReconciliation(event.message, card.started.toolCallId))
        )
          markReconciliation(card);
      }
    }
  }
  return cards;
}

/** Freeze the transient card list into the existing ai_message.tool_calls shape. */
export function serializeToolCards(cards: ToolCallCardProjection[]): NonNullable<Api.Ai.Message['toolCalls']> {
  return cards.map(card => ({
    tool: card.started.tool,
    tool_call_id: card.started.toolCallId,
    summary: card.started.summary,
    args: card.started.args,
    risk: card.started.risk,
    trace_id: card.started.traceId,
    chip_target: card.started.chipTarget,
    ...(card.result
      ? {
          ok: card.result.ok,
          result: card.result.result,
          affected_rows: card.result.affectedRows,
          error_code: card.result.errorCode,
          error_msg: card.result.errorMsg,
          duration_ms: card.result.durationMs,
          ui: card.result.ui
        }
      : {})
  }));
}

export function messageCoversToolCalls(message: Api.Ai.MessageProjection, expectedToolCallIds: string[]): boolean {
  if (isMessageTombstone(message) || message.role !== 'assistant') return false;
  const actual = new Set([
    ...(message.toolCalls || []).map(toolCall => toolCall.tool_call_id),
    ...(message.completedToolCallIds || [])
  ]);
  return expectedToolCallIds.every(toolCallId => actual.has(toolCallId));
}
