<script setup lang="ts">
import { computed, h, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NDropdown } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { useAiStore } from '@/store/modules/ai';
import { fetchUploadFile } from '@/service/api';

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
const fileInputRef = ref<HTMLInputElement>();

const canSend = computed(
  () =>
    !props.disabled &&
    !props.isStreaming &&
    (model.value.trim() || aiStore.attachedImages.length > 0 || aiStore.attachedFiles.length > 0)
);

// v1.5+ SR-25: chat 直接上传 Excel/CSV（与 parser 对齐）
const ACCEPTED_FILE_EXTS = ['.csv', '.xlsx', '.xls'];
const ACCEPTED_FILE_MIMES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

function isAcceptedFile(file: File): boolean {
  if (file.type.startsWith('image/')) return false; // 图片走 addImage
  if (ACCEPTED_FILE_MIMES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_FILE_EXTS.some(ext => name.endsWith(ext));
}

async function uploadAsAttachment(file: File) {
  const { data, error } = await fetchUploadFile(file, 'ai-chat');
  if (!error && data) {
    aiStore.addFile(data.fileId, data.originalName || file.name, data.mimeType || file.type, file.size);
  } else {
    window.$message?.error(t('page.ai.chat.fileUploadFailed'));
  }
}

const currentModel = computed(() => {
  return aiStore.availableModels.find(m => m.modelId === aiStore.selectedModelId);
});

// 按 provider 分组
const groupedModels = computed(() => {
  const groups: Record<string, { providerName: string; models: Api.Ai.AvailableModel[] }> = {};
  for (const m of aiStore.availableModels) {
    if (!groups[m.providerCode]) {
      groups[m.providerCode] = { providerName: m.providerName, models: [] };
    }
    groups[m.providerCode].models.push(m);
  }
  return Object.values(groups);
});

const currentAgent = computed(() => {
  return aiStore.availableAgents.find(a => a.code === aiStore.selectedAgentCode);
});

// NDropdown options（agent 列表，含 desc——用 render-label 自定义渲染，inline style 防 scoped 失效）
const agentOptions = computed<DropdownOption[]>(() =>
  aiStore.availableAgents.map(a => ({
    key: a.code,
    label: a.name,
    description: a.description
  }))
);

function renderAgentLabel(option: DropdownOption) {
  const desc = (option as { description?: string }).description;
  return h('div', { style: 'display: flex; flex-direction: column; padding: 6px 0; max-width: 280px;' }, [
    h('div', { style: 'font-size: 13px; font-weight: 500; color: var(--n-text-color);' }, String(option.label ?? '')),
    desc
      ? h(
          'div',
          {
            style:
              'font-size: 11px; color: var(--n-text-color-3, #999); margin-top: 2px; line-height: 1.4; white-space: normal;'
          },
          desc
        )
      : null
  ]);
}

// NDropdown options（model 按 provider 分组）
const modelOptions = computed<DropdownOption[]>(() => {
  const result: DropdownOption[] = [];
  for (const group of groupedModels.value) {
    result.push({
      key: `group-${group.providerName}`,
      type: 'group',
      label: group.providerName,
      children: group.models.map(m => ({
        key: m.modelId,
        label: m.model
      }))
    });
  }
  return result;
});

function handleAgentSelect(key: string) {
  aiStore.selectedAgentCode = key;
}

function handleModelSelect(key: string) {
  aiStore.selectedModelId = key;
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

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  for (const file of Array.from(input.files)) {
    if (file.type.startsWith('image/')) {
      const { data, error } = await fetchUploadFile(file, 'ai-chat');
      if (!error && data) {
        aiStore.addImage(data.fileUrl, file.type, file.name);
      } else {
        window.$message?.error(t('page.ai.chat.fileUploadFailed'));
      }
    } else if (isAcceptedFile(file)) {
      await uploadAsAttachment(file);
    } else {
      window.$message?.warning(t('page.ai.chat.fileTypeUnsupported'));
    }
  }
  input.value = '';
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      const { data, error } = await fetchUploadFile(file, 'ai-chat');
      if (!error && data) {
        aiStore.addImage(data.fileUrl, file.type, 'pasted-image');
      }
    } else if (item.kind === 'file') {
      // Bug fix: 之前漏了文件粘贴，粘贴 Excel/CSV 不处理
      const file = item.getAsFile();
      if (!file) continue;
      if (isAcceptedFile(file)) {
        e.preventDefault();
        await uploadAsAttachment(file);
      }
    }
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

async function handleDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  const files = e.dataTransfer?.files;
  if (!files) return;
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      const { data, error } = await fetchUploadFile(file, 'ai-chat');
      if (!error && data) {
        aiStore.addImage(data.fileUrl, file.type, file.name);
      }
    } else if (isAcceptedFile(file)) {
      await uploadAsAttachment(file);
    } else {
      window.$message?.warning(t('page.ai.chat.fileTypeUnsupported'));
    }
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
</script>

<template>
  <div class="input-wrapper" @dragover="handleDragOver" @drop="handleDrop">
    <div class="input-container">
      <!-- Attached images preview -->
      <div v-if="aiStore.attachedImages.length > 0 || aiStore.attachedFiles.length > 0" class="attach-preview">
        <div v-for="(img, i) in aiStore.attachedImages" :key="`img-${i}`" class="attach-thumb">
          <img :src="img.fileUrl" :alt="img.fileName" />
          <button class="attach-remove" :title="t('page.ai.chat.removeFile')" @click="aiStore.removeImage(i)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <div
          v-for="(file, i) in aiStore.attachedFiles"
          :key="`file-${i}`"
          class="attach-file-chip"
          :title="t('page.ai.chat.attachFileHint')"
        >
          <IconIcRoundInsertDriveFile class="text-18px shrink-0" />
          <div class="attach-file-info">
            <div class="attach-file-name">{{ file.fileName }}</div>
            <div class="attach-file-meta">{{ formatFileSize(file.fileSize) }}</div>
          </div>
          <button
            class="attach-remove attach-remove--file"
            :title="t('page.ai.chat.removeFile')"
            @click="aiStore.removeFile(i)"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Input box (focal point) -->
      <div class="input-box">
        <button
          class="input-attach-btn"
          :disabled="disabled || isStreaming"
          :title="t('page.ai.chat.attachFile')"
          @click="triggerFileInput"
        >
          <IconIcRoundAttachFile class="text-18px" />
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.csv,.xlsx,.xls"
          multiple
          class="hidden-input"
          @change="handleFileSelect"
        />
        <textarea
          ref="textareaRef"
          v-model="model"
          class="input-textarea"
          :placeholder="t('page.ai.chat.inputPlaceholder')"
          :disabled="disabled && !isStreaming"
          rows="1"
          @keydown="handleKeydown"
          @input="autoResize"
          @paste="handlePaste"
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

      <!-- Selector bar: agent + model + hint（ChatGPT 风） -->
      <div class="selector-bar">
        <!-- Agent selector (NDropdown 自带 click outside 处理，避免手动 document listener) -->
        <NDropdown
          v-if="aiStore.availableAgents.length > 0"
          trigger="click"
          :options="agentOptions"
          :value="aiStore.selectedAgentCode"
          placement="top-start"
          :render-label="renderAgentLabel"
          @select="handleAgentSelect"
        >
          <button class="selector-btn">
            <IconIcRoundSmartToy class="text-14px opacity-70" />
            <span>{{ currentAgent?.name || 'AI 助手' }}</span>
            <IconIcRoundArrowDropDown class="text-14px opacity-70" />
          </button>
        </NDropdown>

        <!-- Model selector -->
        <NDropdown
          v-if="currentModel"
          trigger="click"
          :options="modelOptions"
          :value="aiStore.selectedModelId"
          placement="top-start"
          @select="handleModelSelect"
        >
          <button class="selector-btn">
            <IconIcRoundMemory class="text-14px opacity-70" />
            <span>{{ currentModel.model }}</span>
            <IconIcRoundArrowDropDown class="text-14px opacity-70" />
          </button>
        </NDropdown>

        <!-- Hint (右对齐) -->
        <span class="selector-hint">{{ t('page.ai.chat.inputHint') }}</span>
      </div>
    </div>
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

/* Selector bar (ChatGPT 风：输入框下方一行水平排列) */
.selector-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0 4px;
  font-size: 13px;
}

.selector-item {
  position: relative;
}

.selector-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--n-text-color-2, #666);
  font-size: 13px;
  white-space: nowrap;
  max-width: 220px;
}

.selector-btn > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selector-btn:hover {
  background: rgba(119, 119, 119, 0.1);
}

.selector-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--n-text-color-3, #aaa);
  opacity: 0.7;
}

.selector-menu {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  min-width: 280px;
  max-width: 360px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--n-popover-color, var(--n-color, #fff));
  border: 1px solid var(--n-border-color, #e0e0e0);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px;
  z-index: 20;
}

/* agent 菜单带描述需要更宽 */
.selector-menu--agent {
  min-width: 320px;
}

.selector-group-title {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--n-text-color-3, #999);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selector-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
}

.selector-menu-item:hover {
  background: rgba(77, 107, 254, 0.08);
}

.selector-menu-item--active {
  background: rgba(77, 107, 254, 0.12);
}

.selector-menu-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color, #333);
}

.selector-menu-desc {
  font-size: 11px;
  color: var(--n-text-color-3, #999);
  margin-top: 2px;
  line-height: 1.4;
}

.selector-menu-empty {
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
  padding: 10px 10px 10px 6px;
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
  display: none; /* 已挪到 .selector-bar .selector-hint */
}

/* Attach button */
.input-attach-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--n-text-color-3, #999);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-attach-btn:hover {
  color: var(--n-text-color, #333);
  background: rgba(119, 119, 119, 0.08);
}

.input-attach-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hidden-input {
  display: none;
}

/* Attached images preview */
.attach-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 18px 8px;
}

.attach-thumb {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--n-border-color, #e0e0e0);
}

.attach-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attach-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

/* File attachment chip (Excel/CSV, spec §16 SR-25) */
.attach-file-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(77, 107, 254, 0.08);
  border: 1px solid rgba(77, 107, 254, 0.2);
  color: var(--n-text-color, #333);
  max-width: 280px;
}

.attach-file-info {
  flex: 1;
  min-width: 0;
}

.attach-file-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attach-file-meta {
  font-size: 11px;
  color: var(--n-text-color-3, #999);
}

.attach-remove--file {
  position: static;
  width: 16px;
  height: 16px;
  background: transparent;
  color: var(--n-text-color-3, #999);
  flex-shrink: 0;
}

.attach-remove--file:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--n-text-color, #333);
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

html.dark .selector-menu {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
</style>

<!-- 全局 CSS：NDropdown Teleport 到 body 后 scoped style 失效，必须用全局覆盖 option 高度 -->
<style>
.n-dropdown-menu .n-dropdown-option {
  height: auto !important;
  min-height: 0 !important;
}

.n-dropdown-menu .n-dropdown-option-body {
  height: auto !important;
  min-height: 0 !important;
}
</style>
