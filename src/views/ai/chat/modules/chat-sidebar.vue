<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDialog } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useAiStore } from '@/store/modules/ai';

const { t } = useI18n();
const aiStore = useAiStore();
const dialog = useDialog();
const searchKeyword = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchKeyword, val => {
  if (searchTimer) clearTimeout(searchTimer);
  const keyword = val.trim() || null;
  searchTimer = setTimeout(() => {
    aiStore.loadConversations(keyword);
  }, 300);
});

function handleCreate() {
  aiStore.clearCurrentConversation();
}

async function handleSelect(id: string) {
  await aiStore.selectConversation(id);
}

function handleDelete(id: string) {
  dialog.warning({
    title: t('page.ai.chat.deleteTitle'),
    content: t('page.ai.chat.deleteContent'),
    positiveText: t('common.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      await aiStore.removeConversation(id);
    }
  });
}

function handleScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (!aiStore.hasMoreConversations || aiStore.loading) return;
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (distanceFromBottom < 50) {
    aiStore.loadMoreConversations();
  }
}
</script>

<template>
  <div class="chat-sidebar h-full flex flex-col">
    <!-- New chat button -->
    <div class="px-12px pt-12px pb-8px">
      <NButton type="primary" block @click="handleCreate">
        <template #icon>
          <IconIcRoundPlus class="text-16px" />
        </template>
        {{ t('page.ai.chat.newChat') }}
      </NButton>
    </div>

    <!-- Search -->
    <div class="px-12px pb-8px">
      <NInput
        v-model:value="searchKeyword"
        :placeholder="t('page.ai.chat.searchPlaceholder')"
        clearable
        size="small"
        round
      >
        <template #prefix>
          <IconIcRoundSearch class="text-14px" />
        </template>
      </NInput>
    </div>

    <!-- Conversation list -->
    <NScrollbar class="flex-1 px-8px" @scroll="handleScroll">
      <div class="flex flex-col gap-4px">
        <div
          v-for="conv in aiStore.conversations"
          :key="conv.conversationId"
          class="conv-item"
          :class="{ 'conv-item--active': aiStore.currentConversationId === conv.conversationId }"
          @click="handleSelect(conv.conversationId)"
        >
          <IconIcRoundChatBubbleOutline class="flex-shrink-0 text-16px" />
          <span class="conv-title">{{ conv.title || t('page.ai.chat.newChat') }}</span>
          <NButton
            quaternary
            circle
            size="tiny"
            class="conv-delete opacity-0"
            @click.stop="handleDelete(conv.conversationId)"
          >
            <template #icon>
              <IconIcRoundDeleteOutline class="text-14px" />
            </template>
          </NButton>
        </div>
        <NEmpty
          v-if="aiStore.conversations.length === 0"
          :description="t('page.ai.chat.noConversation')"
          class="py-24px"
        />
        <div v-if="aiStore.loading" class="flex justify-center py-12px">
          <NSpin size="small" />
        </div>
      </div>
    </NScrollbar>
  </div>
</template>

<style scoped>
.chat-sidebar {
  border-right: 1px solid var(--n-border-color, #e0e0e0);
  background: transparent;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.15s;
}

.conv-item:hover {
  background: var(--n-color-hover, rgba(0, 0, 0, 0.04));
}

.conv-item:hover .conv-delete {
  opacity: 1;
}

.conv-item--active {
  background: var(--n-color-hover, rgba(0, 0, 0, 0.06));
}

.conv-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-delete {
  transition: opacity 0.15s;
}
</style>
