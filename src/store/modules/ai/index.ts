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

  // v1.5+: agent 切换器
  const availableAgents = ref<Api.Ai.Agent[]>([]);
  const selectedAgentCode = ref<string>('');

  // ====== Phase 3.4: SSE 5 类事件 + HITL（spec §8.1 / §8.3） ======
  /** 当前流的 tool 调用事件列表（tool_call_started + tool_call_result，按 toolCallId 配对） */
  const streamEvents = ref<Api.Ai.AiStreamEvent[]>([]);
  /** 当前挂起的 HITL 确认（一次只允许一个） */
  const pendingConfirmation = ref<Api.Ai.ConfirmationRequiredEvent | null>(null);
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
    currentMessages.value = [];
    const { data, error } = await fetchGetConversationDetail(conversationId);
    if (seq !== selectSeq) return;
    if (!error && data) {
      currentMessages.value = data.messages;
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
      case 'tool_call_result':
        streamEvents.value.push(event);
        break;
      case 'confirmation_required':
        // spec §8.3: 一次只允许一个挂起 HITL
        pendingConfirmation.value = event;
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
  async function doStream() {
    isStreaming.value = true;
    streamingText.value = '';
    reasoningText.value = '';
    streamEvents.value = [];
    pendingConfirmation.value = null;
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
          messages: currentMessages.value.map((msg, i) => ({
            id: `msg-history-${i}`,
            role: msg.role,
            parts: msg.parts && msg.parts.length > 0 ? msg.parts : [{ type: 'text', text: msg.content }]
          })),
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
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          const payload = line.slice(6);
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
            // 推一个合成的 tool_call_result 事件让 UI 更新
            streamEvents.value.push({
              type: 'tool_call_result',
              tool: started.tool,
              toolCallId,
              ok: data.status === 'success',
              durationMs: data.durationMs ?? 0,
              errorCode: data.errorCode || undefined,
              errorMsg: data.errorCode || undefined
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
    if ((!content.trim() && attachedImages.value.length === 0) || isStreaming.value) return;

    // build parts
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
    await doStream();
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

    // clear attached images since editing replaces the message
    attachedImages.value = [];

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
    // Phase 3.4: SSE 事件 + HITL
    streamEvents,
    pendingConfirmation,
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
    approveTool,
    rejectTool,
    init
  };
});
