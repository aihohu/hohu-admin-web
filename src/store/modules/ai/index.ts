import { defineStore } from 'pinia';
import { ref } from 'vue';
import { SetupStoreId } from '@/enum';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { fetchGetConversationList, fetchGetConversationDetail, fetchDeleteConversation } from '@/service/api';
import { fetchAiAgents, fetchAiConfirm, fetchAiOperationLog, fetchGetAvailableModels } from '@/service/api/ai';

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

  // v1.5+ SR-25: chat 直接上传的文件（Excel/CSV），发送时把 file_id 注入到消息末尾
  const attachedFiles = ref<Api.Ai.AttachedFile[]>([]);

  // v1.5+: agent 切换器
  const availableAgents = ref<Api.Ai.Agent[]>([]);
  const selectedAgentCode = ref<string>('');

  // ====== Phase 3.4: SSE 5 类事件 + HITL（spec §8.1 / §8.3） ======
  /** 当前流的 tool 调用事件列表（tool_call_started + tool_call_result，按 toolCallId 配对） */
  const streamEvents = ref<Api.Ai.AiStreamEvent[]>([]);
  /** 当前挂起的 HITL 确认（一次只允许一个；续传时为 ConfirmationResumedEvent） */
  const pendingConfirmation = ref<Api.Ai.ConfirmationRequiredEvent | Api.Ai.ConfirmationResumedEvent | null>(null);
  /** §8.3 续传：当前挂起确认的 ID（attemptResume 入参 + tool_call_result 清理依据） */
  const pendingConfirmationId = ref<string | null>(null);
  /** §8.3 续传：当前挂起确认对应的 toolCallId（410 时 fallback 轮询用） */
  const pendingToolCallId = ref<string | null>(null);
  /** §8.3 续传：已尝试次数（上限 3 次） */
  const resumeAttempts = ref(0);
  /** confirm 后 30s 轮询的定时器（spec §8.3 SSE 断流兜底） */
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  let abortController: AbortController | null = null;
  let selectSeq = 0;

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
    const seq = ++selectSeq;
    currentConversationId.value = conversationId;
    streamingText.value = '';
    streamEvents.value = [];
    pendingConfirmation.value = null;
    pendingConfirmationId.value = null;
    pendingToolCallId.value = null;
    resumeAttempts.value = 0;
    currentMessages.value = [];
    const { data, error } = await fetchGetConversationDetail(conversationId);
    if (seq !== selectSeq) return;
    if (!error && data) {
      currentMessages.value = data.messages;
      // 修订 BUG-FE-18: 反序列化 assistant message.tool_calls JSON 注入 streamEvents，
      // 让重连会话时能看到 tool-call 卡片（之前 reload 后只剩文字）
      const restoredEvents: Api.Ai.AiStreamEvent[] = [];
      for (const msg of data.messages) {
        if (msg.role !== 'assistant' || !msg.toolCalls) continue;
        for (const tc of msg.toolCalls) {
          if (!tc.tool || !tc.tool_call_id) continue;
          restoredEvents.push({
            type: 'tool_call_started',
            tool: tc.tool,
            toolCallId: tc.tool_call_id,
            summary: tc.summary ?? '',
            args: tc.args ?? {},
            risk: tc.risk ?? 'low',
            traceId: tc.trace_id ?? ''
          });
          restoredEvents.push({
            type: 'tool_call_result',
            tool: tc.tool,
            toolCallId: tc.tool_call_id,
            ok: tc.ok ?? false,
            durationMs: tc.duration_ms ?? 0,
            result: tc.result,
            affectedRows: tc.affected_rows ?? null,
            errorCode: tc.error_code,
            errorMsg: tc.error_msg
          });
        }
      }
      streamEvents.value = restoredEvents;
    } else {
      window.$message?.error('加载会话失败');
    }
  }

  /** clear current conversation */
  function clearCurrentConversation() {
    currentConversationId.value = null;
    currentMessages.value = [];
    streamingText.value = '';
    streamEvents.value = [];
    pendingConfirmation.value = null;
    pendingConfirmationId.value = null;
    pendingToolCallId.value = null;
    resumeAttempts.value = 0;
  }

  /** delete conversation */
  async function removeConversation(conversationId: string) {
    await fetchDeleteConversation(conversationId);
    if (currentConversationId.value === conversationId) {
      clearCurrentConversation();
    }
    await loadConversations();
  }

  // ============ SSE 事件分流（spec §8.1） ============

  /** 处理自定义 SSE 事件（非 Vercel 原生 text-delta） */
  function handleAiStreamEvent(event: Api.Ai.AiStreamEvent) {
    switch (event.type) {
      case 'tool_call_started':
        streamEvents.value.push(event);
        break;
      case 'tool_call_result':
        streamEvents.value.push(event);
        // §8.3 续传：tool 执行完成则无需再续，清掉挂起状态
        if (event.toolCallId === pendingToolCallId.value) {
          pendingConfirmationId.value = null;
          pendingToolCallId.value = null;
        }
        break;
      case 'confirmation_required':
      case 'confirmation_resumed':
        // spec §8.3: 一次只允许一个挂起 HITL（confirmation_resumed 是断流续传回带的）。
        // pendingConfirmation 是 ConfirmationRequiredEvent | ConfirmationResumedEvent 的联合类型，
        // 两者结构同形（后者多一个必填 resumedAt），联合分支按 event.type 自动窄化。
        pendingConfirmation.value = event;
        pendingConfirmationId.value = event.confirmationId;
        pendingToolCallId.value = event.toolCallId;
        streamEvents.value.push(event);
        break;
      case 'ai_error':
        window.$message?.error(`AI 错误: ${event.message || '未知错误'}`);
        break;
      case 'done':
        // 流结束信号（一般由 [DONE] 或 reader.done 处理，这里只清状态）
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

    // 自定义事件（spec §8.1 私有命名空间）：done 终止流，其它走分流
    if (event.type === 'done') return true;
    if (
      event.type === 'tool_call_started' ||
      event.type === 'tool_call_result' ||
      event.type === 'confirmation_required' ||
      event.type === 'confirmation_resumed' ||
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
        isUsageLimit ? 'AI 调用次数超限，可能选错了工具或在循环重试，请换种问法' : `AI 错误: ${event.errorText}`
      );
      return false;
    }

    // 其它 v4 流程控制（start / start-step / text-start / text-end /
    // reasoning-start / reasoning-end / finish-step / finish / error / ...）忽略
    return false;
  }

  /** core SSE streaming — does NOT touch messages array */
  async function doStream(injectLastMessageText?: string) {
    isStreaming.value = true;
    streamingText.value = '';
    reasoningText.value = '';
    streamEvents.value = [];
    pendingConfirmation.value = null;
    // 新流开始：清空续传重试计数（旧失败不应阻塞新对话的续传）
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
          trigger: 'submit-message',
          id: `chat-${Date.now()}`,
          messages: currentMessages.value.map((msg, i) => {
            const isLast = i === currentMessages.value.length - 1;
            // v1.5+ SR-25: attached files 注入 file_id 到最后一条 user 消息末尾，
            // 仅用于发送 LLM，不污染 UI 渲染（UI 用 msg.content / msg.parts 原始值）
            if (isLast && injectLastMessageText && msg.role === 'user') {
              const imgParts = msg.parts?.filter(p => p.type === 'file' && p.mediaType?.startsWith('image/')) || [];
              return {
                id: `msg-history-${i}`,
                role: msg.role,
                parts: [{ type: 'text', text: injectLastMessageText }, ...imgParts]
              };
            }
            return {
              id: `msg-history-${i}`,
              role: msg.role,
              parts: msg.parts && msg.parts.length > 0 ? msg.parts : [{ type: 'text', text: msg.content }]
            };
          }),
          // v1.5+ SR-25: 后端持久化用 displayContent（用户原始输入），
          // LLM 仍看注入版（messages 里含 file_id），UI reload 后显示原始
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
        window.$message?.error(`请求失败: ${response.status}`);
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

      // add assistant message
      if (streamingText.value) {
        currentMessages.value.push({
          messageId: `temp-assistant-${Date.now()}`,
          conversationId: currentConversationId.value || '',
          parentMessageId: null,
          role: 'assistant',
          messageType: 'text',
          content: streamingText.value,
          parts: null,
          tokensInput: null,
          tokensOutput: null,
          createTime: new Date().toISOString()
        });
      }
      streamCompleted = true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // save partial response locally (backend may not have persisted it)
        if (streamingText.value) {
          currentMessages.value.push({
            messageId: `temp-assistant-${Date.now()}`,
            conversationId: currentConversationId.value || '',
            parentMessageId: null,
            role: 'assistant',
            messageType: 'text',
            content: streamingText.value,
            parts: null,
            tokensInput: null,
            tokensOutput: null,
            createTime: new Date().toISOString()
          });
        }
      } else if (pendingConfirmationId.value && resumeAttempts.value < 3) {
        // §8.3 续传：HITL 等待期间网络中断（非用户主动 abort），自动尝试 resume
        attemptResume(pendingConfirmationId.value);
      } else {
        window.$message?.error(`发送失败: ${error.message}`);
      }
    } finally {
      isStreaming.value = false;
      streamingText.value = '';
      reasoningText.value = '';
      // 保留 streamEvents（让用户能看到 tool-call 卡片），下次 sendMessage 时清空
      // pendingConfirmation 不在此清（confirm 流程独立）
      abortController = null;

      // Replace temp messages with real IDs from backend after stream completes normally
      if (streamCompleted && currentConversationId.value) {
        try {
          const { data, error } = await fetchGetConversationDetail(currentConversationId.value);
          if (!error && data) {
            currentMessages.value = data.messages;
          }
        } catch {
          // keep local messages as fallback
        }
      }
    }
  }

  // ============ HITL 确认 / 拒绝（spec §8.3） ============

  /**
   * spec §8.3: HITL 等待期间 SSE 断流时自动续传。
   * - GET /ai/chat/resume（Last-Event-ID 回传）
   * - 409（并发冲突）：2s 后递归重试（仍受 resumeAttempts < 3 上限）
   * - 410（已处理）：fallback 轮询 operation-log 拉取结果
   * - 422（临近超时）：提示用户重新发起
   * - 其它 !ok：直接报错
   */
  async function attemptResume(confirmationId: string) {
    if (resumeAttempts.value >= 3) {
      window.$message?.error('续传失败 3 次，请重新发起对话');
      return;
    }
    resumeAttempts.value += 1;
    isStreaming.value = true;
    // AbortController 让 catch/finally 主动断开 SSE，后端 finally 块立即跑
    // 释放 owner 锁（避免 60s TTL 残留导致下次 409 IN_PROGRESS）
    const resumeAbort = new AbortController();
    try {
      const baseUrl = getBaseUrl();
      const token = localStg.get('token');
      const response = await fetch(`${baseUrl}/ai/chat/resume?_t=${Date.now()}`, {
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
      if (response.status === 409) {
        // 并发冲突，2s 后递归重试
        await new Promise(resolve => setTimeout(resolve, 2000));
        return attemptResume(confirmationId);
      }
      if (response.status === 410) {
        // 确认窗口已被处理（approved/rejected/expired），fallback 轮询结果
        if (pendingToolCallId.value) {
          window.$message?.info('操作已被处理，正在拉取结果...');
          startPollingResult(pendingToolCallId.value);
        } else {
          window.$message?.warning('该确认已过期或已被处理，请重新发起');
        }
        return;
      }
      if (response.status === 422) {
        window.$message?.warning('确认窗口已临近超时，请重新发起');
        return;
      }
      if (response.status === 404) {
        window.$message?.info('该确认已过期，请重新发起');
        return;
      }
      if (!response.ok) {
        window.$message?.error(`续传失败: ${response.status}`);
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
          const lines = part.split('\n');
          let payload = '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) payload = trimmed.slice(6);
          }
          if (!payload) continue;
          parseSsePayload(payload);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        window.$message?.error(`续传失败: ${error.message}`);
      }
    } finally {
      // 主动 abort 让服务端 finally 块立即跑释放 owner 锁
      try {
        resumeAbort.abort();
      } catch {
        // 已 abort 静默
      }
      isStreaming.value = false;
    }
  }

  /** 用户在 HITL 抽屉点确认 / 取消，调 /ai/confirm 后启动 30s 轮询兜底 */
  async function resolveConfirmation(action: 'approved' | 'rejected') {
    const confirmation = pendingConfirmation.value;
    if (!confirmation) return;

    pendingConfirmation.value = null;

    try {
      const { data, error } = await fetchAiConfirm({
        confirmationId: confirmation.confirmationId,
        action
      });
      if (error || !data) {
        window.$message?.error('确认失败');
        return;
      }
      // spec §8.3: confirm 后立刻收到 toolCallId + status=queued，
      // 即使 SSE 已断也能据此轮询结果（30s 兜底）
      startPollingResult(data.toolCallId);
    } catch (e: any) {
      window.$message?.error(`确认失败: ${e.message}`);
    }
  }

  /** 用户点确认 */
  async function approveTool() {
    await resolveConfirmation('approved');
  }

  /** 用户点取消 */
  async function rejectTool() {
    await resolveConfirmation('rejected');
  }

  /** spec §8.3: 30s 轮询 GET /ai/operation-log?tool_call_id=...
   * 终态（success/failed/rejected/expired）停止轮询；
   * 30s 内无结果提示"操作仍在执行" */
  function startPollingResult(toolCallId: string) {
    stopPolling();
    const deadline = Date.now() + 30_000;
    pollTimer = setInterval(async () => {
      if (Date.now() > deadline) {
        stopPolling();
        window.$message?.info('操作仍在执行，请稍后到 AI Trace 查看');
        return;
      }
      try {
        const { data, error } = await fetchAiOperationLog(toolCallId);
        if (error || !data) return;
        const terminalStatus = ['success', 'failed', 'rejected', 'expired'];
        if (terminalStatus.includes(data.status)) {
          stopPolling();
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
          if (data.status === 'success') {
            window.$message?.success('操作已执行成功');
          } else if (data.status === 'failed') {
            window.$message?.error(`操作失败: ${data.errorCode || '未知'}`);
          } else if (data.status === 'rejected') {
            window.$message?.info('操作已取消');
          } else if (data.status === 'expired') {
            window.$message?.warning('操作已超时');
          }
        }
      } catch {
        // 网络错误静默，下次重试
      }
    }, 1500);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /** send a new user message + stream response */
  async function sendMessage(content: string) {
    if (
      (!content.trim() && attachedImages.value.length === 0 && attachedFiles.value.length === 0) ||
      isStreaming.value
    ) {
      return;
    }

    // v1.5+ SR-25: attached files (Excel/CSV) 注入到消息末尾，
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

  /** add attached file (Excel/CSV, spec §16 SR-25) */
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

  /** regenerate: remove last assistant message, re-stream with existing user message */
  async function regenerate() {
    if (isStreaming.value) return;

    const msgs = currentMessages.value;
    // remove last assistant message
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
      msgs.pop();
    }

    // stream directly — user message is already in the array
    await doStream();
  }

  /** edit message: truncate from given index, replace content, resend */
  async function editAndResend(messageIndex: number, newContent: string) {
    if (!newContent.trim() || isStreaming.value) return;

    // truncate messages from this index onward
    currentMessages.value = currentMessages.value.slice(0, messageIndex);

    // clear attached images/files since editing replaces the message
    attachedImages.value = [];
    attachedFiles.value = [];

    // send the edited message (text only, no images)
    const parts: Api.Ai.MessagePart[] = [{ type: 'text', text: newContent }];
    currentMessages.value.push({
      messageId: `temp-${Date.now()}`,
      conversationId: currentConversationId.value || '',
      parentMessageId: null,
      role: 'user',
      messageType: 'text',
      content: newContent,
      parts,
      tokensInput: null,
      tokensOutput: null,
      createTime: new Date().toISOString()
    });

    await doStream();
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

  /** v1.5+: 加载当前用户可用 agent 列表，默认选第一个 */
  async function loadAgents() {
    try {
      const { data, error } = await fetchAiAgents();
      if (!error && data) {
        availableAgents.value = data;
        if (!selectedAgentCode.value && data.length > 0) {
          selectedAgentCode.value = data[0].code;
        }
      }
    } catch {
      // silent fail
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
    // Phase 3.4: SSE 事件 + HITL
    streamEvents,
    pendingConfirmation,
    pendingConfirmationId,
    pendingToolCallId,
    resumeAttempts,
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
