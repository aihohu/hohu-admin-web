<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: Api.Ai.UIResult;
}>();

const jsonStr = computed(() => {
  try {
    return JSON.stringify(props.data.viewData, null, 2);
  } catch {
    return String(props.data.viewData);
  }
});
</script>

<template>
  <pre class="tool-pre">{{ jsonStr }}</pre>
</template>

<style scoped>
.tool-pre {
  background: #1f2937;
  color: #f3f4f6;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
  overflow-x: auto;
  margin: 0;
}
</style>
