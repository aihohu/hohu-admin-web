<script setup lang="ts">
import { computed } from 'vue';
import { NSelect } from 'naive-ui';

interface Props {
  value?: string | null;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), { value: null });
const emit = defineEmits<{ 'update:value': [value: string | null] }>();

const options = computed(() => {
  const enumValues = props.fieldDef?.enum || [];
  const enumLabels = props.fieldDef?.enum_labels || {};
  return enumValues.map((v: string) => ({
    label: typeof enumLabels === 'object' ? enumLabels[v] || v : v,
    value: v
  }));
});
</script>

<template>
  <NSelect
    :value="value"
    :options="options"
    :disabled="disabled"
    :placeholder="fieldDef?.title || '请选择'"
    @update:value="(v: string | null) => emit('update:value', v)"
  />
</template>
