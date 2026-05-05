import { defineStore } from 'pinia';
import { ref } from 'vue';
import { SetupStoreId } from '@/enum';
import { localStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { fetchGetConversationList, fetchGetConversationDetail, fetchDeleteConversation } from '@/service/api';
import { request } from '@/service/request';

export interface AiModelOption {
  providerId: string;
  providerCode: string;
  providerName: string;
  model: string;
  modelId: string;
}

export const useAiStore = defineStore(SetupStoreId.Ai, () => {
  const conversations = ref<Api.Ai.Conversation[]>([]);
  const currentConversationId = ref<string | null>(null);
  const currentMessages = ref<Api.Ai.Message[]>([]);
  const streamingText = ref('');
  const isStreaming = ref(false);
  const loading = ref(false);
  const availableModels = ref<AiModelOption[]>([]);
  const selectedModelId = ref<string>('');
  let abortController: AbortController | null = null;

  /** get base URL for SSE fetch */
  function getBaseUrl(): string {
    const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
    const { baseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);
    return baseURL;
  }

  /** load conversation list */
  async function loadConversations() {
    loading.value = true;
    try {
      const { data, error } = await fetchGetConversationList({ current: 1, size: 50, status: null, title: null });
      if (!error && data) {
        conversations.value = data.records;
      }
    } finally {
      loading.value = false;
    }
  }

  /** select conversation and load messages */
  async function selectConversation(conversationId: string) {
    currentConversationId.value = conversationId;
    streamingText.value = '';
    const { data, error } = await fetchGetConversationDetail(conversationId);
    if (!error && data) {
      currentMessages.value = data.messages;
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
            parts: [{ type: 'text', text: msg.content }]
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
          tokensInput: null,
          tokensOutput: null,
          createTime: new Date().toISOString()
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // save partial response
        if (streamingText.value) {
          currentMessages.value.push({
            messageId: `temp-assistant-${Date.now()}`,
            conversationId: currentConversationId.value || '',
            parentMessageId: null,
            role: 'assistant',
            messageType: 'text',
            content: streamingText.value,
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
    }
  }

  /** send a new user message + stream response */
  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming.value) return;

    // add user message locally
    currentMessages.value.push({
      messageId: `temp-${Date.now()}`,
      conversationId: currentConversationId.value || '',
      parentMessageId: null,
      role: 'user',
      messageType: 'text',
      content,
      tokensInput: null,
      tokensOutput: null,
      createTime: new Date().toISOString()
    });

    await doStream();
  }

  /** stop current streaming */
  function stopStreaming() {
    if (abortController) {
      abortController.abort();
    }
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

    // send the edited message
    await sendMessage(newContent);
  }

  /** load available models from enabled providers */
  async function loadModels() {
    try {
      const { data, error } = await request<AiModelOption[]>({
        url: '/ai/provider/models',
        method: 'get'
      });
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
    loadConversations,
    selectConversation,
    clearCurrentConversation,
    removeConversation,
    sendMessage,
    stopStreaming,
    regenerate,
    editAndResend,
    init
  };
});
