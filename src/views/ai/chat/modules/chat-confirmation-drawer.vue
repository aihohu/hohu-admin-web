<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton, NDrawer, NDrawerContent, NStatistic, NTag } from 'naive-ui';
import { useAiStore } from '@/store/modules/ai';

const { t } = useI18n();
const aiStore = useAiStore();

const props = defineProps<{
  /** 外部 v-model:show 控制 */
  show: boolean;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
}>();

const confirmation = computed(() => aiStore.pendingConfirmation);

// 续传重连标记（spec §2.2 v1.5+）
const isReconnected = computed(
  () => confirmation.value?.type === 'confirmation_resumed' && Boolean(confirmation.value.resumedAt)
);
const reconnectedAt = computed(() => {
  if (confirmation.value?.type !== 'confirmation_resumed') return '';
  const ra = confirmation.value.resumedAt;
  if (!ra) return '';
  try {
    const d = new Date(ra);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
});

// 倒计时（基于 expires_at）
const remainingSec = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

function updateCountdown() {
  if (!confirmation.value) {
    remainingSec.value = 0;
    return;
  }
  const expiresAt = new Date(confirmation.value.expiresAt).getTime();
  const now = Date.now();
  remainingSec.value = Math.max(0, Math.floor((expiresAt - now) / 1000));
}

watch(
  () => confirmation.value?.confirmationId,
  () => {
    updateCountdown();
  }
);

watch(
  () => props.show,
  (newShow: boolean) => {
    if (newShow && confirmation.value) {
      updateCountdown();
      countdownTimer = setInterval(updateCountdown, 1000);
    } else if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }
);

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

const argsJson = computed(() => {
  if (!confirmation.value) return '';
  try {
    return JSON.stringify(confirmation.value.args, null, 2);
  } catch {
    return String(confirmation.value.args);
  }
});

function handleApprove() {
  emit('update:show', false);
  aiStore.approveTool();
}

function handleReject() {
  emit('update:show', false);
  aiStore.rejectTool();
}

const showDrawer = computed({
  get: () => props.show,
  set: (v: boolean) => emit('update:show', v)
});
</script>

<template>
  <NDrawer v-model:show="showDrawer" :width="480" placement="right">
    <NDrawerContent :title="t('page.ai.chat.confirmTitle')" closable>
      <div v-if="confirmation" class="confirm-content">
        <!-- Tool 信息 -->
        <div class="confirm-section">
          <div class="confirm-label">{{ t('page.ai.chat.confirmTool') }}</div>
          <NTag type="warning" size="large">{{ confirmation.tool }}</NTag>
          <!-- 续传重连标记（spec §2.2 v1.5+） -->
          <div v-if="isReconnected" class="confirm-reconnect-badge">
            <NTag type="info" size="small" :bordered="false">
              <IconIcRoundRefresh class="text-12px" />
              {{ t('page.ai.chat.resumedAt', { time: reconnectedAt }) }}
            </NTag>
          </div>
        </div>

        <!-- 摘要 -->
        <div class="confirm-section">
          <div class="confirm-label">{{ t('page.ai.chat.confirmSummary') }}</div>
          <div class="confirm-summary">{{ confirmation.summary }}</div>
        </div>

        <!-- 影响范围（dry_run） -->
        <div v-if="confirmation.dryRun" class="confirm-section">
          <div class="confirm-label">{{ t('page.ai.chat.confirmImpact') }}</div>
          <div class="confirm-impact">
            <NStatistic :label="t('page.ai.chat.confirmAffected')" :value="confirmation.dryRun.affectedCount" />
            <div v-if="confirmation.dryRun.summary" class="confirm-impact-summary">
              {{ confirmation.dryRun.summary }}
            </div>
            <div
              v-if="confirmation.dryRun.affectedExamples && confirmation.dryRun.affectedExamples.length > 0"
              class="confirm-examples"
            >
              <div v-for="(ex, i) in confirmation.dryRun.affectedExamples" :key="i">{{ ex }}</div>
            </div>
          </div>
        </div>

        <!-- 参数详情 -->
        <div class="confirm-section">
          <div class="confirm-label">{{ t('page.ai.chat.confirmArgs') }}</div>
          <pre class="confirm-args">{{ argsJson }}</pre>
        </div>

        <!-- 倒计时 -->
        <div class="confirm-section confirm-countdown">
          <IconIcRoundAccessTime class="text-16px" />
          <span>{{ remainingSec }}{{ t('page.ai.chat.confirmSecondsLeft') }}</span>
        </div>
      </div>

      <template #footer>
        <div class="confirm-footer">
          <NButton @click="handleReject">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleApprove">{{ t('common.confirm') }}</NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.confirm-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.confirm-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.confirm-reconnect-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.confirm-label {
  font-size: 12px;
  color: var(--n-text-color-3, #999);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.confirm-summary {
  padding: 10px 14px;
  background: var(--n-color-embedded-modal, #f4f4f5);
  border-radius: 8px;
  font-size: 13px;
  color: var(--n-text-color, #333);
  font-family: 'Menlo', 'Consolas', monospace;
}

.confirm-impact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--n-color-embedded-modal, #f4f4f5);
  border-radius: 8px;
}

.confirm-impact-summary {
  font-size: 13px;
  color: var(--n-text-color, #333);
}

.confirm-examples {
  font-size: 12px;
  color: var(--n-text-color-3, #999);
  display: flex;
  flex-direction: column;
}

.confirm-args {
  margin: 0;
  padding: 12px;
  background: #1a1b26;
  color: #a9b1d6;
  border-radius: 8px;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 240px;
  overflow-y: auto;
}

.confirm-countdown {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(255, 193, 7, 0.1);
  border-radius: 6px;
  font-size: 13px;
  color: #ff9800;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

html.dark .confirm-summary,
html.dark .confirm-impact {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.88);
}

html.dark .confirm-impact-summary {
  color: rgba(255, 255, 255, 0.88);
}

html.dark .confirm-examples {
  color: rgba(255, 255, 255, 0.45);
}
</style>
