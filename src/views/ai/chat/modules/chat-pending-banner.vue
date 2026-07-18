<script setup lang="ts">
import { computed } from 'vue';
import { useAiStore } from '@/store/modules/ai';

const aiStore = useAiStore();

/** §14: 当前 user 的待确认列表（已抽屉打开时不显示，避免抢焦点） */
const showBanner = computed(() => !aiStore.pendingConfirmation && aiStore.pendingConfirmations.length > 0);
const pendingCount = computed(() => aiStore.pendingConfirmations.length);
const firstPending = computed(() => aiStore.pendingConfirmations[0]);

/** 点击恢复：调 attemptResume，410/404 时 store 自动静默移除（提示用户重新发起） */
async function handleResume() {
  if (!firstPending.value) return;
  await aiStore.attemptResume(firstPending.value.confirmationId);
}
</script>

<template>
  <div v-if="showBanner" class="px-16px pt-8px">
    <NAlert type="warning" :show-icon="true" class="pending-banner-alert">
      <div class="flex items-center justify-between gap-12px">
        <div class="flex items-center gap-6px">
          <span>您有 {{ pendingCount }} 个待确认操作</span>
          <span v-if="firstPending" class="opacity-70 text-12px">（{{ firstPending.toolName }}）</span>
        </div>
        <NButton size="small" type="warning" @click="handleResume">恢复操作</NButton>
      </div>
    </NAlert>
  </div>
</template>

<style scoped>
.pending-banner-alert {
  border-radius: 6px;
}
</style>
