<script setup lang="ts">
import { computed } from 'vue';
import { useAiStore } from '@/store/modules/ai';

const aiStore = useAiStore();

/** §14: 当前 user 的待确认列表（已抽屉打开时不显示，避免抢焦点） */
const showBanner = computed(() => !aiStore.pendingConfirmation && aiStore.pendingConfirmations.length > 0);
const pendingCount = computed(() => aiStore.pendingConfirmations.length);
const firstPending = computed(() => aiStore.pendingConfirmations[0]);

async function handleResume() {
  if (!firstPending.value) return;
  await aiStore.attemptResume(firstPending.value.confirmationId);
}
</script>

<template>
  <div v-if="showBanner" class="pending-banner">
    <div class="flex items-center gap-8px">
      <IconIcRoundWarning class="text-18px text-warning" />
      <span>您有 {{ pendingCount }} 个操作待确认</span>
      <span v-if="firstPending" class="text-xs opacity-70">（{{ firstPending.toolName }}）</span>
    </div>
    <NButton size="small" type="primary" @click="handleResume">查看详情</NButton>
  </div>
</template>

<style scoped>
.pending-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  margin: 8px 16px;
  background: var(--warning-color, #f50);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  animation: pulse-banner 2s ease-in-out infinite;
}

@keyframes pulse-banner {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}
</style>
