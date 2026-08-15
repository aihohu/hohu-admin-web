<script setup lang="ts">
import { onActivated, onMounted } from 'vue';
import { useAiStore } from '@/store/modules/ai';
import ChatSidebar from './modules/chat-sidebar.vue';
import ChatMain from './modules/chat-main.vue';

const aiStore = useAiStore();
let hasActivated = false;

onMounted(() => {
  void aiStore.init();
});

onActivated(() => {
  if (hasActivated) void aiStore.init();
  hasActivated = true;
});
</script>

<template>
  <div class="h-full flex overflow-hidden">
    <ChatSidebar class="w-260px flex-shrink-0" />
    <ChatMain class="flex-1 overflow-hidden" />
  </div>
</template>
