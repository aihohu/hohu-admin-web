<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

const { t } = useI18n();
const props = defineProps<{
  message: Api.Ai.Message;
  index: number;
  isLastUserMessage: boolean;
  isLastAssistantMessage: boolean;
}>();

const emit = defineEmits<{
  edit: [index: number, newContent: string];
  regenerate: [];
}>();

const isEditing = ref(false);
const editContent = ref('');

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs-pre"><div class="hljs-header"><span class="hljs-lang">${lang}</span><button class="hljs-copy">${t('page.ai.chat.copy')}</button></div><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch {
        // fallback
      }
    }
    return `<pre class="hljs-pre"><div class="hljs-header"><span class="hljs-lang">text</span><button class="hljs-copy">${t('page.ai.chat.copy')}</button></div><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

const renderedContent = computed(() => {
  if (props.message.role === 'user') return '';
  return md.render(props.message.content || '');
});

function startEdit() {
  editContent.value = props.message.content;
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  editContent.value = '';
}

function submitEdit() {
  const text = editContent.value.trim();
  if (!text) return;
  isEditing.value = false;
  emit('edit', props.index, text);
}

function handleEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitEdit();
  }
  if (e.key === 'Escape') {
    cancelEdit();
  }
}

function copyMessageContent() {
  navigator.clipboard.writeText(props.message.content || '');
  window.$message?.success(t('page.ai.chat.copied'));
}

function handleMarkdownClick(e: Event) {
  const target = (e.target as HTMLElement).closest('.hljs-copy');
  if (!target) return;
  const pre = target.closest('pre');
  const code = pre?.querySelector('code');
  if (code) {
    navigator.clipboard.writeText(code.textContent || '');
    window.$message?.success(t('page.ai.chat.copied'));
  }
}

function previewImage(url: string) {
  window.open(url, '_blank');
}
</script>

<template>
  <div class="msg-row" :class="message.role === 'user' ? 'msg-row--user' : 'msg-row--assistant'">
    <!-- Avatar -->
    <div class="msg-avatar" :class="message.role === 'user' ? 'msg-avatar--user' : 'msg-avatar--ai'">
      <icon-ic-round-person v-if="message.role === 'user'" class="text-18px" />
      <icon-ic-round-smart-toy v-else class="text-18px" />
    </div>

    <!-- Content area -->
    <div class="msg-content">
      <!-- User message -->
      <template v-if="message.role === 'user'">
        <!-- Edit mode -->
        <template v-if="isEditing">
          <div class="msg-edit-card">
            <div class="msg-edit-body">
              <NInput
                v-model:value="editContent"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 8 }"
                :bordered="false"
                :placeholder="t('page.ai.chat.editPlaceholder')"
                class="msg-edit-input"
                @keydown="handleEditKeydown"
              />
            </div>
            <div class="msg-edit-footer">
              <span class="msg-edit-tip">{{ t('page.ai.chat.editTip') }}</span>
              <div class="msg-edit-btns">
                <button class="edit-btn edit-btn--cancel" @click="cancelEdit">{{ t('common.cancel') }}</button>
                <button class="edit-btn edit-btn--submit" :disabled="!editContent.trim()" @click="submitEdit">
                  <icon-ic-round-arrow-upward class="text-14px" />
                  {{ t('common.confirm') }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Display mode -->
        <template v-else>
          <div class="msg-bubble msg-bubble--user">
            <template v-if="message.parts && message.parts.length > 0">
              <template v-for="(part, pi) in message.parts" :key="pi">
                <img
                  v-if="part.type === 'file' && part.mediaType?.startsWith('image/')"
                  :src="part.url"
                  class="msg-image"
                  @click="previewImage(part.url)"
                />
                <div v-else-if="part.type === 'text'" class="whitespace-pre-wrap">{{ part.text }}</div>
              </template>
            </template>
            <div v-else class="whitespace-pre-wrap">{{ message.content }}</div>
          </div>
          <!-- Actions: hover show -->
          <div class="msg-actions">
            <NTooltip v-if="isLastUserMessage" trigger="hover">
              <template #trigger>
                <button class="msg-action-btn" @click="startEdit">
                  <icon-ic-round-edit class="text-14px" />
                </button>
              </template>
              {{ t('common.edit') }}
            </NTooltip>
            <NTooltip trigger="hover">
              <template #trigger>
                <button class="msg-action-btn" @click="copyMessageContent">
                  <icon-ic-round-content-copy class="text-14px" />
                </button>
              </template>
              {{ t('page.ai.chat.copy') }}
            </NTooltip>
          </div>
        </template>
      </template>

      <!-- Assistant message -->
      <template v-else>
        <div class="msg-bubble msg-bubble--ai">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="markdown-body" @click="handleMarkdownClick" v-html="renderedContent" />
        </div>
        <div class="msg-actions">
          <NTooltip v-if="isLastAssistantMessage" trigger="hover">
            <template #trigger>
              <button class="msg-action-btn" @click="emit('regenerate')">
                <icon-ic-round-refresh class="text-14px" />
              </button>
            </template>
            {{ t('page.ai.chat.regenerate') }}
          </NTooltip>
          <NTooltip trigger="hover">
            <template #trigger>
              <button class="msg-action-btn" @click="copyMessageContent">
                <icon-ic-round-content-copy class="text-14px" />
              </button>
            </template>
            {{ t('page.ai.chat.copy') }}
          </NTooltip>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  margin-bottom: 8px;
}

.msg-row--user {
  flex-direction: row-reverse;
}

.msg-row--assistant {
  flex-direction: row;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
}

.msg-avatar--user {
  background: #4d6bfe;
}

.msg-avatar--ai {
  background: #10b981;
}

.msg-content {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-row--user .msg-content {
  align-items: flex-end;
}

.msg-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.msg-bubble--user {
  background: #4d6bfe;
  color: #fff;
  border-top-right-radius: 4px;
}

.msg-image {
  max-width: 260px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  display: block;
}

.msg-image:last-child {
  margin-bottom: 0;
}

.msg-bubble--ai {
  background: var(--n-color-embedded-modal, var(--n-color-embedded, #f4f4f5));
  color: var(--n-text-color-1, var(--n-text-color, #333));
  border-top-left-radius: 4px;
}

/* Edit card */
.msg-edit-card {
  width: 100%;
  max-width: 600px;
  border-radius: 12px;
  border: 1px solid #4d6bfe;
  background: var(--n-color, #fff);
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(77, 107, 254, 0.12);
}

.msg-edit-body {
  padding: 4px 0 0;
}

.msg-edit-input :deep(.n-input-wrapper) {
  padding: 8px 14px;
}

.msg-edit-input :deep(.n-input__textarea-el) {
  font-size: 14px;
  line-height: 1.6;
}

.msg-edit-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px solid rgba(77, 107, 254, 0.1);
  background: rgba(77, 107, 254, 0.03);
}

.msg-edit-tip {
  font-size: 11px;
  color: var(--n-text-color-3, #999);
}

.msg-edit-btns {
  display: flex;
  gap: 6px;
}

.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.edit-btn--cancel {
  background: transparent;
  color: var(--n-text-color-2, #666);
}

.edit-btn--cancel:hover {
  background: rgba(0, 0, 0, 0.05);
}

.edit-btn--submit {
  background: #4d6bfe;
  color: #fff;
}

.edit-btn--submit:hover {
  background: #3b5ae0;
}

.edit-btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Action buttons */
.msg-actions {
  display: flex;
  gap: 2px;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.msg-row:hover .msg-actions {
  opacity: 1;
}

.msg-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--n-text-color-3, #999);
  cursor: pointer;
  transition: all 0.15s;
}

.msg-action-btn:hover {
  background: rgba(119, 119, 119, 0.1);
  color: var(--n-text-color, #333);
}

/* Markdown content styles */
.markdown-body :deep(p) {
  margin: 0 0 8px 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 4px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 2px 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 12px 0 6px 0;
  font-weight: 600;
}

.markdown-body :deep(h1) {
  font-size: 1.3em;
}
.markdown-body :deep(h2) {
  font-size: 1.15em;
}
.markdown-body :deep(h3) {
  font-size: 1.05em;
}

.markdown-body :deep(blockquote) {
  margin: 8px 0;
  padding: 4px 12px;
  border-left: 3px solid #4d6bfe;
  background: rgba(77, 107, 254, 0.06);
  border-radius: 4px;
}

.markdown-body :deep(code:not(.hljs)) {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'Menlo', 'Consolas', monospace;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 6px 12px;
}

.markdown-body :deep(th) {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 600;
}

/* Code block styles */
.markdown-body :deep(.hljs-pre) {
  margin: 8px 0;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1b26;
}

.markdown-body :deep(.hljs-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.markdown-body :deep(.hljs-lang) {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.markdown-body :deep(.hljs-copy) {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.markdown-body :deep(.hljs-copy:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.markdown-body :deep(.hljs code) {
  display: block;
  padding: 12px 16px;
  overflow-x: auto;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

/* Dark theme */
html.dark .msg-bubble--ai {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.88);
}

html.dark .markdown-body :deep(a) {
  color: #6d9eff;
}

html.dark .markdown-body :deep(code:not(.hljs)) {
  background: rgba(255, 255, 255, 0.12);
}

html.dark .markdown-body :deep(blockquote) {
  background: rgba(77, 107, 254, 0.12);
  border-left-color: #6d9eff;
}

html.dark .markdown-body :deep(table) {
  border-color: rgba(255, 255, 255, 0.12);
}

html.dark .markdown-body :deep(th),
html.dark .markdown-body :deep(td) {
  border-color: rgba(255, 255, 255, 0.12);
}

html.dark .markdown-body :deep(th) {
  background: rgba(255, 255, 255, 0.06);
}

html.dark .msg-edit-card {
  border-color: rgba(77, 107, 254, 0.4);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.06);
}

html.dark .msg-edit-input :deep(.n-input-wrapper) {
  background: transparent;
}

html.dark .msg-edit-input :deep(.n-input__textarea-el) {
  color: rgba(255, 255, 255, 0.88);
}

html.dark .msg-edit-footer {
  border-top-color: rgba(77, 107, 254, 0.15);
  background: rgba(77, 107, 254, 0.06);
}

html.dark .edit-btn--cancel {
  color: rgba(255, 255, 255, 0.65);
}

html.dark .edit-btn--cancel:hover {
  background: rgba(255, 255, 255, 0.06);
}

html.dark .msg-edit-tip {
  color: rgba(255, 255, 255, 0.4);
}

html.dark .msg-action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
