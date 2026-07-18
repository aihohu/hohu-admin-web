<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAiStore } from '@/store/modules/ai';

const aiStore = useAiStore();

/** §14: 当前 user 的 待确认列表（已抽屉打开时不显示，避免抢焦点） */
const showBanner = computed(() => !aiStore.pendingConfirmation && aiStore.pendingConfirmations.length > 0);
const pendingCount = computed(() => aiStore.pendingConfirmations.length);
const firstPending = computed(() => aiStore.pendingConfirmations[0]);

/** 防双击：resume 在途时 disable 按钮（fetch SSE 流可能要等到 hang 完成，期间再点会触发 409 owner 锁冲突） */
const resuming = ref(false);

/** 点击恢复：调 attemptResume，410/404 时 store 自动静默移除（提示用户重新发起） */
async function handleResume() {
  if (!firstPending.value || resuming.value) return;
  resuming.value = true;
  try {
    await aiStore.attemptResume(firstPending.value.confirmationId);
  } finally {
    resuming.value = false;
  }
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
        <NButton size="small" type="warning" :loading="resuming" :disabled="resuming" @click="handleResume">
          恢复操作
        </NButton>
      </div>
    </NAlert>
  </div>
</template>

<style scoped>
.pending-banner-alert {
  border-radius: 6px;
}
</style>
