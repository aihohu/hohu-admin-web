<script setup lang="ts">
import { NInputNumber } from 'naive-ui';

interface Props {
  value?: number | null;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  disabled?: boolean;
}
withDefaults(defineProps<Props>(), { value: null });
const emit = defineEmits<{ 'update:value': [value: number | null] }>();
</script>

<template>
  <NInputNumber
    :value="value"
    :disabled="disabled"
    :placeholder="fieldDef?.title || ''"
    @update:value="(v: number | null) => emit('update:value', v)"
  />
</template>
