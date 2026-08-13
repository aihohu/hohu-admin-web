import { defineStore } from 'pinia';
import { ref } from 'vue';
import { SetupStoreId } from '@/enum';
import { $t } from '@/locales';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { fetchGetConversationList, fetchGetConversationDetail, fetchDeleteConversation } from '@/service/api';
import {
  fetchAiAgents,
  fetchAiConfirm,
  fetchAiOperationLog,
  fetchGetAvailableModels,
  fetchRoutingFeedback
} from '@/service/api/ai';
import {
  messageCoversToolCalls,
  projectMessageToolCards,
  projectStreamToolCards,
  serializeToolCards
} from './tool-card-projection';
import { localizeErrorCode } from '@/views/ai/chat/modules/dynamic-message-i18n';

export function createChatTraceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `tr_${hex}`;
}

export const useAiStore = defineStore(SetupStoreId.Ai, () => {
  const conversations = ref<Api.Ai.Conversation[]>([]);
  const currentConversationId = ref<string | null>(null);
  const currentMessages = ref<Api.Ai.Message[]>([]);
  const streamingText = ref('');
  /** 当前 LLM 推理过程文本（Vercel UI Protocol v4 reasoning-delta 累积；展示位待后续 PR） */
  const reasoningText = ref('');
  const isStreaming = ref(false);
  const loading = ref(false);
  const availableModels = ref<Api.Ai.AvailableModel[]>([]);
  const selectedModelId = ref<string>('');
  const conversationCurrent = ref(1);
  const conversationSize = ref(20);
  const hasMoreConversations = ref(true);
  const searchTitle = ref<string | null>(null);
  const attachedImages = ref<{ fileUrl: string; mediaType: string; fileName: string }[]>([]);

  // Spreadsheet and CSV attachments are referenced by file ID in the outgoing prompt.
  const attachedFiles = ref<Api.Ai.AttachedFile[]>([]);

  // Agents available to the current user and the active routing selection.
  const availableAgents = ref<Api.Ai.Agent[]>([]);
  const selectedAgentCode = ref<string>('');

  // ====== Stream events and human confirmation ======
  /** 当前流的 tool 调用事件列表（tool_call_started + tool_call_result，按 toolCallId 配对） */
  const streamEvents = ref<Api.Ai.AiStreamEvent[]>([]);
  /** Current run durability handoff. Only streaming or the temp message may render cards, never both. */
  const streamHandoffPhase = ref<'idle' | 'streaming' | 'awaiting_sync' | 'persisted' | 'stale'>('idle');
  const activeStreamTraceId = ref<string | null>(null);
  const lastDoneAck = ref<Api.Ai.DoneEvent | null>(null);
  /** 当前挂起的 HITL 确认（一次只允许一个；续传时为 ConfirmationResumedEvent） */
  const pendingConfirmation = ref<Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent | null>(null);
  /** Durable prepared confirmations keyed by actionId; detail/SSE reconcile into this map. */
  const pendingActionsById = ref<Record<string, Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent>>(
    {}
  );
  /** confirmation restored by attemptResume and cleared when its tool result arrives */
  const pendingConfirmationId = ref<string | null>(null);
  /** tool call polled when a resume request reports that confirmation is already handled */
  const pendingToolCallId = ref<string | null>(null);
  /** retry count exposed for the active confirmation; each confirmation has a three-attempt budget */
  const resumeAttempts = ref(0);
  /** Each durable confirmation owns an independent resume retry budget. */
  const resumeAttemptsByConfirmation = new Map<string, number>();
  /** confirm 后 30s 轮询；每个 tool 独立，不能让后确认的 action 覆盖前一个。 */
  const pollTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const pollOwners = new Map<string, symbol>();
  const resumeControllers = new Map<string, AbortController>();
  const activeResumeIds = new Set<string>();
  const resumeExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Candidate Agents offered when automatic routing needs user clarification.
  /** 当前挂起的 clarification 事件（candidates 列表 + 提示文案），null 表示无 */
  const pendingClarification = ref<Api.Ai.ClarificationRequiredEvent | null>(null);

  let abortController: AbortController | null = null;
  let selectSeq = 0;
  let activeRunSeq = 0;

  function abortResumes() {
    for (const controller of resumeControllers.values()) controller.abort();
    for (const timer of resumeExpiryTimers.values()) clearTimeout(timer);
    resumeControllers.clear();
    activeResumeIds.clear();
    resumeExpiryTimers.clear();
  }

  function scheduleResumeExpiryReconciliation(
    confirmation: Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent
  ) {
    const existing = resumeExpiryTimers.get(confirmation.confirmationId);
    if (existing) clearTimeout(existing);
    const expiresAt = Date.parse(confirmation.expiresAt);
    const delay = Number.isFinite(expiresAt) ? Math.max(0, expiresAt - Date.now() + 1000) : 1000;
    const timer = setTimeout(async () => {
      resumeExpiryTimers.delete(confirmation.confirmationId);
      if (findPendingByConfirmationId(confirmation.confirmationId)) {
        await refreshCurrentConversationDetail();
      }
    }, delay);
    resumeExpiryTimers.set(confirmation.confirmationId, timer);
  }

  function focusPendingConfirmation() {
    const values = Object.values(pendingActionsById.value);
    pendingConfirmation.value = values[0] ?? null;
    pendingConfirmationId.value = pendingConfirmation.value?.confirmationId ?? null;
    pendingToolCallId.value = pendingConfirmation.value?.toolCallId ?? null;
    resumeAttempts.value = pendingConfirmationId.value
      ? resumeAttemptsByConfirmation.get(pendingConfirmationId.value) || 0
      : 0;
  }

  function findPendingByConfirmationId(confirmationId: string) {
    return Object.values(pendingActionsById.value).find(item => item.confirmationId === confirmationId);
  }

  function getResumeAttempts(confirmationId: string) {
    return resumeAttemptsByConfirmation.get(confirmationId) || 0;
  }

  function setResumeAttempts(confirmationId: string, attempts: number) {
    resumeAttemptsByConfirmation.set(confirmationId, attempts);
    if (pendingConfirmationId.value === confirmationId) resumeAttempts.value = attempts;
  }

  function messageToolCards(message: Api.Ai.Message) {
    return projectMessageToolCards(message, pendingActionsById.value);
  }

  function streamToolCards() {
    return projectStreamToolCards(streamEvents.value, pendingActionsById.value);
  }

  function pendingToolCardsAfterMessage(message: Api.Ai.Message) {
    if (message.role !== 'user') return [];
    const actions = Object.values(pendingActionsById.value).filter(action => {
      if (action.sourceUserMessageId !== message.messageId) return false;
      return !currentMessages.value.some(
        candidate => candidate.role === 'assistant' && candidate.traceId && candidate.traceId === action.traceId
      );
    });
    return actions.flatMap(action =>
      projectStreamToolCards([action], {
        [action.actionId || `legacy:${action.confirmationId}`]: action
      })
    );
  }

  function upsertPendingConfirmation(event: Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent) {
    const projection = {
      ...event,
      traceId: event.traceId || activeStreamTraceId.value || undefined
    };
    const key = projection.actionId || `legacy:${projection.confirmationId}`;
    pendingActionsById.value = { ...pendingActionsById.value, [key]: projection };
    focusPendingConfirmation();
  }

  function reconcilePendingActions(actions: Api.Ai.PendingAction[]) {
    const activeConfirmationIds = new Set(actions.map(action => action.confirmationId));
    for (const confirmationId of resumeAttemptsByConfirmation.keys()) {
      if (!activeConfirmationIds.has(confirmationId)) resumeAttemptsByConfirmation.delete(confirmationId);
    }
    for (const [confirmationId, timer] of resumeExpiryTimers) {
      if (!activeConfirmationIds.has(confirmationId)) {
        clearTimeout(timer);
        resumeExpiryTimers.delete(confirmationId);
      }
    }
    pendingActionsById.value = Object.fromEntries(
      actions.map(action => [
        action.actionId,
        {
          type: 'confirmation_required' as const,
          confirmationId: action.confirmationId,
          actionId: action.actionId,
          tool: action.tool,
          toolCallId: action.toolCallId,
          sourceToolCallId: action.sourceToolCallId,
          interactionFlow: action.interactionFlow,
          summary: action.presentation.summary || action.presentation.title || action.tool,
          presentation: action.presentation,
          sourceUserMessageId: action.sourceUserMessageId,
          traceId: action.traceId,
          expiresAt: action.expiresAt
        }
      ])
    );
    focusPendingConfirmation();
  }

  function removePendingByToolCallId(toolCallId: string) {
    for (const item of Object.values(pendingActionsById.value)) {
      if (item.toolCallId === toolCallId) {
        resumeAttemptsByConfirmation.delete(item.confirmationId);
        const timer = resumeExpiryTimers.get(item.confirmationId);
        if (timer) clearTimeout(timer);
        resumeExpiryTimers.delete(item.confirmationId);
      }
    }
    pendingActionsById.value = Object.fromEntries(
      Object.entries(pendingActionsById.value).filter(([, item]) => item.toolCallId !== toolCallId)
    );
    focusPendingConfirmation();
  }

  async function refreshCurrentConversationDetail(): Promise<boolean> {
    const conversationId = currentConversationId.value;
    if (!conversationId) return false;
    const detail = await fetchGetConversationDetail(conversationId);
    if (currentConversationId.value !== conversationId || detail.error || !detail.data) return false;
    currentMessages.value = detail.data.messages;
    reconcilePendingActions(detail.data.pendingActions || []);
    return true;
  }

  function findDurableAssistant(
    messages: Api.Ai.Message[],
    traceId: string,
    expectedToolCallIds: string[],
    done: Api.Ai.DoneEvent | null
  ): Api.Ai.Message | undefined {
    return messages.find(message => {
      if (message.role !== 'assistant') return false;
      if (done?.messageId && message.messageId !== done.messageId) return false;
      if (message.traceId !== (done?.traceId || traceId)) return false;
      return messageCoversToolCalls(message, expectedToolCallIds);
    });
  }

  async function syncStreamProjection(
    traceId = activeStreamTraceId.value,
    expectedToolCallIds = streamToolCards().map(card => card.started.toolCallId),
    done = lastDoneAck.value,
    acceptPendingHandoff = true
  ): Promise<boolean> {
    const conversationId = currentConversationId.value;
    if (!conversationId || !traceId) return false;
    let detail;
    try {
      detail = await fetchGetConversationDetail(conversationId);
    } catch {
      if (currentConversationId.value === conversationId) streamHandoffPhase.value = 'stale';
      return false;
    }
    if (currentConversationId.value !== conversationId) return false;
    if (detail.error || !detail.data) {
      streamHandoffPhase.value = 'stale';
      return false;
    }

    const pending = detail.data.pendingActions || [];
    const projectionUnchanged = done?.projection === 'unchanged';
    const durableAssistant = findDurableAssistant(detail.data.messages, traceId, expectedToolCallIds, done);
    const durableUser = detail.data.messages.some(message => message.role === 'user' && message.traceId === traceId);
    const durablePending = pending.some(action => action.traceId === traceId);
    const failedButSourceCommitted = done?.persistence === 'failed' && done.projection === 'updated' && durableUser;

    if (durablePending && acceptPendingHandoff && !durableAssistant) {
      // The action is durable, but its assistant projection is not terminal yet.
      // Preserve the temp preview owner and enrich it from pendingActions instead
      // of replacing it with a detail snapshot that only contains the source user.
      reconcilePendingActions(pending);
      streamHandoffPhase.value = 'awaiting_sync';
      return true;
    }

    if (projectionUnchanged || durableAssistant || failedButSourceCommitted) {
      currentMessages.value = detail.data.messages;
      reconcilePendingActions(pending);
      streamEvents.value = [];
      streamHandoffPhase.value = 'persisted';
      return true;
    }

    // The detail response is authoritative, but an old snapshot must not erase
    // the only visible copy of this run. Keep the temp message and recovery buffer.
    if (acceptPendingHandoff) reconcilePendingActions(pending);
    streamHandoffPhase.value = 'stale';
    return false;
  }

  function confirmationToolCallIds(confirmation: Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent) {
    return [...new Set([confirmation.sourceToolCallId, confirmation.toolCallId].filter(Boolean) as string[])];
  }

  async function syncConfirmationTerminal(
    confirmation: Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent
  ) {
    removePendingByToolCallId(confirmation.toolCallId);
    const traceId = confirmation.traceId || activeStreamTraceId.value;
    if (!traceId) return refreshCurrentConversationDetail();
    return syncStreamProjection(traceId, confirmationToolCallIds(confirmation), null, false);
  }

  function freezeTempAssistantProjection(
    traceId: string,
    conversationId: string,
    content: string,
    cards = streamToolCards()
  ) {
    const toolCalls = serializeToolCards(cards);
    if (!content && toolCalls.length === 0) return;
    const existing = currentMessages.value.find(
      message => message.role === 'assistant' && message.traceId === traceId && message.messageId.startsWith('temp-')
    );
    if (existing) {
      existing.content = content;
      existing.toolCalls = toolCalls;
      return;
    }
    currentMessages.value.push({
      messageId: `temp-assistant-${Date.now()}`,
      conversationId,
      parentMessageId: null,
      role: 'assistant',
      messageType: 'text',
      content,
      parts: null,
      toolCalls,
      traceId,
      tokensInput: null,
      tokensOutput: null,
      createTime: new Date().toISOString()
    });
  }

  /** get base URL for SSE fetch */
  function getBaseUrl(): string {
    const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
    const { baseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);
    return baseURL;
  }

  /** load conversation list (first page, reset) */
  async function loadConversations(title?: string | null) {
    searchTitle.value = title ?? null;
    conversationCurrent.value = 1;
    hasMoreConversations.value = true;
    loading.value = true;
    try {
      const { data, error } = await fetchGetConversationList({
        current: 1,
        size: conversationSize.value,
        status: null,
        title: searchTitle.value
      });
      if (!error && data) {
        conversations.value = data.records;
        hasMoreConversations.value = data.records.length >= conversationSize.value;
      }
    } finally {
      loading.value = false;
    }
  }

  /** load more conversations (append next page) */
  async function loadMoreConversations() {
    if (loading.value || !hasMoreConversations.value) return;
    loading.value = true;
    conversationCurrent.value += 1;
    try {
      const { data, error } = await fetchGetConversationList({
        current: conversationCurrent.value,
        size: conversationSize.value,
        status: null,
        title: searchTitle.value
      });
      if (!error && data) {
        conversations.value.push(...data.records);
        hasMoreConversations.value = data.records.length >= conversationSize.value;
      } else {
        hasMoreConversations.value = false;
      }
    } finally {
      loading.value = false;
    }
  }

  /** select conversation and load messages */
  async function selectConversation(conversationId: string) {
    activeRunSeq += 1;
    abortController?.abort();
    abortController = null;
    abortResumes();
    stopPolling();
    isStreaming.value = false;
    const seq = ++selectSeq;
    currentConversationId.value = conversationId;
    streamingText.value = '';
    streamEvents.value = [];
    streamHandoffPhase.value = 'idle';
    activeStreamTraceId.value = null;
    lastDoneAck.value = null;
    pendingConfirmation.value = null;
    pendingActionsById.value = {};
    pendingConfirmationId.value = null;
    pendingToolCallId.value = null;
    pendingClarification.value = null;
    resumeAttemptsByConfirmation.clear();
    resumeAttempts.value = 0;
    currentMessages.value = [];
    const { data, error } = await fetchGetConversationDetail(conversationId);
    if (seq !== selectSeq) return;
    if (!error && data) {
      currentMessages.value = data.messages;
      reconcilePendingActions(data.pendingActions || []);
      streamHandoffPhase.value = 'persisted';
    } else {
      window.$message?.error($t('page.ai.chat.loadConversationFailed'));
    }
  }

  /** clear current conversation */
  function clearCurrentConversation() {
    activeRunSeq += 1;
    abortController?.abort();
    abortController = null;
    abortResumes();
    stopPolling();
    isStreaming.value = false;
    currentConversationId.value = null;
    currentMessages.value = [];
    streamingText.value = '';
    streamEvents.value = [];
    streamHandoffPhase.value = 'idle';
    activeStreamTraceId.value = null;
    lastDoneAck.value = null;
    pendingConfirmation.value = null;
    pendingActionsById.value = {};
    pendingConfirmationId.value = null;
    pendingToolCallId.value = null;
    pendingClarification.value = null;
    resumeAttemptsByConfirmation.clear();
    resumeAttempts.value = 0;
  }

  /** delete conversation */
  async function removeConversation(conversationId: string) {
    const { error } = await fetchDeleteConversation(conversationId);
    if (error) return;
    if (currentConversationId.value === conversationId) {
      clearCurrentConversation();
    }
    await loadConversations();
  }

  // ============ Stream event dispatch ============

  /** 处理自定义 SSE 事件（非 Vercel 原生 text-delta） */
  function handleAiStreamEvent(event: Api.Ai.AiStreamEvent) {
    switch (event.type) {
      case 'tool_call_started':
        streamEvents.value.push(event);
        break;
      case 'tool_call_result':
        streamEvents.value.push(event);
        // A completed tool no longer needs confirmation recovery.
        removePendingByToolCallId(event.toolCallId);
        break;
      case 'confirmation_required':
      case 'confirmation_resumed':
        // The active drawer shows one confirmation; a resumed event has the same ownership semantics.
        // pendingConfirmation 是 ConfirmationRequiredEvent | ConfirmationResumedEvent 的联合类型，
        // 两者结构同形（后者多一个必填 resumedAt），联合分支按 event.type 自动窄化。
        upsertPendingConfirmation(event);
        streamEvents.value.push(event);
        break;
      case 'ai_error':
        window.$message?.error(
          localizeErrorCode(
            event.errorCode,
            event.message || $t('page.ai.chat.unknownError'),
            key => $t(key),
            key => $t(key) !== key
          )
        );
        break;
      case 'clarification_required':
        // Clarification is stateless: selecting a candidate retries with its Agent code.
        pendingClarification.value = event;
        break;
      case 'done':
        lastDoneAck.value = event;
        break;
      default:
        // 兜底，不处理未知事件
        break;
    }
  }

  /** 解析单个 SSE payload（Vercel UI Protocol v4 + 自定义事件 / [DONE]） */
  function parseSsePayload(payload: string): boolean {
    // returns true if stream should end ([DONE] / done event)
    if (payload === '[DONE]') return true;

    // 所有 v4 事件 + 自定义事件都是 JSON
    if (!payload.startsWith('{')) return false;

    let event: any;
    try {
      event = JSON.parse(payload);
    } catch {
      return false;
    }
    if (!event || typeof event.type !== 'string') return false;

    // Vercel UI Protocol v4: text-delta / reasoning-delta
    if (event.type === 'text-delta' && typeof event.delta === 'string') {
      streamingText.value += event.delta;
      return false;
    }
    if (event.type === 'reasoning-delta' && typeof event.delta === 'string') {
      reasoningText.value += event.delta;
      return false;
    }

    // The custom done event terminates the stream; other application events are dispatched above.
    if (event.type === 'done') {
      handleAiStreamEvent(event as Api.Ai.DoneEvent);
      return true;
    }
    if (
      event.type === 'tool_call_started' ||
      event.type === 'tool_call_result' ||
      event.type === 'confirmation_required' ||
      event.type === 'confirmation_resumed' ||
      event.type === 'clarification_required' ||
      event.type === 'ai_error'
    ) {
      handleAiStreamEvent(event as Api.Ai.AiStreamEvent);
      return false;
    }

    // Vercel UI Protocol v4 标准 error 事件（PydanticAI VercelAIAdapter 把
    // UsageLimitExceeded 等异常内部 catch 后转成 ErrorChunk emit）
    if (event.type === 'error' && typeof event.errorText === 'string') {
      const isUsageLimit = event.errorText.includes('request_limit') || event.errorText.includes('tool_calls_limit');
      window.$message?.error(
        isUsageLimit ? $t('page.ai.chat.usageLimitExceeded') : $t('page.ai.chat.aiError', { message: event.errorText })
      );
      return false;
    }

    // 其它 v4 流程控制（start / start-step / text-start / text-end /
    // reasoning-start / reasoning-end / finish-step / finish / error / ...）忽略
    return false;
  }

  /** core SSE streaming — does NOT touch messages array */
  async function doStream(injectLastMessageText?: string) {
    const traceId = createChatTraceId();
    const runSeq = ++activeRunSeq;
    const runConversationId = currentConversationId.value;
    if (!runConversationId) return;
    const isActiveRun = () => runSeq === activeRunSeq && currentConversationId.value === runConversationId;
    activeStreamTraceId.value = traceId;
    lastDoneAck.value = null;
    streamHandoffPhase.value = 'streaming';
    isStreaming.value = true;
    streamingText.value = '';
    reasoningText.value = '';
    streamEvents.value = [];
    focusPendingConfirmation();
    // A new stream invalidates clarification candidates from the previous run.
    pendingClarification.value = null;
    // 新流开始：清空续传重试计数（旧失败不应阻塞新对话的续传）
    resumeAttemptsByConfirmation.clear();
    resumeAttempts.value = 0;
    abortController = new AbortController();
    let streamCompleted = false;

    try {
      const baseUrl = getBaseUrl();
      const token = localStg.get('token');
      const response = await fetch(`${baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          action: 'send',
          traceId,
          trigger: 'submit-message',
          id: `chat-${Date.now()}`,
          messages: currentMessages.value.map((msg, i) => {
            const isLast = i === currentMessages.value.length - 1;
            // 后端 chat.py 在 build_run_input 前 filter 非 image 文件 part（避免 PydanticAI 422），
            // 前端发完整 parts（含 Excel）让后端持久化保留文件元数据用于 UI chip 渲染
            if (isLast && injectLastMessageText && msg.role === 'user') {
              // 注入文本给 LLM（含 file_id），同时保留所有非 text parts（含 Excel/image）
              // 让后端持久化保留文件元数据；后端 chat.py 在 build_run_input 前 filter 非 image
              const otherParts = msg.parts?.filter(p => p.type !== 'text') || [];
              return {
                id: `msg-history-${i}`,
                role: msg.role,
                parts: [{ type: 'text', text: injectLastMessageText }, ...otherParts]
              };
            }
            return {
              id: `msg-history-${i}`,
              role: msg.role,
              parts: msg.parts && msg.parts.length > 0 ? msg.parts : [{ type: 'text', text: msg.content }]
            };
          }),
          // Persist the user's original display text; file IDs remain transport-only prompt context.
          displayContent: injectLastMessageText
            ? currentMessages.value[currentMessages.value.length - 1]?.content
            : undefined,
          conversationId: currentConversationId.value,
          modelId: selectedModelId.value || undefined,
          agentCode: selectedAgentCode.value || undefined
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        window.$message?.error($t('page.ai.chat.requestFailed', { status: response.status }));
        streamHandoffPhase.value = 'stale';
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        streamHandoffPhase.value = 'stale';
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!isActiveRun()) break;
          const lines = part.split('\n');
          let payload = '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              payload = trimmed.slice(6);
            }
          }
          if (!payload) continue;
          const shouldEnd = parseSsePayload(payload);
          if (shouldEnd) break;
        }
      }

      streamCompleted = true;
      const terminalAck = lastDoneAck.value as Api.Ai.DoneEvent | null;
      if (terminalAck?.persistence === 'failed') {
        window.$message?.warning($t('page.ai.chat.responseNotPersisted'));
      }
    } catch (error: any) {
      if (!isActiveRun()) {
        return;
      }
      if (error.name === 'AbortError') {
        // User-stopped partial output stays as a local message owner.
        const cards = streamToolCards();
        freezeTempAssistantProjection(traceId, runConversationId, streamingText.value, cards);
        streamEvents.value = [];
        streamHandoffPhase.value = 'persisted';
      } else {
        const runPending = Object.values(pendingActionsById.value).find(item => item.traceId === traceId);
        if (runPending && getResumeAttempts(runPending.confirmationId) < 3) {
          // Recover a pending confirmation after an unexpected network disconnect.
          streamHandoffPhase.value = 'awaiting_sync';
          await attemptResume(runPending.confirmationId);
          const cards = streamToolCards();
          freezeTempAssistantProjection(traceId, runConversationId, streamingText.value, cards);
          const stillPending = Object.values(pendingActionsById.value).some(item => item.traceId === traceId);
          if (
            !(await syncStreamProjection(
              traceId,
              cards.map(card => card.started.toolCallId),
              null,
              stillPending
            ))
          ) {
            streamHandoffPhase.value = 'stale';
          }
        } else {
          window.$message?.error($t('page.ai.chat.sendFailed', { message: error.message }));
          streamHandoffPhase.value = 'stale';
        }
      }
    } finally {
      if (isActiveRun()) {
        isStreaming.value = false;
        reasoningText.value = '';
        abortController = null;

        // Freeze one temp message owner before detail reconciliation. streamEvents
        // remains an invisible recovery buffer until the durable message takes over.
        if (streamCompleted && currentConversationId.value) {
          const cards = streamToolCards();
          freezeTempAssistantProjection(traceId, runConversationId, streamingText.value, cards);
          streamHandoffPhase.value = 'awaiting_sync';
          const expectedToolCallIds = cards.map(card => card.started.toolCallId);
          const synced = await syncStreamProjection(traceId, expectedToolCallIds, lastDoneAck.value);
          if (!synced) {
            window.$message?.warning($t('page.ai.chat.responseSyncPending'));
          }
        }
        streamingText.value = '';
      }
    }
  }

  // ============ Human confirmation approval and rejection ============

  /**
   * Resume a confirmation whose event stream disconnected while waiting for the user.
   * - GET /ai/chat/resume（Last-Event-ID 回传）
   * - 409（并发冲突）：2s 后串行重试（仍受 resumeAttempts < 3 上限）
   * - 410（已处理）：fallback 轮询 operation-log 拉取结果
   * - 422（临近超时）：提示用户重新发起
   * - 其它 !ok：直接报错
   */
  async function attemptResume(confirmationId: string) {
    const pending = findPendingByConfirmationId(confirmationId);
    const resumeConversationId = currentConversationId.value;
    const resumeRunSeq = activeRunSeq;
    const isActiveResume = () => currentConversationId.value === resumeConversationId && activeRunSeq === resumeRunSeq;
    activeResumeIds.add(confirmationId);
    isStreaming.value = true;
    // AbortController 让 catch/finally 主动断开 SSE，后端 finally 块立即跑
    // 释放 owner 锁（避免 60s TTL 残留导致下次 409 IN_PROGRESS）
    const resumeAbort = new AbortController();
    resumeControllers.get(confirmationId)?.abort();
    resumeControllers.set(confirmationId, resumeAbort);
    try {
      const baseUrl = getBaseUrl();
      const token = localStg.get('token');
      let response: Response;
      while (true) {
        const attempts = getResumeAttempts(confirmationId);
        if (attempts >= 3) {
          if (isActiveResume()) window.$message?.error($t('page.ai.chat.resumeFailedAfterRetries'));
          return;
        }
        setResumeAttempts(confirmationId, attempts + 1);
        response = await fetch(`${baseUrl}/ai/chat/resume?_t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: resumeAbort.signal,
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            // 强制用入参 confirmationId（doStream catch 自动调时传入）。cache-buster
            // ?_t 防 vite proxy 缓存 SSE 错误响应（410/409）。
            'Last-Event-ID': confirmationId,
            Accept: 'text/event-stream'
          }
        });
        if (!isActiveResume()) return;
        if (response.status !== 409) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!isActiveResume()) return;
      }
      if (response.status === 410) {
        // 确认窗口已被处理（approved/rejected/expired），fallback 轮询结果
        if (pending) {
          window.$message?.info($t('page.ai.chat.actionHandledLoadingResult'));
          startPollingResult(pending.toolCallId, pending);
        } else {
          window.$message?.warning($t('page.ai.chat.confirmationExpiredOrHandled'));
        }
        return;
      }
      if (response.status === 422) {
        window.$message?.warning($t('page.ai.chat.confirmationNearExpiry'));
        await refreshCurrentConversationDetail();
        const current = findPendingByConfirmationId(confirmationId);
        if (current) scheduleResumeExpiryReconciliation(current);
        return;
      }
      if (response.status === 404) {
        window.$message?.info($t('page.ai.chat.confirmationExpired'));
        await refreshCurrentConversationDetail();
        return;
      }
      if (!response.ok) {
        window.$message?.error($t('page.ai.chat.resumeFailed', { message: response.status }));
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!isActiveResume()) break;
          const lines = part.split('\n');
          let payload = '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) payload = trimmed.slice(6);
          }
          if (!payload) continue;
          if (isActiveResume()) parseSsePayload(payload);
        }
      }
    } catch (error: any) {
      if (isActiveResume() && error.name !== 'AbortError') {
        window.$message?.error($t('page.ai.chat.resumeFailed', { message: error.message }));
      }
    } finally {
      // 主动 abort 让服务端 finally 块立即跑释放 owner 锁
      try {
        resumeAbort.abort();
      } catch {
        // 已 abort 静默
      }
      const ownsResume = resumeControllers.get(confirmationId) === resumeAbort;
      if (ownsResume) {
        resumeControllers.delete(confirmationId);
        activeResumeIds.delete(confirmationId);
      }
      if (ownsResume && isActiveResume()) isStreaming.value = activeResumeIds.size > 0;
    }
  }

  /** 用户在 HITL 抽屉点确认 / 取消，调 /ai/confirm 后启动 30s 轮询兜底 */
  async function resolveConfirmation(action: 'approve' | 'reject', actionId?: string) {
    const confirmation = actionId ? pendingActionsById.value[actionId] : pendingConfirmation.value;
    if (!confirmation) return;

    try {
      const { data, error } = await fetchAiConfirm({
        confirmationId: confirmation.confirmationId,
        action
      });
      if (error || !data) {
        window.$message?.error($t('page.ai.chat.confirmationFailed'));
        await refreshCurrentConversationDetail();
        return;
      }
      const terminalStatuses = ['succeeded', 'failed', 'rejected', 'expired'];
      if (terminalStatuses.includes(data.status)) {
        if (!(await syncConfirmationTerminal(confirmation))) {
          window.$message?.warning($t('page.ai.chat.operationCardSyncPending'));
        }
        if (data.status === 'succeeded') window.$message?.success($t('page.ai.chat.operationSucceeded'));
        else if (data.status === 'rejected') window.$message?.info($t('page.ai.chat.operationCancelled'));
        else if (data.status === 'expired') window.$message?.warning($t('page.ai.chat.operationExpired'));
        else window.$message?.error($t('page.ai.chat.operationFailed'));
        return;
      }
      if (!data.actionId) removePendingByToolCallId(data.toolCallId);
      startPollingResult(data.toolCallId, confirmation);
    } catch (e: any) {
      window.$message?.error($t('page.ai.chat.confirmationFailedWithMessage', { message: e.message }));
    }
  }

  /** 用户点确认 */
  async function approveTool(actionId?: string) {
    await resolveConfirmation('approve', actionId);
  }

  /** 用户点取消 */
  async function rejectTool(actionId?: string) {
    await resolveConfirmation('reject', actionId);
  }

  /** Confirmation fallback: poll operation status for up to 30 seconds.
   * 终态（success/failed/rejected/expired）停止轮询；
   * 30s 内无结果提示"操作仍在执行" */
  function startPollingResult(
    toolCallId: string,
    confirmation?: Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent
  ) {
    stopPolling(toolCallId);
    const deadline = Date.now() + 30_000;
    const pollConversationId = currentConversationId.value;
    const pollRunSeq = activeRunSeq;
    const owner = Symbol(toolCallId);
    const isActivePoll = () =>
      pollOwners.get(toolCallId) === owner &&
      currentConversationId.value === pollConversationId &&
      activeRunSeq === pollRunSeq;
    pollOwners.set(toolCallId, owner);
    const poll = async () => {
      if (!isActivePoll()) return;
      if (Date.now() > deadline) {
        stopPolling(toolCallId);
        window.$message?.info($t('page.ai.chat.operationStillRunning'));
        return;
      }
      try {
        const { data, error } = await fetchAiOperationLog(toolCallId);
        if (!isActivePoll()) return;
        if (error || !data) return;
        const terminalStatus = ['success', 'failed', 'rejected', 'expired'];
        if (terminalStatus.includes(data.status)) {
          stopPolling(toolCallId);
          // 找到对应 tool_call_started 事件，附加 result 信息
          const started = streamEvents.value.find(
            (e): e is Api.Ai.ToolCallStartedEvent => e.type === 'tool_call_started' && e.toolCallId === toolCallId
          );
          if (started) {
            // 按 status 推导 errorCode：rejected/expired 在 DB 中 errorCode=NULL，
            // 但前端 chat-tool-call.vue 的 errorCodeFriendly map 需要明确 code
            // 才能渲染正确文案（否则 fallback 到「内部错误」）。
            const errorCodeByStatus: Record<string, string> = {
              failed: data.errorCode || 'AI_INTERNAL_ERROR',
              rejected: 'USER_REJECTED',
              expired: 'AI_HITL_EXPIRED'
            };
            const derivedErrorCode = data.status === 'success' ? undefined : errorCodeByStatus[data.status];
            streamEvents.value.push({
              type: 'tool_call_result',
              tool: started.tool,
              toolCallId,
              ok: data.status === 'success',
              durationMs: data.durationMs ?? 0,
              errorCode: derivedErrorCode,
              errorMsg: derivedErrorCode
            });
          }
          if (confirmation) {
            if (!(await syncConfirmationTerminal(confirmation))) {
              window.$message?.warning($t('page.ai.chat.operationCardSyncPending'));
            }
          } else {
            removePendingByToolCallId(toolCallId);
            await refreshCurrentConversationDetail();
          }
          if (data.status === 'success') {
            window.$message?.success($t('page.ai.chat.operationSucceeded'));
          } else if (data.status === 'failed') {
            window.$message?.error(
              $t('page.ai.chat.operationFailedWithCode', { code: data.errorCode || $t('page.ai.chat.unknownError') })
            );
          } else if (data.status === 'rejected') {
            window.$message?.info($t('page.ai.chat.operationCancelled'));
          } else if (data.status === 'expired') {
            window.$message?.warning($t('page.ai.chat.operationExpired'));
          }
        }
      } catch {
        // 网络错误静默，下次重试
      } finally {
        if (pollOwners.get(toolCallId) === owner) {
          pollTimers.set(
            toolCallId,
            setTimeout(() => void poll(), 1500)
          );
        }
      }
    };
    pollTimers.set(
      toolCallId,
      setTimeout(() => void poll(), 1500)
    );
  }

  function stopPolling(toolCallId?: string) {
    if (toolCallId) {
      const timer = pollTimers.get(toolCallId);
      if (timer) clearTimeout(timer);
      pollTimers.delete(toolCallId);
      pollOwners.delete(toolCallId);
      return;
    }
    for (const timer of pollTimers.values()) clearTimeout(timer);
    pollTimers.clear();
    pollOwners.clear();
  }

  /** send a new user message + stream response */
  async function sendMessage(content: string) {
    if (streamHandoffPhase.value === 'awaiting_sync' || streamHandoffPhase.value === 'stale') {
      await syncStreamProjection();
    }
    if (Object.keys(pendingActionsById.value).length > 0) {
      window.$message?.warning($t('page.ai.chat.pendingActionFirst'));
      return;
    }
    if (streamHandoffPhase.value === 'awaiting_sync' || streamHandoffPhase.value === 'stale') {
      window.$message?.warning($t('page.ai.chat.previousResponseSyncPending'));
      return;
    }
    if (
      (!content.trim() && attachedImages.value.length === 0 && attachedFiles.value.length === 0) ||
      isStreaming.value
    ) {
      return;
    }

    // Append spreadsheet and CSV file IDs to the outgoing prompt.
    // LLM 看到 file_id 后自动调 file.parse tool，UX 同 OpenAI/Claude 附件 chip
    // 注意：注入文本仅用于发送 LLM，UI 显示保持原始 content（见 doStream injectLastMessageText）
    let injectText: string | undefined;
    if (attachedFiles.value.length > 0) {
      const fileLines = attachedFiles.value
        .map(f => `[附件] ${f.fileName} (file_id=${f.fileId}, mime=${f.mimeType})`)
        .join('\n');
      injectText = `${content}\n\n${fileLines}`.trim();
    }

    // build parts — UI 用原始 content（不含注入文本）
    const parts: Api.Ai.MessagePart[] = [];
    if (content.trim()) {
      parts.push({ type: 'text', text: content });
    }
    for (const img of attachedImages.value) {
      parts.push({ type: 'file', url: img.fileUrl, mediaType: img.mediaType });
    }
    // attachedFiles（Excel/CSV）也注入 parts，让 chat-message 渲染文件 chip
    // url 用空串（非 image 文件无预览 URL，chip 只展示 fileName + fileSize）
    for (const f of attachedFiles.value) {
      parts.push({ type: 'file', url: '', mediaType: f.mimeType, filename: f.fileName, fileSize: f.fileSize });
    }

    // add user message locally
    currentMessages.value.push({
      messageId: `temp-${Date.now()}`,
      conversationId: currentConversationId.value || '',
      parentMessageId: null,
      role: 'user',
      messageType: 'text',
      content,
      parts: parts.length > 0 ? parts : null,
      tokensInput: null,
      tokensOutput: null,
      createTime: new Date().toISOString()
    });

    attachedImages.value = [];
    attachedFiles.value = [];
    await doStream(injectText);
  }

  /** stop current streaming */
  function stopStreaming() {
    if (abortController) {
      abortController.abort();
    }
  }

  /** add attached image */
  function addImage(fileUrl: string, mediaType: string, fileName: string) {
    attachedImages.value.push({ fileUrl, mediaType, fileName });
  }

  /** remove attached image by index */
  function removeImage(index: number) {
    attachedImages.value.splice(index, 1);
  }

  /** clear all attached images */
  function clearImages() {
    attachedImages.value = [];
  }

  /** add a spreadsheet or CSV attachment */
  function addFile(fileId: string, fileName: string, mimeType: string, fileSize: number) {
    attachedFiles.value.push({ fileId, fileName, mimeType, fileSize });
  }

  /** remove attached file by index */
  function removeFile(index: number) {
    attachedFiles.value.splice(index, 1);
  }

  /** clear all attached files */
  function clearFiles() {
    attachedFiles.value = [];
  }

  /** Safety Gate: regenerate is disabled until the server owns revision semantics. */
  async function regenerate(): Promise<boolean> {
    return false;
  }

  /** Safety Gate: edit is disabled until the server owns revision semantics. */
  async function editAndResend(_messageIndex: number, _newContent: string): Promise<boolean> {
    return false;
  }

  /** load available models from enabled providers */
  async function loadModels() {
    try {
      const { data, error } = await fetchGetAvailableModels();
      if (!error && data) {
        availableModels.value = data;
        // auto select first if none selected
        if (!selectedModelId.value && data.length > 0) {
          selectedModelId.value = data[0].modelId;
        }
      }
    } catch {
      // silent fail
    }
  }

  /** load Agents available to the current user and default to automatic routing */
  async function loadAgents() {
    try {
      const { data, error } = await fetchAiAgents();
      if (!error && data) {
        availableAgents.value = data;
        // The backend falls back to its default Agent when automatic routing is disabled.
        if (!selectedAgentCode.value) {
          selectedAgentCode.value = 'auto';
        }
      }
    } catch {
      // silent fail
    }
  }

  /**
   * Select an Agent candidate and retry the last user message.
   * Reusing the locally appended message avoids asking the user to enter the same prompt again.
   */
  async function pickClarificationAgent(code: string) {
    selectedAgentCode.value = code;
    pendingClarification.value = null;
    if (currentMessages.value.length > 0) {
      await doStream();
    }
  }

  /** 用户关闭 clarification 卡片（不选，保留原 agentCode） */
  function dismissClarification() {
    pendingClarification.value = null;
  }

  /** submit feedback about the Agent selected for a message */
  async function submitRoutingFeedback(messageId: string, payload: Api.Ai.RoutingFeedbackRequest): Promise<boolean> {
    try {
      const { error } = await fetchRoutingFeedback(messageId, payload);
      if (error) {
        window.$message?.error($t('page.ai.chat.feedbackSubmitFailed', { message: error.message }));
        return false;
      }
      window.$message?.success($t('page.ai.chat.feedbackSubmitted'));
      return true;
    } catch (e: any) {
      window.$message?.error($t('page.ai.chat.feedbackSubmitFailed', { message: e.message }));
      return false;
    }
  }

  /** initialize */
  async function init() {
    await Promise.all([loadConversations(), loadModels(), loadAgents()]);
  }

  return {
    conversations,
    currentConversationId,
    currentMessages,
    streamingText,
    reasoningText,
    isStreaming,
    loading,
    availableModels,
    selectedModelId,
    availableAgents,
    selectedAgentCode,
    hasMoreConversations,
    attachedImages,
    attachedFiles,
    // Stream events and human confirmation
    streamEvents,
    streamHandoffPhase,
    activeStreamTraceId,
    lastDoneAck,
    pendingConfirmation,
    pendingActionsById,
    pendingConfirmationId,
    pendingToolCallId,
    resumeAttempts,
    messageToolCards,
    streamToolCards,
    pendingToolCardsAfterMessage,
    syncStreamProjection,
    // Agent routing clarification
    pendingClarification,
    pickClarificationAgent,
    dismissClarification,
    submitRoutingFeedback,
    attemptResume,
    loadConversations,
    loadMoreConversations,
    selectConversation,
    clearCurrentConversation,
    removeConversation,
    sendMessage,
    stopStreaming,
    regenerate,
    editAndResend,
    addImage,
    removeImage,
    clearImages,
    addFile,
    removeFile,
    clearFiles,
    approveTool,
    rejectTool,
    init
  };
});
