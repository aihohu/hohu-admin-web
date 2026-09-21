<script setup lang="ts">
import { onActivated, onDeactivated, onMounted, ref } from 'vue';
import { useEventListener, useMediaQuery } from '@vueuse/core';
import { $t } from '@/locales';
import { useAiStore } from '@/store/modules/ai';
import ChatSidebar from './modules/chat-sidebar.vue';
import ChatMain from './modules/chat-main.vue';

const aiStore = useAiStore();
const compact = useMediaQuery('(max-width: 1100px)');
const historyVisible = ref(false);
let hasActivated = false;
let active = true;
let checkingAccess = false;
useEventListener(window, 'focus', async () => {
  if (!active || checkingAccess) return;
  checkingAccess = true;
  try {
    await aiStore.revalidateAccess();
  } finally {
    checkingAccess = false;
  }
});
onDeactivated(() => {
  active = false;
});

onMounted(() => {
  void aiStore.init();
});

onActivated(() => {
  active = true;
  if (hasActivated) void aiStore.init();
  hasActivated = true;
});
</script>

<template>
  <div class="h-full min-w-0 flex flex-col overflow-hidden">
    <div v-if="compact" class="flex gap-8px p-8px">
      <NButton size="small" @click="historyVisible = true">{{ $t('page.ai.chat.conversationHistory') }}</NButton>
      <NButton size="small" @click="aiStore.clearCurrentConversation()">{{ $t('page.ai.chat.newChat') }}</NButton>
    </div>
    <div class="min-h-0 flex flex-1 overflow-hidden">
      <ChatSidebar v-if="!compact" class="w-260px flex-shrink-0" />
      <ChatMain class="min-w-0 flex-1 overflow-hidden" />
    </div>
    <NDrawer v-if="compact" v-model:show="historyVisible" :width="300" placement="left">
      <NDrawerContent :title="$t('page.ai.chat.conversationHistory')" closable>
        <ChatSidebar class="h-full" />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
