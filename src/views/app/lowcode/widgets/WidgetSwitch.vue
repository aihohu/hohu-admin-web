<script setup lang="ts">
import { NSwitch } from 'naive-ui';

interface Props {
  value?: boolean;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  disabled?: boolean;
}
withDefaults(defineProps<Props>(), {
  value: false,
  fieldDef: () => ({}),
  uiSchema: () => ({})
});
const emit = defineEmits<{ 'update:value': [value: boolean] }>();
</script>

<template>
  <NSwitch
    :value="value"
    :disabled="disabled"
    :aria-label="uiSchema?.label || fieldDef?.title"
    @update:value="(v: boolean) => emit('update:value', v)"
  />
</template>
