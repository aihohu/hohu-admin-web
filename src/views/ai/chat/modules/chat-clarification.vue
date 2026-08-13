<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAiStore } from '@/store/modules/ai';
import { localizeClarificationMessage } from './dynamic-message-i18n';

/**
 * 触发条件：supervisor LLM 判定用户输入意图模糊（多 Agent 候选）或日配额已用尽.
 * 后端 emit `clarification_required` SSE 事件（无状态：无 confirmationId，无 Redis）.
 *
 * 用户行为：
 *   - 点击候选卡片 → 写入 selectedAgentCode 并清空 pendingClarification
 *   - 点击关闭按钮 → 仅清空 pendingClarification（不改 agentCode，让用户手输或换 Agent）
 */
const { t, te } = useI18n();
const aiStore = useAiStore();
const displayMessage = computed(() => {
  const clarification = aiStore.pendingClarification;
  if (!clarification) return '';
  return localizeClarificationMessage(
    clarification,
    (key, params) => (params ? t(key, params) : t(key)),
    key => te(key)
  );
});
</script>

<template>
  <Transition name="clarification-fade">
    <div v-if="aiStore.pendingClarification" class="clarification-card">
      <div class="clarification-header">
        <IconIcRoundQuestionAnswer class="text-18px clarification-icon" />
        <div class="clarification-message">{{ displayMessage }}</div>
        <button class="clarification-close" :title="t('common.close')" @click="aiStore.dismissClarification()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="clarification-candidates">
        <button
          v-for="c in aiStore.pendingClarification.candidates"
          :key="c.code"
          class="candidate-card"
          @click="aiStore.pickClarificationAgent(c.code)"
        >
          <div class="candidate-icon">
            <IconIcRoundSmartToy class="text-18px" />
          </div>
          <div class="candidate-body">
            <div class="candidate-name">{{ c.name }}</div>
            <div v-if="c.description" class="candidate-desc">{{ c.description }}</div>
          </div>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.clarification-card {
  margin: 8px 16px;
  max-width: 75%;
  border-radius: 12px;
  border: 1px solid rgba(77, 107, 254, 0.25);
  background: rgba(77, 107, 254, 0.06);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.clarification-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clarification-icon {
  color: #4d6bfe;
  flex-shrink: 0;
}

.clarification-message {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color, #333);
}

.clarification-close {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--n-text-color-3, #999);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.clarification-close:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--n-text-color, #333);
}

.clarification-candidates {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.candidate-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--n-border-color, #e0e0e0);
  background: var(--n-color, #fff);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  font-family: inherit;
}

.candidate-card:hover {
  border-color: #4d6bfe;
  background: rgba(77, 107, 254, 0.04);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(77, 107, 254, 0.08);
}

.candidate-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(77, 107, 254, 0.12), rgba(16, 185, 129, 0.08));
  color: #4d6bfe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.candidate-body {
  flex: 1;
  min-width: 0;
}

.candidate-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--n-text-color, #333);
  margin-bottom: 2px;
}

.candidate-desc {
  font-size: 11px;
  color: var(--n-text-color-3, #999);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.clarification-fade-enter-active,
.clarification-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.clarification-fade-enter-from,
.clarification-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

html.dark .clarification-card {
  border-color: rgba(77, 107, 254, 0.4);
  background: rgba(77, 107, 254, 0.1);
}

html.dark .candidate-card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

html.dark .candidate-card:hover {
  background: rgba(77, 107, 254, 0.1);
}
</style>
