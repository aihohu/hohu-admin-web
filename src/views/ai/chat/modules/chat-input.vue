<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAiStore } from '@/store/modules/ai';
import type { AiModelOption } from '@/store/modules/ai';

const { t } = useI18n();
const model = defineModel<string>('modelValue', { required: true });

const props = defineProps<{
  disabled?: boolean;
  isStreaming?: boolean;
}>();

const emit = defineEmits<{
  send: [];
  stop: [];
}>();

const aiStore = useAiStore();
const textareaRef = ref<HTMLTextAreaElement>();
const showModelMenu = ref(false);

const canSend = computed(() => !props.disabled && !props.isStreaming && model.value.trim());

const currentModel = computed(() => {
  return aiStore.availableModels.find(m => m.modelId === aiStore.selectedModelId);
});

// 按 provider 分组
const groupedModels = computed(() => {
  const groups: Record<string, { providerName: string; models: AiModelOption[] }> = {};
  for (const m of aiStore.availableModels) {
    if (!groups[m.providerCode]) {
      groups[m.providerCode] = { providerName: m.providerName, models: [] };
    }
    groups[m.providerCode].models.push(m);
  }
  return Object.values(groups);
});

function selectModel(modelId: string) {
  aiStore.selectedModelId = modelId;
  showModelMenu.value = false;
}

function handleClickOutside() {
  showModelMenu.value = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (props.isStreaming) {
      emit('stop');
    } else if (canSend.value) {
      emit('send');
    }
  }
}

function handleClick() {
  if (props.isStreaming) {
    emit('stop');
  } else if (canSend.value) {
    emit('send');
  }
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}
</script>

<template>
  <div class="input-wrapper" @click="handleClickOutside">
    <div class="input-container">
      <!-- Model selector -->
      <div v-if="currentModel" class="model-bar" @click.stop>
        <button class="model-selector" @click.stop="showModelMenu = !showModelMenu">
          <span class="model-name">{{ currentModel.providerName }}</span>
          <span class="model-tag">{{ currentModel.model }}</span>
          <icon-ic-round-arrow-drop-down class="text-16px" />
        </button>

        <!-- Dropdown grouped by provider -->
        <Transition name="menu-fade">
          <div v-if="showModelMenu" class="model-menu" @click.stop>
            <template v-for="group in groupedModels" :key="group.providerName">
              <div class="model-group-title">{{ group.providerName }}</div>
              <div
                v-for="m in group.models"
                :key="m.modelId"
                class="model-menu-item"
                :class="{ 'model-menu-item--active': m.modelId === aiStore.selectedModelId }"
                @click="selectModel(m.modelId)"
              >
                <span class="model-menu-name">{{ m.model }}</span>
              </div>
            </template>
            <div v-if="aiStore.availableModels.length === 0" class="model-menu-empty">
              {{ t('page.ai.chat.noModel') }}
            </div>
          </div>
        </Transition>
      </div>

      <!-- Input box -->
      <div class="input-box">
        <textarea
          ref="textareaRef"
          v-model="model"
          class="input-textarea"
          :placeholder="t('page.ai.chat.inputPlaceholder')"
          :disabled="disabled && !isStreaming"
          rows="1"
          @keydown="handleKeydown"
          @input="autoResize"
        />
        <!-- Send / Stop button -->
        <button
          class="input-action-btn"
          :class="{
            'input-action-btn--stop': isStreaming,
            'input-action-btn--active': canSend
          }"
          :disabled="!isStreaming && !canSend"
          @click="handleClick"
        >
          <svg v-if="isStreaming" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4l0 16M12 4l6 6M12 4l-6 6"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
    <p class="input-hint">{{ t('page.ai.chat.inputHint') }}</p>
  </div>
</template>

<style scoped>
.input-wrapper {
  padding: 0 16px 10px;
  background: transparent;
}

.input-container {
  max-width: 780px;
  margin: 0 auto;
}

/* Model selector */
.model-bar {
  position: relative;
  margin-bottom: 6px;
  padding: 0 4px;
}

.model-selector {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--n-text-color-2, #666);
}

.model-selector:hover {
  background: rgba(119, 119, 119, 0.1);
}

.model-name {
  font-size: 13px;
  font-weight: 500;
}

.model-tag {
  font-size: 11px;
  color: var(--n-text-color-3, #999);
  background: rgba(119, 119, 119, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.model-menu {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 4px;
  min-width: 240px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--n-popover-color, var(--n-color, #fff));
  border: 1px solid var(--n-border-color, #e0e0e0);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px;
  z-index: 20;
}

.model-group-title {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--n-text-color-3, #999);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
}

.model-menu-item:hover {
  background: rgba(77, 107, 254, 0.08);
}

.model-menu-item--active {
  background: rgba(77, 107, 254, 0.12);
}

.model-menu-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color, #333);
}

.model-menu-model {
  font-size: 11px;
  color: var(--n-text-color-3, #999);
}

.model-menu-empty {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: var(--n-text-color-3, #999);
}

/* Menu transition */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* Input box */
.input-box {
  display: flex;
  align-items: flex-end;
  padding: 10px 10px 10px 18px;
  border-radius: 24px;
  border: 1px solid var(--n-border-color, #e0e0e6);
  background: var(--n-color, #fff);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.input-box:focus-within {
  border-color: #8b9cf7;
  box-shadow: 0 0 0 3px rgba(77, 107, 254, 0.1);
}

.input-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--n-text-color, #333);
  font-size: 15px;
  line-height: 1.5;
  font-family: inherit;
  max-height: 200px;
  overflow-y: auto;
  padding: 2px 0;
}

.input-textarea::placeholder {
  color: var(--n-text-color-3, #bbb);
}

.input-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-action-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #d0d5dd;
  color: #fff;
  transition: all 0.2s;
  margin-left: 8px;
}

.input-action-btn--stop {
  background: #ef4444;
}

.input-action-btn--stop:hover {
  background: #dc2626;
  transform: scale(1.08);
}

.input-action-btn--active {
  background: #4d6bfe;
}

.input-action-btn--active:hover {
  background: #3b5ae0;
  transform: scale(1.05);
}

.input-action-btn:disabled {
  cursor: not-allowed;
  transform: none;
}

.input-hint {
  max-width: 780px;
  margin: 8px auto 0;
  text-align: center;
  font-size: 11px;
  color: var(--n-text-color-3, #aaa);
}

/* Dark mode */
html.dark .input-box {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

html.dark .input-box:focus-within {
  border-color: #8b9cf7;
  box-shadow: 0 0 0 3px rgba(139, 156, 247, 0.15);
}

html.dark .input-textarea {
  color: rgba(255, 255, 255, 0.88);
}

html.dark .input-action-btn {
  background: rgba(255, 255, 255, 0.15);
}

html.dark .model-menu {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
</style>
