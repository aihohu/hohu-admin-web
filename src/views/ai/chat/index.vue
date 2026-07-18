<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useAiStore } from '@/store/modules/ai';
import ChatSidebar from './modules/chat-sidebar.vue';
import ChatMain from './modules/chat-main.vue';

const aiStore = useAiStore();

onMounted(() => {
  aiStore.init();
  // §14 跨会话 HITL 恢复：进入页面拉一次 + 30s 心跳
  aiStore.loadPendingConfirmations();
  aiStore.startPendingHeartbeat();
});

onUnmounted(() => {
  aiStore.stopPendingHeartbeat();
});
</script>

<template>
  <div class="h-full flex overflow-hidden">
    <ChatSidebar class="w-260px flex-shrink-0" />
    <ChatMain class="flex-1 overflow-hidden" />
  </div>
</template>
