<script setup lang="ts">
import { computed } from 'vue';
import { NDatePicker } from 'naive-ui';

interface Props {
  value?: number | null;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), { value: null });
const emit = defineEmits<{ 'update:value': [value: number | null] }>();

const type = computed<'date' | 'datetime'>(() => {
  const format = props.fieldDef?.format;
  if (format === 'date') return 'date';
  return 'datetime';
});
</script>

<template>
  <NDatePicker
    :value="value"
    :type="type"
    :disabled="disabled"
    :placeholder="fieldDef?.title || '选择日期'"
    @update:value="(v: number | null) => emit('update:value', v)"
  />
</template>
