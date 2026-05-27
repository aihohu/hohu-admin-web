<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAiStore } from '@/store/modules/ai';
import { fetchSaveConversation } from '@/service/api';
import ChatMessage from './chat-message.vue';
import ChatInput from './chat-input.vue';

const { t } = useI18n();
const aiStore = useAiStore();
const messageListRef = ref<HTMLElement>();
const inputText = ref('');
const isUserAtBottom = ref(true);
const showScrollBtn = ref(false);

const SCROLL_THRESHOLD = 120; // px from bottom to consider "at bottom"

// 监听滚动位置
function handleScroll() {
  const el = messageListRef.value;
  if (!el) return;
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  isUserAtBottom.value = distanceFromBottom < SCROLL_THRESHOLD;
  showScrollBtn.value = distanceFromBottom > SCROLL_THRESHOLD;
}

// 消息变化：用户在底部时才自动滚动
watch(
  () => aiStore.currentMessages.length,
  () => {
    if (isUserAtBottom.value) {
      nextTick(scrollToBottom);
    }
  }
);

// 流式文本：用户在底部时才跟随
watch(
  () => aiStore.streamingText,
  () => {
    if (isUserAtBottom.value) {
      nextTick(scrollToBottom);
    } else {
      showScrollBtn.value = true;
    }
  }
);

function scrollToBottom() {
  const el = messageListRef.value;
  if (el) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    isUserAtBottom.value = true;
    showScrollBtn.value = false;
  }
}

// 最后一条用户消息的 index
const lastUserMessageIndex = computed(() => {
  for (let i = aiStore.currentMessages.length - 1; i >= 0; i--) {
    if (aiStore.currentMessages[i].role === 'user') return i;
  }
  return -1;
});

// 是否是最后一条 assistant 消息
const isLastAssistant = (idx: number) => {
  for (let i = aiStore.currentMessages.length - 1; i >= 0; i--) {
    if (aiStore.currentMessages[i].role === 'assistant') return i === idx;
  }
  return false;
};

const hasConversation = computed(() => !!aiStore.currentConversationId);

async function handleSend() {
  const text = inputText.value.trim();
  if (!text) return;

  // 没有会话时自动创建
  if (!hasConversation.value) {
    const { data, error } = await fetchSaveConversation({
      title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
      modelName: aiStore.selectedModelId || undefined
    });
    if (error || !data) return;
    await aiStore.loadConversations();
    await aiStore.selectConversation(data.conversationId);
  }

  inputText.value = '';
  await aiStore.sendMessage(text);
}

async function handleEdit(index: number, newContent: string) {
  await aiStore.editAndResend(index, newContent);
}

const quickActions = [
  {
    icon: 'icon-ic-round-code',
    label: computed(() => t('page.ai.chat.quickCode')),
    prompt: computed(() => t('page.ai.chat.quickCodePrompt'))
  },
  {
    icon: 'icon-ic-round-translate',
    label: computed(() => t('page.ai.chat.quickTranslate')),
    prompt: computed(() => t('page.ai.chat.quickTranslatePrompt'))
  },
  {
    icon: 'icon-ic-round-lightbulb',
    label: computed(() => t('page.ai.chat.quickAnalyze')),
    prompt: computed(() => t('page.ai.chat.quickAnalyzePrompt'))
  },
  {
    icon: 'icon-ic-round-description',
    label: computed(() => t('page.ai.chat.quickArticle')),
    prompt: computed(() => t('page.ai.chat.quickArticlePrompt'))
  }
];
</script>

<template>
  <div class="chat-main h-full flex flex-col">
    <!-- Empty state: welcome + input -->
    <template v-if="!hasConversation">
      <div class="flex-1 flex flex-col items-center justify-center px-24px">
        <div class="welcome-icon">
          <icon-ic-round-smart-toy class="text-36px" />
        </div>
        <h2 class="welcome-title">{{ t('page.ai.chat.welcomeTitle') }}</h2>
        <p class="welcome-desc">{{ t('page.ai.chat.welcomeDesc') }}</p>

        <!-- Quick actions -->
        <div class="quick-actions">
          <button
            v-for="action in quickActions"
            :key="action.label.value"
            class="quick-action-card"
            @click="inputText = action.prompt.value"
          >
            <component :is="action.icon" class="text-18px" />
            <span>{{ action.label.value }}</span>
          </button>
        </div>
      </div>

      <!-- Input always visible -->
      <ChatInput
        v-model="inputText"
        :is-streaming="aiStore.isStreaming"
        @send="handleSend"
        @stop="aiStore.stopStreaming()"
      />
    </template>

    <!-- Active conversation -->
    <template v-else>
      <div ref="messageListRef" class="flex-1 overflow-y-auto msg-scroll-area" @scroll="handleScroll">
        <div class="max-w-800px mx-auto px-16px py-16px">
          <ChatMessage
            v-for="(msg, idx) in aiStore.currentMessages"
            :key="msg.messageId"
            :message="msg"
            :index="idx"
            :is-last-user-message="idx === lastUserMessageIndex"
            :is-last-assistant-message="isLastAssistant(idx)"
            @edit="handleEdit"
            @regenerate="aiStore.regenerate()"
          />

          <!-- Streaming message -->
          <ChatMessage
            v-if="aiStore.isStreaming && aiStore.streamingText"
            :message="{
              messageId: 'streaming',
              conversationId: '',
              parentMessageId: null,
              role: 'assistant',
              messageType: 'text',
              content: aiStore.streamingText,
              tokensInput: null,
              tokensOutput: null,
              createTime: new Date().toISOString()
            }"
            :index="-1"
            :is-last-user-message="false"
            :is-last-assistant-message="false"
          />

          <!-- Thinking indicator -->
          <div v-if="aiStore.isStreaming && !aiStore.streamingText" class="msg-row msg-row--assistant">
            <div class="msg-avatar msg-avatar--ai">
              <icon-ic-round-smart-toy class="text-18px" />
            </div>
            <div class="msg-bubble msg-bubble--ai flex items-center gap-8px">
              <NSpin size="small" />
              <span class="text-13px text-[var(--n-text-color-3)]">{{ t('page.ai.chat.thinking') }}</span>
            </div>
          </div>
        </div>
      </div>

      <ChatInput
        v-model="inputText"
        :is-streaming="aiStore.isStreaming"
        @send="handleSend"
        @stop="aiStore.stopStreaming()"
      />
    </template>

    <!-- Scroll to bottom FAB -->
    <Transition name="fab-fade">
      <button v-if="showScrollBtn" class="scroll-bottom-fab" @click="scrollToBottom">
        <icon-ic-round-arrow-downward class="text-20px" />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* Welcome */
.welcome-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4d6bfe, #10b981);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 16px;
}

.welcome-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--n-text-color, #333);
  margin: 0 0 8px 0;
}

.welcome-desc {
  font-size: 14px;
  color: var(--n-text-color-3, #999);
  margin: 0 0 32px 0;
  text-align: center;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 460px;
  width: 100%;
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid var(--n-border-color, #e5e5e5);
  background: transparent;
  color: var(--n-text-color, #333);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.quick-action-card:hover {
  background: rgba(77, 107, 254, 0.06);
  border-color: #4d6bfe;
  color: #4d6bfe;
}

/* Message area */
.msg-row {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  margin-bottom: 8px;
}

.msg-row--assistant {
  flex-direction: row;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
}

.msg-avatar--ai {
  background: #10b981;
}

.msg-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.msg-bubble--ai {
  background: rgba(119, 119, 119, 0.1);
  color: var(--n-text-color-1, var(--n-text-color, #333));
  border-top-left-radius: 4px;
}

/* Scroll to bottom FAB */
.msg-scroll-area {
  position: relative;
}

.scroll-bottom-fab {
  position: absolute;
  bottom: 80px;
  right: 32px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--n-border-color, #e0e0e0);
  background: var(--n-color, #fff);
  color: var(--n-text-color-2, #666);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  z-index: 10;
}

.scroll-bottom-fab:hover {
  border-color: #4d6bfe;
  color: #4d6bfe;
  box-shadow: 0 2px 12px rgba(77, 107, 254, 0.2);
}

/* FAB transition */
.fab-fade-enter-active,
.fab-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
