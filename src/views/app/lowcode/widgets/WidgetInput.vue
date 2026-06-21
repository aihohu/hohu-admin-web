<script setup lang="ts">
import { NInput } from 'naive-ui';

interface Props {
  value?: string;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  placeholder?: string;
  disabled?: boolean;
}
withDefaults(defineProps<Props>(), { value: '' });
const emit = defineEmits<{ 'update:value': [value: string] }>();
</script>

<template>
  <NInput
    :value="value"
    :placeholder="placeholder || fieldDef?.title || ''"
    :disabled="disabled"
    @update:value="(v: string) => emit('update:value', v)"
  />
</template>
