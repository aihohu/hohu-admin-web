<script setup lang="ts">
import { NSwitch } from 'naive-ui';

interface Props {
  value?: boolean;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  disabled?: boolean;
}
withDefaults(defineProps<Props>(), { value: false });
const emit = defineEmits<{ 'update:value': [value: boolean] }>();
</script>

<template>
  <NSwitch :value="value" :disabled="disabled" @update:value="(v: boolean) => emit('update:value', v)" />
</template>
