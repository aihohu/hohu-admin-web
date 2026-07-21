<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import IconIcRoundAccessTime from '~icons/ic/round-access-time';
import IconIcRoundAutoAwesome from '~icons/ic/round-auto-awesome';
import IconIcRoundInsertDriveFile from '~icons/ic/round-insert-drive-file';
import IconIcRoundPerson from '~icons/ic/round-person';
import { useAiStore } from '@/store/modules/ai';
import { fetchSaveConversation } from '@/service/api';
import ChatMessage from './chat-message.vue';
import ChatInput from './chat-input.vue';
import ChatToolCall from './chat-tool-call.vue';
import ChatConfirmationDrawer from './chat-confirmation-drawer.vue';

const { t } = useI18n();
const aiStore = useAiStore();
const messageListRef = ref<HTMLElement>();
const inputText = ref('');
const isUserAtBottom = ref(true);
const showScrollBtn = ref(false);

// Phase 3.4: tool-call 卡片 + HITL 抽屉
/** 按 toolCallId 配对 started / result + 关联 pendingConfirmation（§12 场景 4/5 内联 bar） */
const toolCallCards = computed(() => {
  const startedEvents = aiStore.streamEvents.filter(
    (e): e is Api.Ai.ToolCallStartedEvent => e.type === 'tool_call_started'
  );
  return startedEvents.map(s => {
    const result = aiStore.streamEvents.find(
      (e): e is Api.Ai.ToolCallResultEvent => e.type === 'tool_call_result' && e.toolCallId === s.toolCallId
    );
    // spec §12 场景 4: HITL pending 时卡片嵌入倒计时 + 取消/确认按钮
    const pending = aiStore.pendingConfirmation;
    const isPending = pending?.toolCallId === s.toolCallId;
    return {
      started: s,
      result: result ?? null,
      isPending,
      pendingExpiresAt: isPending ? pending?.expiresAt : undefined
    };
  });
});

/**
 * HITL 抽屉显示状态。
 *
 * 抽屉可见性独立于 pendingConfirmation：用户可关闭抽屉而不影响 HITL 状态，
 * 通过 tool-card 内联「立即确认 / 取消」按钮或重新打开抽屉来决定。
 * 5min TTL 内无操作后端自动 expired。
 *
 * 之前实现把 setter 绑到 rejectTool()，导致用户点 X / ESC / 外部点击误取消。
 */
const drawerVisible = ref(false);

watch(
  () => aiStore.pendingConfirmation,
  newVal => {
    drawerVisible.value = newVal !== null;
  },
  { immediate: true }
);

const showConfirmDrawer = computed({
  get: () => drawerVisible.value,
  set: (v: boolean) => {
    drawerVisible.value = v;
  }
});

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
  const hasImages = aiStore.attachedImages.length > 0;
  const hasFiles = aiStore.attachedFiles.length > 0;
  // Bug fix: 之前漏了 attachedFiles，用户只上传 csv 不输文本时无法发送
  if (!text && !hasImages && !hasFiles) return;

  // 没有会话时自动创建
  let title: string;
  if (text) {
    title = text.slice(0, 20) + (text.length > 20 ? '...' : '');
  } else if (hasFiles) {
    title = '文件对话';
  } else {
    title = '图片对话';
  }
  if (!hasConversation.value) {
    const { data, error } = await fetchSaveConversation({
      title,
      modelName: aiStore.selectedModelId || undefined
    });
    if (error || !data) return;
    await aiStore.loadConversations();
    await aiStore.selectConversation(data.conversationId);
  }

  inputText.value = '';
  await aiStore.sendMessage(text || '');
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
void quickActions; // template 已改用 sceneCards，保留 quickActions 防 i18n key 漂移

// 场景卡：点击直接预选 agent + 填示例 prompt（spec §16 SR-26 空状态重设）
// icon 用 PascalCase 组件引用（unplugin-icons auto-import），避免 kebab 字符串未注册
const sceneCards = computed(() => [
  {
    icon: IconIcRoundAutoAwesome,
    title: t('page.ai.chat.sceneDataTitle'),
    desc: t('page.ai.chat.sceneDataDesc'),
    agentCode: 'user_mgmt',
    prompt: t('page.ai.chat.sceneDataPrompt')
  },
  {
    icon: IconIcRoundPerson,
    title: t('page.ai.chat.sceneUserTitle'),
    desc: t('page.ai.chat.sceneUserDesc'),
    agentCode: 'user_mgmt',
    prompt: t('page.ai.chat.sceneUserPrompt')
  },
  {
    icon: IconIcRoundInsertDriveFile,
    title: t('page.ai.chat.sceneFileTitle'),
    desc: t('page.ai.chat.sceneFileDesc'),
    agentCode: 'shared',
    prompt: t('page.ai.chat.sceneFilePrompt')
  },
  {
    icon: IconIcRoundAccessTime,
    title: t('page.ai.chat.sceneJobTitle'),
    desc: t('page.ai.chat.sceneJobDesc'),
    agentCode: 'job_mgmt',
    prompt: t('page.ai.chat.sceneJobPrompt')
  }
]);

function handleSceneClick(scene: { agentCode: string; prompt: string }) {
  // 预选 agent（若该 agent 在 availableAgents 中）
  if (aiStore.availableAgents.some(a => a.code === scene.agentCode)) {
    aiStore.selectedAgentCode = scene.agentCode;
  }
  inputText.value = scene.prompt;
}
</script>

<template>
  <div class="chat-main h-full flex flex-col">
    <!-- Empty state: welcome + input -->
    <template v-if="!hasConversation">
      <div class="flex-1 flex flex-col items-center justify-center px-24px overflow-y-auto">
        <div class="welcome-icon">
          <IconIcRoundSmartToy class="text-36px" />
        </div>
        <h2 class="welcome-title">{{ t('page.ai.chat.welcomeTitle') }}</h2>
        <p class="welcome-desc">{{ t('page.ai.chat.welcomeDesc') }}</p>

        <!-- 场景卡：每个卡含图标 + 标题 + 描述 + 推荐 agent + 示例 prompt -->
        <div class="scene-grid">
          <button v-for="scene in sceneCards" :key="scene.title" class="scene-card" @click="handleSceneClick(scene)">
            <div class="scene-card-icon">
              <component :is="scene.icon" />
            </div>
            <div class="scene-card-body">
              <div class="scene-card-title">{{ scene.title }}</div>
              <div class="scene-card-desc">{{ scene.desc }}</div>
            </div>
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
              parts: null,
              tokensInput: null,
              tokensOutput: null,
              createTime: new Date().toISOString()
            }"
            :index="-1"
            :is-last-user-message="false"
            :is-last-assistant-message="false"
          />

          <!-- Phase 3.4: tool-call 卡片列表（与流式文本并列渲染） -->
          <div v-if="toolCallCards.length > 0" class="tool-call-list">
            <ChatToolCall
              v-for="card in toolCallCards"
              :key="card.started.toolCallId"
              :started="card.started"
              :result="card.result"
              :is-pending="card.isPending"
              :pending-expires-at="card.pendingExpiresAt"
              @approve="aiStore.approveTool()"
              @reject="aiStore.rejectTool()"
            />
          </div>

          <!-- Thinking indicator -->
          <div
            v-if="aiStore.isStreaming && !aiStore.streamingText && toolCallCards.length === 0"
            class="msg-row msg-row--assistant"
          >
            <div class="msg-avatar msg-avatar--ai">
              <IconIcRoundSmartToy class="text-18px" />
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

    <!-- Phase 3.4: HITL 确认抽屉 -->
    <ChatConfirmationDrawer v-model:show="showConfirmDrawer" />

    <!-- Scroll to bottom FAB -->
    <Transition name="fab-fade">
      <button v-if="showScrollBtn" class="scroll-bottom-fab" @click="scrollToBottom">
        <IconIcRoundArrowDownward class="text-20px" />
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

/* 场景卡：替代 quick-actions，每个卡含图标 + 标题 + 描述（spec §16 SR-26） */
.scene-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-width: 560px;
  width: 100%;
  margin-top: 8px;
}

.scene-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--n-border-color, #e5e5e5);
  background: var(--n-color, #fff);
  color: var(--n-text-color, #333);
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
  font-family: inherit;
}

.scene-card:hover {
  background: rgba(77, 107, 254, 0.04);
  border-color: #4d6bfe;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(77, 107, 254, 0.08);
}

.scene-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(77, 107, 254, 0.12), rgba(16, 185, 129, 0.1));
  color: #4d6bfe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.scene-card-body {
  flex: 1;
  min-width: 0;
}

.scene-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color, #333);
  margin-bottom: 4px;
}

.scene-card-desc {
  font-size: 12px;
  color: var(--n-text-color-3, #999);
  line-height: 1.5;
}

/* 旧 quick-actions 样式保留以兼容旧引用 */
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

/* tool-call 卡片列表 */
.tool-call-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0 8px;
  max-width: 75%;
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
