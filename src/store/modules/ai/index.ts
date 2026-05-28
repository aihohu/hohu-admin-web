import { defineStore } from 'pinia';
import { ref } from 'vue';
import { SetupStoreId } from '@/enum';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { fetchGetConversationList, fetchGetConversationDetail, fetchDeleteConversation } from '@/service/api';
import { fetchGetAvailableModels } from '@/service/api/ai';

export const useAiStore = defineStore(SetupStoreId.Ai, () => {
  const conversations = ref<Api.Ai.Conversation[]>([]);
  const currentConversationId = ref<string | null>(null);
  const currentMessages = ref<Api.Ai.Message[]>([]);
  const streamingText = ref('');
  const isStreaming = ref(false);
  const loading = ref(false);
  const availableModels = ref<Api.Ai.AvailableModel[]>([]);
  const selectedModelId = ref<string>('');
  const conversationCurrent = ref(1);
  const conversationSize = 20;
  const hasMoreConversations = ref(true);
  const searchTitle = ref<string | null>(null);
  const attachedImages = ref<{ fileUrl: string; mediaType: string; fileName: string }[]>([]);
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
        size: conversationSize,
        status: null,
        title: searchTitle.value
      });
      if (!error && data) {
        conversations.value = data.records;
        hasMoreConversations.value = data.records.length >= conversationSize;
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
        size: conversationSize,
        status: null,
        title: searchTitle.value
      });
      if (!error && data) {
        conversations.value.push(...data.records);
        hasMoreConversations.value = data.records.length >= conversationSize;
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
  }

  /** delete conversation */
  async function removeConversation(conversationId: string) {
    await fetchDeleteConversation(conversationId);
    if (currentConversationId.value === conversationId) {
      clearCurrentConversation();
    }
    await loadConversations();
  }

  /** core SSE streaming — does NOT touch messages array */
  async function doStream() {
    isStreaming.value = true;
    streamingText.value = '';
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
          modelId: selectedModelId.value || undefined
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
          if (payload === '[DONE]') continue;

          try {
            const event = JSON.parse(payload);
            if (event.type === 'text-delta' && event.delta) {
              streamingText.value += event.delta;
            } else if (event.type === 'error') {
              window.$message?.error(`AI 错误: ${event.errorText || '未知错误'}`);
            }
          } catch {
            // skip malformed
          }
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

  /** initialize */
  async function init() {
    await Promise.all([loadConversations(), loadModels()]);
  }

  return {
    conversations,
    currentConversationId,
    currentMessages,
    streamingText,
    isStreaming,
    loading,
    availableModels,
    selectedModelId,
    hasMoreConversations,
    attachedImages,
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
    init
  };
});
