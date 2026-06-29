<script setup lang="ts">
import { computed, ref } from 'vue';
import { NInput, NSpace, NTag } from 'naive-ui';

interface Props {
  value?: any[] | null;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), { value: null });
const emit = defineEmits<{ 'update:value': [value: any[]] }>();

const items = computed<any[]>(() => (Array.isArray(props.value) ? props.value : []));
const inputValue = ref('');

function commit(next: any[]) {
  emit('update:value', next);
}

function addTag() {
  const v = inputValue.value.trim();
  if (!v) return;
  commit([...items.value, v]);
  inputValue.value = '';
}

function removeTag(index: number) {
  const next = items.value.slice();
  next.splice(index, 1);
  commit(next);
}

function onInputEnter() {
  addTag();
}

function onInputChange(v: string) {
  inputValue.value = v;
}
</script>

<template>
  <NSpace vertical :size="8">
    <NSpace :size="4" align="center" wrap>
      <NTag v-for="(item, idx) in items" :key="`${idx}-${item}`" closable :disabled="disabled" @close="removeTag(idx)">
        {{ item }}
      </NTag>
      <span v-if="items.length === 0" class="text-12px opacity-50">{{ fieldDef?.title || 'tags' }}</span>
    </NSpace>
    <NInput
      :value="inputValue"
      :disabled="disabled"
      :placeholder="uiSchema?.placeholder || '输入后回车添加，或失焦自动添加'"
      size="small"
      @update:value="onInputChange"
      @keyup.enter="onInputEnter"
      @blur="addTag"
    />
  </NSpace>
</template>
