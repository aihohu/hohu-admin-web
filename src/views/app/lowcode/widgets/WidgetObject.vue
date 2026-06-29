<script setup lang="ts">
import { ref, watch } from 'vue';
import { NInput } from 'naive-ui';

interface Props {
  value?: Record<string, any> | null;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), { value: null });
const emit = defineEmits<{ 'update:value': [value: Record<string, any>] }>();

// Maintain a text buffer: parse on blur, surface invalid JSON as a warning
// via the input's status, but never overwrite the buffer while typing.
const text = ref('');
const parseError = ref('');
const placeholder = '{\n  "key": "value"\n}';

function serialize(v: any): string {
  if (v == null) return '';
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v ?? '');
  }
}

watch(
  () => props.value,
  v => {
    text.value = serialize(v);
    parseError.value = '';
  },
  { immediate: true }
);

function onCommit() {
  const raw = text.value.trim();
  if (!raw) {
    parseError.value = '';
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      parseError.value = '必须是 JSON 对象（{}）';
      return;
    }
    parseError.value = '';
    emit('update:value', parsed);
  } catch (e: any) {
    parseError.value = `JSON 解析失败：${e.message}`;
  }
}
</script>

<template>
  <NInput
    v-model:value="text"
    type="textarea"
    :disabled="disabled"
    :rows="4"
    :placeholder="uiSchema?.placeholder || placeholder"
    :status="parseError ? 'error' : undefined"
    @blur="onCommit"
  />
  <div v-if="parseError" class="mt-4px text-12px" style="color: var(--error-color)">
    {{ parseError }}
  </div>
</template>
